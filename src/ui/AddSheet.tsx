import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MEALS, type Meal, type MyDish, type Product } from '../db/db'
import {
  candidateFromRef,
  foodCandidate,
  myDishCandidate,
  presetCandidate,
  productCandidate,
  recentRefs,
  type Candidate,
} from '../db/logic'
import { searchFoods } from '../data/foods'
import { getPresetDishes } from '../data/dishes'
import { expandQuery, matches, normalize, score } from '../domain/search'
import { formatValue } from '../domain/nutrients'
import { KindBadge, Sheet } from './components'
import { useNav } from './nav'

type Tab = 'search' | 'recent' | 'dishes'

// 読み込み中に毎回新しい [] を作ると useEffect が無限に走るので固定の空配列を使う
const NONE_P: Product[] = []
const NONE_D: MyDish[] = []

export function AddSheet({ date, meal }: { date: string; meal: Meal }) {
  const nav = useNav()
  const [tab, setTab] = useState<Tab>(meal === 'dinner' ? 'dishes' : 'recent')
  const [q, setQ] = useState('')
  const products = useLiveQuery(() => db.products.toArray(), []) ?? NONE_P
  const myDishes = useLiveQuery(() => db.myDishes.toArray(), []) ?? NONE_D
  const recent = useLiveQuery(() => recentRefs(40), [])
  const [recentCands, setRecentCands] = useState<Candidate[]>([])

  useEffect(() => {
    if (!recent) return
    let alive = true
    Promise.all(recent.map((r) => candidateFromRef(r.kind, r.refId))).then((cs) => {
      if (alive) setRecentCands(cs.filter((c): c is Candidate => !!c))
    })
    return () => {
      alive = false
    }
  }, [recent])

  const results = useMemo<Candidate[]>(() => {
    const terms = expandQuery(q)
    if (terms.length === 0) return []
    const own: { c: Candidate; s: number }[] = []
    for (const d of myDishes) {
      const nn = normalize(d.name)
      if (matches(nn, terms)) own.push({ c: myDishCandidate(d), s: score(nn, terms) - 1000 })
    }
    for (const p of products) {
      const nn = normalize(p.name + (p.barcode ?? ''))
      if (matches(nn, terms)) own.push({ c: productCandidate(p), s: score(nn, terms) - 1000 })
    }
    for (const d of getPresetDishes()) {
      if (matches(d.norm, terms)) own.push({ c: presetCandidate(d.id)!, s: score(d.norm, terms) - 500 })
    }
    own.sort((a, b) => a.s - b.s)
    const foods = searchFoods(q, 60).map((f) => foodCandidate(f.code)!)
    return [...own.map((x) => x.c), ...foods]
  }, [q, products, myDishes])

  const pick = (c: Candidate) => nav.push({ type: 'amount', candidate: c, date, meal })

  async function onBarcode(code: string) {
    const p = await db.products.where('barcode').equals(code).first()
    if (p) {
      nav.replace({ type: 'amount', candidate: productCandidate(p), date, meal })
    } else {
      nav.toast(`未登録のバーコードです（${code}）。商品を登録してください`)
      nav.replace({ type: 'product', barcode: code, afterSave: { date, meal } })
    }
  }

  const mealLabel = MEALS.find((m) => m.key === meal)?.label

  return (
    <Sheet title={`${mealLabel}に追加`}>
      <div className="add-actions">
        <button className="btn" onClick={() => nav.push({ type: 'scan', onCode: onBarcode })}>
          ▥ バーコード
        </button>
        <button className="btn" onClick={() => nav.push({ type: 'product', afterSave: { date, meal } })}>
          ＋ 市販品を登録
        </button>
        <button className="btn" onClick={() => nav.push({ type: 'myDish', afterSave: { date, meal } })}>
          ＋ マイ料理
        </button>
      </div>

      <input
        className="search"
        type="search"
        autoComplete="off"
        placeholder="食品・料理・商品名で検索（例: ごはん、肉じゃが）"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setTab('search')
        }}
        autoFocus
      />

      <div className="tabs">
        <button className={tab === 'search' ? 'on' : ''} onClick={() => setTab('search')}>
          検索
        </button>
        <button className={tab === 'recent' ? 'on' : ''} onClick={() => setTab('recent')}>
          最近
        </button>
        <button className={tab === 'dishes' ? 'on' : ''} onClick={() => setTab('dishes')}>
          料理
        </button>
      </div>

      {tab === 'search' && (
        <CandidateList items={results} onPick={pick} empty={q ? '見つかりませんでした。言い方を変えるか、市販品として登録してください。' : '検索語を入力してください'} />
      )}
      {tab === 'recent' && <CandidateList items={recentCands} onPick={pick} empty="まだ記録がありません" />}
      {tab === 'dishes' && (
        <>
          {myDishes.length > 0 && <h4 className="list-title">マイ料理</h4>}
          <CandidateList items={myDishes.map(myDishCandidate)} onPick={pick} empty="" />
          <h4 className="list-title">標準の料理（目安）</h4>
          <CandidateList items={getPresetDishes().map((d) => presetCandidate(d.id)!)} onPick={pick} empty="" />
        </>
      )}
    </Sheet>
  )
}

function CandidateList({ items, onPick, empty }: { items: Candidate[]; onPick: (c: Candidate) => void; empty: string }) {
  if (items.length === 0) return empty ? <p className="muted empty">{empty}</p> : null
  return (
    <ul className="cands">
      {items.map((c) => {
        const u = c.units[0]
        const n = c.per[u]
        const amt = c.defaultAmount[u]
        const kcal = n?.energy != null ? n.energy * amt : null
        const unitLabel = u === 'g' ? `${amt}g` : u === 'serving' ? '1人前' : `1${c.unitName}`
        return (
          <li key={`${c.kind}:${c.refId}`}>
            <button className="cand" onClick={() => onPick(c)}>
              <KindBadge kind={c.kind} />
              <span className="cand-name">{c.name}</span>
              <span className="cand-kcal">
                {unitLabel} {formatValue('energy', kcal)}kcal
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
