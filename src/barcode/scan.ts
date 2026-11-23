// バーコード（JAN/EAN）読み取り。Android Chrome は標準の BarcodeDetector、
// 使えない環境（PCの多くのブラウザ）は ZXing で読む。

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

async function nativeDetector(): Promise<DetectorLike | null> {
  const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): DetectorLike; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
  if (!BD) return null
  try {
    const supported = await BD.getSupportedFormats()
    const formats = FORMATS.filter((f) => supported.includes(f))
    if (formats.length === 0) return null
    return new BD({ formats })
  } catch {
    return null
  }
}

export function isValidJan(code: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(code)) return false
  const digits = code.padStart(13, '0').split('').map(Number)
  const check = digits.pop()!
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === check
}

export interface ScanSession {
  stop(): void
}

/** カメラ映像からバーコードを連続で探す。見つかったら onResult を一度だけ呼ぶ */
export async function startScan(video: HTMLVideoElement, onResult: (code: string) => void): Promise<ScanSession> {
  const native = await nativeDetector()
  let stopped = false
  let done = false
  const finish = (code: string) => {
    if (done || !isValidJan(code)) return
    done = true
    onResult(code)
  }

  if (native) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false,
    })
    video.srcObject = stream
    await video.play()
    const loop = async () => {
      if (stopped || done) return
      try {
        const r = await native.detect(video)
        if (r[0]) finish(r[0].rawValue)
      } catch {
        /* フレームが用意できていない等は無視 */
      }
      setTimeout(loop, 150)
    }
    loop()
    return {
      stop() {
        stopped = true
        stream.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      },
    }
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    video,
    (result) => {
      if (result) finish(result.getText())
    },
  )
  return {
    stop() {
      stopped = true
      controls.stop()
    },
  }
}

/** 写真（画像ファイル）からバーコードを読む */
export async function scanImageFile(file: Blob): Promise<string | null> {
  const native = await nativeDetector()
  if (native) {
    const bmp = await createImageBitmap(file)
    try {
      const r = await native.detect(bmp)
      const code = r.map((x) => x.rawValue).find(isValidJan)
      if (code) return code
    } finally {
      bmp.close()
    }
  }
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const url = URL.createObjectURL(file)
  try {
    const r = await new BrowserMultiFormatReader().decodeFromImageUrl(url)
    const code = r.getText()
    return isValidJan(code) ? code : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
