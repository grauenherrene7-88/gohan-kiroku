import { useLiveQuery } from 'dexie-react-hooks'
import { db, MEALS, type LogEntry } from '../db/db'
import { addDays, candidateFromRef, formatDateJa, todayStr } from '../db/logic'
import { sumNutrients } from '../domain/nutrition'
import { formatValue } from '../domain/nutrients'
import { NutrientSummary } from './components'
import { useTargets } from './hooks'
import { useNav } from './nav'

export function TodayPage({ date, setDate, goSettings }: { date: string; setDate: (d: string) => void; goSettings: () => void }) {
  const nav = useNav()
  const logs = useLiveQuery(() => db.logs.where('date').equals(date).sortBy('createdAt'), [date]) ?? []
  const targets = useTargets()
  const totals = sumNutrients(logs.map((l) => l.nutrients))
  const isToday = date === todayStr()

  async function openEntry(l: LogEntry) {
    const c = await candidateFromRef(l.kind, l.refId)
    if (!c) {
      if (confirm(`「${l.name}」の元データが削除されています。この記録を削除しますか？`)) await db.logs.delete(l.id!)
      return
    }
    nav.push({ type: 'amount', candidate: c, date: l.date, meal: l.meal, logId: l.id, initialAmount: l.amount, initialUnit: l.unit })
  }

  return (
    <div className="page">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="前の日">
          ‹
        </button>
        <label className="date-label">
          {isToday ? '今日 ' : ''}
          {formatDateJa(date)}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="日付を選ぶ" />
        </label>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="次の日">
          ›
        </button>
      </div>

      <div className="card energy-card">
        <div className="energy-big">
          <b>{formatValue('energy', totals.total.energy)}</b>
          <span> / {targets?.energy?.goal ? `${targets.energy.goal} kcal` : '— kcal'}</span>
        </div>
        {!targets && (
          <p className="hint">
            <button className="link" onClick={goSettings}>
              設定でプロフィールを入力
            </button>
            すると、目標値と比べて表示できます。
          </p>
        )}
      </div>

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m.key)
        const kcal = items.reduce((s, l) => s + (l.nutrients.energy ?? 0), 0)
        return (
          <section key={m.key} className="card meal">
            <div className="meal-head">
              <h3>{m.label}</h3>
              <span className="muted">{items.length ? `${Math.round(kcal)} kcal` : ''}</span>
              <button className="btn small" onClick={() => nav.push({ type: 'add', date, meal: m.key })}>
                ＋ 追加
              </button>
            </div>
            {items.length > 0 && (
              <ul className="entries">
                {items.map((l) => (
                  <li key={l.id}>
                    <button className="entry" onClick={() => openEntry(l)}>
                      <span className="entry-name">{l.name}</span>
                      <span className="entry-amt">{l.amountLabel}</span>
                      <span className="entry-kcal">{formatValue('energy', l.nutrients.energy)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <h3 className="section-title">この日の合計</h3>
      <NutrientSummary totals={totals} targets={targets} />
    </div>
  )
}
