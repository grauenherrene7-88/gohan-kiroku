import { useState, type ReactNode } from 'react'
import {
  GROUP_LABEL,
  NUTRIENTS,
  NUTRIENT_BY_KEY,
  formatValue,
  type NutrientGroup,
  type NutrientKey,
  type Nutrients,
} from '../domain/nutrients'
import { judge, type Target, type Targets } from '../domain/targets'
import type { NutrientTotals } from '../domain/nutrition'
import { useNav } from './nav'

export function Sheet({ title, children, footer, onClose }: { title: string; children: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  const nav = useNav()
  return (
    <div className="sheet" role="dialog" aria-label={title}>
      <header className="sheet-head">
        <button className="icon-btn" onClick={onClose ?? nav.pop} aria-label="戻る">
          ←
        </button>
        <h2>{title}</h2>
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <footer className="sheet-foot">{footer}</footer>}
    </div>
  )
}

const STATUS_LABEL = { low: '不足', ok: '適正', high: '過剰', none: '' }

function targetText(t: Target | undefined, key: NutrientKey): string {
  if (!t) return ''
  const u = NUTRIENT_BY_KEY[key].unit
  if (t.goal !== undefined) return `目安 ${formatValue(key, t.goal)}${u}`
  if (t.min !== undefined && t.max !== undefined) return `${formatValue(key, t.min)}〜${formatValue(key, t.max)}${u}`
  if (t.min !== undefined) return `${formatValue(key, t.min)}${u}以上`
  if (t.max !== undefined) return `${formatValue(key, t.max)}${u}未満`
  return ''
}

/** 1つの栄養素の達成バー */
export function NutrientBar({ k, value, target, unknown }: { k: NutrientKey; value: number; target?: Target; unknown?: number }) {
  const def = NUTRIENT_BY_KEY[k]
  const { status } = judge(value, target)
  const ref = target?.goal ?? target?.min ?? target?.max
  const pct = ref ? Math.min(100, (value / ref) * 100) : 0
  const maxMark = target?.max !== undefined && ref ? Math.min(100, (target.max / Math.max(ref, value)) * 100) : null
  return (
    <div className={`nbar st-${status}`}>
      <div className="nbar-top">
        <span className="nbar-label">{def.label}</span>
        <span className="nbar-val">
          {formatValue(k, value)}
          <small>{def.unit}</small>
          {status !== 'none' && <em className="badge">{STATUS_LABEL[status]}</em>}
        </span>
      </div>
      {ref !== undefined && (
        <div className="nbar-track">
          <div className="nbar-fill" style={{ width: `${pct}%` }} />
          {maxMark !== null && target?.min !== undefined && <div className="nbar-max" style={{ left: `${maxMark}%` }} />}
        </div>
      )}
      <div className="nbar-sub">
        <span>{targetText(target, k)}</span>
        {!!unknown && <span className="warn">※{unknown}品の値が不明（実際はもっと多い可能性）</span>}
      </div>
    </div>
  )
}

export function NutrientSummary({ totals, targets, groups = ['main', 'mineral', 'vitamin'] }: { totals: NutrientTotals; targets: Targets | null; groups?: NutrientGroup[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ main: true })
  return (
    <div className="summary">
      {groups.map((g) => (
        <section key={g} className="summary-group">
          <button className="group-toggle" onClick={() => setOpen((o) => ({ ...o, [g]: !o[g] }))} aria-expanded={!!open[g]}>
            <span>{GROUP_LABEL[g]}</span>
            <span>{open[g] ? '▲' : '▼'}</span>
          </button>
          {open[g] &&
            NUTRIENTS.filter((n) => n.group === g).map((n) => (
              <NutrientBar key={n.key} k={n.key} value={totals.total[n.key]} target={targets?.[n.key]} unknown={totals.unknown[n.key]} />
            ))}
        </section>
      ))}
    </div>
  )
}

/** 1品の栄養をコンパクトに表示 */
export function NutrientMini({ n }: { n: Nutrients }) {
  const keys: NutrientKey[] = ['energy', 'protein', 'fat', 'carb', 'salt']
  return (
    <div className="mini">
      {keys.map((k) => (
        <span key={k}>
          {NUTRIENT_BY_KEY[k].short} <b>{formatValue(k, n[k])}</b>
          {NUTRIENT_BY_KEY[k].unit}
        </span>
      ))}
    </div>
  )
}

export function NutrientList({ n }: { n: Nutrients }) {
  return (
    <table className="ntable">
      <tbody>
        {NUTRIENTS.map((d) => (
          <tr key={d.key}>
            <th>{d.label}</th>
            <td>
              {n[d.key] === null ? <span className="muted">不明</span> : formatValue(d.key, n[d.key])}
              {n[d.key] !== null && <small> {d.unit}</small>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 空欄を許す数値入力 */
export function NumInput({
  value,
  onChange,
  placeholder,
  step = 'any',
  className,
  ariaLabel,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  step?: string
  className?: string
  ariaLabel?: string
}) {
  const [text, setText] = useState(value === null ? '' : String(value))
  const [last, setLast] = useState(value)
  if (value !== last) {
    setLast(value)
    setText(value === null ? '' : String(value))
  }
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        const t = e.target.value.normalize('NFKC')
        setText(t)
        const v = t.trim() === '' ? null : Number(t)
        if (v === null || Number.isFinite(v)) {
          setLast(v)
          onChange(v)
        }
      }}
    />
  )
}

export function KindBadge({ kind }: { kind: string }) {
  const label: Record<string, string> = { food: '成分表', product: '市販品', preset: '料理', myDish: 'マイ料理' }
  return <span className={`kind kind-${kind}`}>{label[kind] ?? kind}</span>
}
