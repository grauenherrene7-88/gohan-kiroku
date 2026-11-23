import { useEffect, useRef, useState } from 'react'
import { isValidJan, scanImageFile, startScan, type ScanSession } from '../barcode/scan'
import { Sheet } from './components'
import { useNav } from './nav'

export function ScanSheet({ onCode }: { onCode: (code: string) => void }) {
  const nav = useNav()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const doneRef = useRef(false)

  const finish = (code: string) => {
    if (doneRef.current) return
    doneRef.current = true
    navigator.vibrate?.(80)
    onCode(code)
  }

  useEffect(() => {
    let session: ScanSession | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('このブラウザではカメラが使えません（https または localhost で開く必要があります）。写真か手入力で読み取ってください。')
      return
    }
    startScan(videoRef.current!, finish)
      .then((s) => {
        if (cancelled) s.stop()
        else session = s
      })
      .catch((e) => {
        console.error(e)
        setError('カメラを起動できませんでした。カメラの使用を許可するか、写真・手入力を使ってください。')
      })
    return () => {
      cancelled = true
      session?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onFile(file: File | undefined) {
    if (!file) return
    const c = await scanImageFile(file)
    if (c) finish(c)
    else nav.toast('バーコードが見つかりませんでした。もう少し近づけて撮ってください')
  }

  return (
    <Sheet title="バーコードを読み取る">
      <div className="scanner">
        <video ref={videoRef} muted playsInline />
        <div className="scan-guide" />
      </div>
      {error ? <p className="warn">{error}</p> : <p className="hint">商品のバーコードを枠に合わせてください。</p>}
      <div className="row">
        <button className="btn" onClick={() => fileRef.current?.click()}>
          写真から読む
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="field">
        <span className="field-label">数字で入力</span>
        <div className="row">
          <input value={manual} inputMode="numeric" placeholder="4901234567894" onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} />
          <button
            className="btn"
            disabled={!manual}
            onClick={() => (isValidJan(manual) ? finish(manual) : nav.toast('バーコードの数字が正しくないようです'))}
          >
            決定
          </button>
        </div>
      </div>
    </Sheet>
  )
}
