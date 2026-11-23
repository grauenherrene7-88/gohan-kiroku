import { useRef, useState } from 'react'
import { db, type Meal, type Product } from '../db/db'
import { productCandidate } from '../db/logic'
import { LABEL_KEYS, NUTRIENTS, emptyNutrients, type NutrientKey, type Nutrients } from '../domain/nutrients'
import { parseLabel } from '../ocr/parseLabel'
import { scanImageFile } from '../barcode/scan'
import { NumInput, Sheet } from './components'
import { useNav } from './nav'

export function ProductEditor({ product, barcode, afterSave }: { product?: Product; barcode?: string; afterSave?: { date: string; meal: Meal } }) {
  const nav = useNav()
  const [name, setName] = useState(product?.name ?? '')
  const [code, setCode] = useState(product?.barcode ?? barcode ?? '')
  const [basis, setBasis] = useState<Product['labelBasis']>(product?.labelBasis ?? 'unit')
  const [unitName, setUnitName] = useState(product?.unitName ?? '袋')
  const [unitGrams, setUnitGrams] = useState<number | null>(product?.unitGrams ?? null)
  const [n, setN] = useState<Nutrients>(product?.nutrients ?? emptyNutrients())
  const [memo, setMemo] = useState(product?.memo ?? '')
  const [source, setSource] = useState<Product['source']>(product?.source ?? 'manual')
  const [showMore, setShowMore] = useState(() => NUTRIENTS.some((d) => !LABEL_KEYS.includes(d.key) && product?.nutrients[d.key] != null))
  const [ocr, setOcr] = useState<{ busy: boolean; status: string; progress: number; text?: string; filled?: NutrientKey[]; error?: string }>({
    busy: false,
    status: '',
    progress: 0,
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const barcodeFileRef = useRef<HTMLInputElement>(null)

  const setVal = (k: NutrientKey, v: number | null) => setN((prev) => ({ ...prev, [k]: v }))

  async function onLabelPhoto(file: File | undefined) {
    if (!file) return
    setOcr({ busy: true, status: '準備中', progress: 0 })
    try {
      const { recognizeLabel } = await import('../ocr/ocr')
      const text = await recognizeLabel(file, (status, progress) => setOcr((o) => ({ ...o, status, progress })))
      const r = parseLabel(text)
      const filled = Object.keys(r.values) as NutrientKey[]
      setN((prev) => {
        const next = { ...prev }
        for (const k of filled) next[k] = Math.round(r.values[k]! * 1000) / 1000
        return next
      })
      if (r.basis) setBasis(r.basis)
      if (r.unitName) setUnitName(r.unitName)
      if (r.unitGrams) setUnitGrams(r.unitGrams)
      if (filled.some((k) => !LABEL_KEYS.includes(k))) setShowMore(true)
      setSource('ocr')
      setOcr({ busy: false, status: '', progress: 1, text: r.text, filled })
    } catch (e) {
      console.error(e)
      setOcr({ busy: false, status: '', progress: 0, error: '読み取りに失敗しました。初回はネット接続が必要です。手入力もできます。' })
    }
  }

  async function onBarcodePhoto(file: File | undefined) {
    if (!file) return
    const c = await scanImageFile(file)
    if (c) setCode(c)
    else nav.toast('バーコードが見つかりませんでした')
  }

  const missing = LABEL_KEYS.filter((k) => n[k] === null)
  const canSave = name.trim() !== '' && n.energy !== null && (basis === 'unit' || basis === '100g')

  async function save() {
    if (!canSave) return
    if (missing.length && !confirm(`${missing.map((k) => NUTRIENTS.find((d) => d.key === k)!.label).join('・')} が空欄です。不明として保存しますか？`)) return
    const trimmed = code.trim()
    if (trimmed) {
      const dup = await db.products.where('barcode').equals(trimmed).first()
      if (dup && dup.id !== product?.id && !confirm(`同じバーコードの「${dup.name}」が登録済みです。それでも保存しますか？`)) return
    }
    const now = Date.now()
    const data: Product = {
      ...(product ?? { createdAt: now }),
      name: name.trim(),
      barcode: trimmed || undefined,
      labelBasis: basis,
      unitName: unitName.trim() || '個',
      unitGrams,
      nutrients: n,
      source,
      memo: memo.trim() || undefined,
      updatedAt: now,
    }
    const id = product?.id ?? (await db.products.add(data))
    if (product?.id) await db.products.put({ ...data, id: product.id })
    nav.toast('保存しました')
    if (afterSave) {
      const saved = (await db.products.get(id))!
      nav.replace({ type: 'amount', candidate: productCandidate(saved), date: afterSave.date, meal: afterSave.meal })
    } else nav.pop()
  }

  async function remove() {
    if (!product?.id || !confirm(`「${product.name}」を削除しますか？（これまでの記録は残ります）`)) return
    await db.products.delete(product.id)
    nav.toast('削除しました')
    nav.pop()
  }

  const isFilled = (k: NutrientKey) => ocr.filled?.includes(k)

  return (
    <Sheet
      title={product ? '市販品を編集' : '市販品を登録'}
      footer={
        <>
          {product && (
            <button className="btn danger" onClick={remove}>
              削除
            </button>
          )}
          <button className="btn primary grow" disabled={!canSave} onClick={save}>
            保存{afterSave ? 'して記録へ' : ''}
          </button>
        </>
      }
    >
      <div className="card ocr-card">
        <button className="btn primary wide" disabled={ocr.busy} onClick={() => fileRef.current?.click()}>
          📷 成分表示を撮影して読み取る
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onLabelPhoto(e.target.files?.[0])} />
        {ocr.busy && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.round(ocr.progress * 100)}%` }} />
            <span>{ocr.status}…</span>
          </div>
        )}
        {ocr.error && <p className="warn">{ocr.error}</p>}
        {ocr.filled && (
          <p className="ok-note">
            {ocr.filled.length > 0
              ? `${ocr.filled.length}項目を読み取りました。黄色の欄を写真と見比べて、違っていたら直してください。`
              : '数値を読み取れませんでした。明るい場所で、成分表示だけを大きく撮り直してください。'}
          </p>
        )}
        {ocr.text && (
          <details>
            <summary>読み取った文字を見る</summary>
            <pre className="ocr-text">{ocr.text}</pre>
          </details>
        )}
      </div>

      <label className="field">
        <span className="field-label">商品名 *</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ○○のおにぎり 鮭" />
      </label>

      <div className="field">
        <span className="field-label">バーコード（JAN）</span>
        <div className="row">
          <input value={code} inputMode="numeric" onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="任意" />
          <button className="btn small" onClick={() => nav.push({ type: 'scan', onCode: (c) => { setCode(c); nav.pop() } })}>
            読取
          </button>
          <button className="btn small" onClick={() => barcodeFileRef.current?.click()}>
            写真
          </button>
          <input ref={barcodeFileRef} type="file" accept="image/*" hidden onChange={(e) => onBarcodePhoto(e.target.files?.[0])} />
        </div>
      </div>

      <div className="field">
        <span className="field-label">成分表示は何あたり？</span>
        <div className="seg">
          <button className={basis === 'unit' ? 'on' : ''} onClick={() => setBasis('unit')}>
            1{unitName || '個'}あたり
          </button>
          <button className={basis === '100g' ? 'on' : ''} onClick={() => setBasis('100g')}>
            100gあたり
          </button>
        </div>
      </div>

      <div className="row2">
        <label className="field">
          <span className="field-label">数え方</span>
          <input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="袋・個・本…" />
        </label>
        <label className="field">
          <span className="field-label">1{unitName || '個'}の重さ(g)</span>
          <NumInput value={unitGrams} onChange={setUnitGrams} placeholder={basis === '100g' ? '内容量（必須に近い）' : '任意'} />
        </label>
      </div>
      {basis === '100g' && !unitGrams && <p className="hint">重さを入れると「1{unitName || '個'}」単位で記録できます。</p>}

      <h4 className="list-title">栄養成分（{basis === 'unit' ? `1${unitName || '個'}` : '100g'}あたり）</h4>
      <div className="ngrid">
        {NUTRIENTS.filter((d) => LABEL_KEYS.includes(d.key) || showMore).map((d) => (
          <label key={d.key} className={`nfield ${isFilled(d.key) ? 'filled' : ''}`}>
            <span>
              {d.label}
              {LABEL_KEYS.includes(d.key) ? ' *' : ''}
            </span>
            <span className="nfield-in">
              <NumInput
                value={n[d.key]}
                onChange={(v) => setVal(d.key, v)}
                placeholder={LABEL_KEYS.includes(d.key) ? '' : '表示なし'}
                ariaLabel={`${d.label}（${d.unit}）`}
              />
              <small>{d.unit}</small>
            </span>
          </label>
        ))}
      </div>
      {!showMore && (
        <button className="link" onClick={() => setShowMore(true)}>
          ＋ ビタミン・ミネラルなど（表示があれば）
        </button>
      )}
      <p className="hint">表示がない項目は空欄のままでOK。「不明」として扱い、合計では「値が不明な品あり」と表示します。</p>

      <label className="field">
        <span className="field-label">メモ</span>
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="店名など（任意）" />
      </label>
    </Sheet>
  )
}
