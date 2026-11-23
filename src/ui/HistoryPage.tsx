import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, type LogEntry } from '../db/db'
import { addDays, todayStr } from '../db/logic'
import { NUTRIENTS, NUTRIENT_BY_KEY, formatValue, type NutrientKey } from '../domain/nutrients'
import { sumNutrients } from '../domain/nutrition'
import { judge } from '../domain/targets'
import { useTargets } from './hooks'

const NONE: LogEntry[] = []

function cssVar(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function HistoryPage({ openDay }: { openDay: (d: string) => void }) {
  const [days, setDays] = useState(7)
  const [key, setKey] = useState<NutrientKey>('energy')
  const end = todayStr()
  const start = addDays(end, -(days - 1))
  const logs = useLiveQuery(() => db.logs.where('date').between(start, end, true, true).toArray(), [start, end]) ?? NONE
  const targets = useTargets()

  const byDay = useMemo(() => {
    const out: { date: string; label: string; totals: ReturnType<typeof sumNutrients> }[] = []
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i)
      const dayLogs = logs.filter((l) => l.date === d)
      const [, m, dd] = d.split('-').map(Number)
      out.push({ date: d, label: `${m}/${dd}`, totals: sumNutrients(dayLogs.map((l) => l.nutrients)) })
    }
    return out
  }, [logs, days, start])

  const recorded = byDay.filter((d) => d.totals.count > 0)
  const def = NUTRIENT_BY_KEY[key]
  const t = targets?.[key]
  const chartData = byDay.map((d) => ({ label: d.label, date: d.date, value: d.totals.count ? Number(d.totals.total[key].toFixed(2)) : null }))
  const accent = cssVar('--accent', '#2f7d6d')
  const grid = cssVar('--line', '#ddd')
  const textC = cssVar('--muted', '#777')

  return (
    <div className="page">
      <div className="seg">
        {[7, 14, 30].map((n) => (
          <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>
            {n}日
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">グラフの栄養素</span>
        <select value={key} onChange={(e) => setKey(e.target.value as NutrientKey)}>
          {NUTRIENTS.map((n) => (
            <option key={n.key} value={n.key}>
              {n.label}
            </option>
          ))}
        </select>
      </label>

      <div className="card chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: textC }} interval={days > 14 ? 4 : 0} />
            <YAxis tick={{ fontSize: 11, fill: textC }} />
            <Tooltip formatter={(v) => [`${formatValue(key, Number(v))} ${def.unit}`, def.label]} />
            {t?.goal !== undefined && <ReferenceLine y={t.goal} stroke={textC} strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: textC, position: 'insideTopRight' }} />}
            {t?.min !== undefined && <ReferenceLine y={t.min} stroke={textC} strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: textC, position: 'insideTopRight' }} />}
            {t?.max !== undefined && <ReferenceLine y={t.max} stroke="#c0392b" strokeDasharray="4 4" label={{ value: '上限', fontSize: 10, fill: '#c0392b', position: 'insideTopRight' }} />}
            <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} onClick={(d) => openDay((d as unknown as { date: string }).date)} />
          </BarChart>
        </ResponsiveContainer>
        <p className="hint">棒をタップするとその日の記録を開きます。</p>
      </div>

      <h3 className="section-title">記録した日の平均（{recorded.length}日分）</h3>
      {recorded.length === 0 ? (
        <p className="muted empty">この期間の記録はありません。</p>
      ) : (
        <table className="ntable avg">
          <thead>
            <tr>
              <th>栄養素</th>
              <th>1日平均</th>
              <th>目標比</th>
            </tr>
          </thead>
          <tbody>
            {NUTRIENTS.map((n) => {
              const avg = recorded.reduce((s, d) => s + d.totals.total[n.key], 0) / recorded.length
              const unknown = recorded.some((d) => d.totals.unknown[n.key] > 0)
              const tt = targets?.[n.key]
              const { status } = judge(avg, tt)
              const ref = tt?.goal ?? tt?.min ?? tt?.max
              return (
                <tr key={n.key} className={`st-${status}`}>
                  <th>{n.label}</th>
                  <td>
                    {formatValue(n.key, avg)}
                    <small> {n.unit}</small>
                    {unknown && <span className="warn">※</span>}
                  </td>
                  <td>{ref ? `${Math.round((avg / ref) * 100)}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="hint">※ 値が不明な品を含む日があります（実際はもっと多い可能性）。</p>
    </div>
  )
}
