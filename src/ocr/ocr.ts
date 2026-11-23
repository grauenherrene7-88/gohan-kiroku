// 端末内OCR（tesseract.js）。初回だけ日本語の学習データ(数MB)をネットから取得し、
// 以降はブラウザ内にキャッシュされる。画像はどこにも送信しない。
import type { Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null

export type OcrProgress = (status: string, progress: number) => void

const STATUS_JA: Record<string, string> = {
  'loading tesseract core': 'OCRエンジンを読み込み中',
  'initializing tesseract': 'OCRエンジンを準備中',
  'loading language traineddata': '日本語データを読み込み中（初回のみ数MB）',
  'initializing api': '準備中',
  'recognizing text': '文字を読み取り中',
}

let onProgress: OcrProgress | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker(['jpn', 'eng'], 1, {
        logger: (m: { status: string; progress: number }) => onProgress?.(STATUS_JA[m.status] ?? m.status, m.progress),
      })
    })()
    workerPromise.catch(() => (workerPromise = null))
  }
  return workerPromise
}

/** 画像を読み取りやすく前処理（縮小/拡大・グレースケール・コントラスト強調） */
export async function preprocess(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const targetW = Math.min(2000, Math.max(1200, bmp.width))
  const scale = targetW / bmp.width
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  // グレースケール化してヒストグラムの両端1%でコントラストを引き伸ばす
  const hist = new Uint32Array(256)
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    d[i] = y
    hist[y]++
  }
  const total = d.length / 4
  let lo = 0
  let hi = 255
  let acc = hist[0]
  while (lo < 255 && acc < total * 0.01) acc += hist[++lo]
  acc = hist[255]
  while (hi > 0 && acc < total * 0.01) acc += hist[--hi]
  const range = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export async function recognizeLabel(file: Blob, progress?: OcrProgress): Promise<string> {
  onProgress = progress ?? null
  try {
    progress?.('画像を準備中', 0)
    const canvas = await preprocess(file)
    const worker = await getWorker()
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    onProgress = null
  }
}
