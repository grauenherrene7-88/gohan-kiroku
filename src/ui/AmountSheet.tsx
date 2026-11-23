import { useState } from 'react'
import { db, MEALS, type Meal } from '../db/db'
import { addLog, amountLabel, nutrientsFor, type AmountUnit, type Candidate } from '../db/logic'
import { NumInput, NutrientList, NutrientMini, Sheet } from './components'
import { useNav } from './nav'

const QUICK: Record<AmountUnit, number[]> = {
  g: [50, 100, 150, 200, 250],
  unit: [0.5, 1, 1.5, 2, 3],
  serving: [0.5, 1, 1.5, 2],
}

export function AmountSheet({
  candidate: c,
  date,
  meal: initialMeal,
  logId,
  initialAmount,
  initialUnit,
}: {
  candidate: Candidate
  date: string
  meal: Meal
  logId?: number
  initialAmount?: number
  initialUnit?: string
}) {
  const nav = useNav()
  const startUnit = (c.units.includes(initialUnit as AmountUnit) ? initialUnit : c.units[0]) as AmountUnit
  const [unit, setUnit] = useState<AmountUnit>(startUnit)
  const [amount, setAmount] = useState<number | null>(initialAmount ?? c.defaultAmount[startUnit])
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [showAll, setShowAll] = useState(false)
  const n = amount ? nutrientsFor(c, amount, unit) : null

  async function save() {
    if (!amount || amount <= 0 || !n) return
    if (logId) {
      await db.logs.update(logId, { meal, amount, unit, amountLabel: amountLabel(c, amount, unit), nutrients: n })
      nav.toast('記録を更新しました')
    } else {
      await addLog(date, meal, c, amount, unit)
      nav.toast(`${c.name} を記録しました`)
    }
    nav.closeAll()
  }

  async function remove() {
    if (!logId || !confirm('この記録を削除しますか？')) return
    await db.logs.delete(logId)
    nav.toast('削除しました')
    nav.closeAll()
  }

  const unitText = (u: AmountUnit) => (u === 'g' ? 'グラム' : u === 'serving' ? '人前' : c.unitName)

  return (
    <Sheet
      title={logId ? '記録を編集' : '量を入力'}
      footer={
        <>
          {logId && (
            <button className="btn danger" onClick={remove}>
              削除
            </button>
          )}
          <button className="btn primary grow" disabled={!amount || amount <= 0 || !n} onClick={save}>
            {logId ? '更新する' : '記録する'}
          </button>
        </>
      }
    >
      <h3 className="item-title">{c.name}</h3>
      {c.sub && <p className="muted">{c.sub}</p>}

      <div className="field">
        <span className="field-label">食事</span>
        <div className="seg">
          {MEALS.map((m) => (
            <button key={m.key} className={meal === m.key ? 'on' : ''} onClick={() => setMeal(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {c.units.length > 1 && (
        <div className="field">
          <span className="field-label">単位</span>
          <div className="seg">
            {c.units.map((u) => (
              <button
                key={u}
                className={unit === u ? 'on' : ''}
                onClick={() => {
                  setUnit(u)
                  setAmount(c.defaultAmount[u])
                }}
              >
                {unitText(u)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">量</span>
        <div className="amount-row">
          <NumInput className="amount-input" value={amount} onChange={setAmount} ariaLabel="量" />
          <span>{unitText(unit) === 'グラム' ? 'g' : unitText(unit)}</span>
        </div>
        <div className="quick">
          {QUICK[unit].map((v) => (
            <button key={v} className={amount === v ? 'on' : ''} onClick={() => setAmount(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {n && (
        <div className="card">
          <NutrientMini n={n} />
          <button className="link" onClick={() => setShowAll((s) => !s)}>
            {showAll ? '閉じる' : 'すべての栄養素を見る'}
          </button>
          {showAll && <NutrientList n={n} />}
        </div>
      )}
      {c.kind === 'preset' && <p className="hint">標準的なレシピから計算した目安です。家の味付けや量で変わります。</p>}
    </Sheet>
  )
}
