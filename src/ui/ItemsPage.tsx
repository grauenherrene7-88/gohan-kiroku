import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { myDishCandidate, productCandidate } from '../db/logic'
import { formatValue } from '../domain/nutrients'
import { normalize } from '../domain/search'
import { useNav } from './nav'

export function ItemsPage() {
  const nav = useNav()
  const [tab, setTab] = useState<'products' | 'dishes'>('products')
  const [q, setQ] = useState('')
  const products = useLiveQuery(() => db.products.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const dishes = useLiveQuery(() => db.myDishes.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const nq = normalize(q)

  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>
          市販品（{products.length}）
        </button>
        <button className={tab === 'dishes' ? 'on' : ''} onClick={() => setTab('dishes')}>
          マイ料理（{dishes.length}）
        </button>
      </div>
      <input className="search" type="search"
        autoComplete="off" placeholder="絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />

      {tab === 'products' && (
        <>
          <button className="btn primary wide" onClick={() => nav.push({ type: 'product' })}>
            ＋ 市販品を登録
          </button>
          {products.length === 0 && <p className="muted empty">まだ登録がありません。成分表示を撮影するか手入力で登録できます。</p>}
          <ul className="cands">
            {products
              .filter((p) => !nq || normalize(p.name + (p.barcode ?? '')).includes(nq))
              .map((p) => {
                const c = productCandidate(p)
                const u = c.units[0]
                return (
                  <li key={p.id}>
                    <button className="cand" onClick={() => nav.push({ type: 'product', product: p })}>
                      <span className="cand-name">
                        {p.name}
                        {p.barcode && <small className="muted"> ▥{p.barcode}</small>}
                      </span>
                      <span className="cand-kcal">
                        {u === 'unit' ? `1${p.unitName}` : '100g'} {formatValue('energy', (c.per[u]?.energy ?? 0) * c.defaultAmount[u])}kcal
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </>
      )}

      {tab === 'dishes' && (
        <>
          <button className="btn primary wide" onClick={() => nav.push({ type: 'myDish' })}>
            ＋ マイ料理を作る
          </button>
          {dishes.length === 0 && <p className="muted empty">親がよく作る料理を材料から登録しておくと便利です。</p>}
          <ul className="cands">
            {dishes
              .filter((d) => !nq || normalize(d.name).includes(nq))
              .map((d) => (
                <li key={d.id}>
                  <button className="cand" onClick={() => nav.push({ type: 'myDish', dish: d })}>
                    <span className="cand-name">{d.name}</span>
                    <span className="cand-kcal">1人前 {formatValue('energy', myDishCandidate(d).per.serving?.energy)}kcal</span>
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  )
}
