// 登録品 → 記録 の変換など、画面から使う処理。
import { db, type LogEntry, type Meal, type MyDish, type Product, type SourceKind } from './db'
import { getFood, displayFoodName } from '../data/foods'
import { computeIngredients, getPresetDish } from '../data/dishes'
import { roundNutrients, scaleNutrients } from '../domain/nutrition'
import type { Nutrients } from '../domain/nutrients'

export type AmountUnit = 'g' | 'unit' | 'serving'

/** 記録の候補（検索結果や「最近」に並ぶもの） */
export interface Candidate {
  kind: SourceKind
  refId: string
  name: string
  sub?: string
  /** 量を入れる単位の候補（先頭がデフォルト） */
  units: AmountUnit[]
  defaultAmount: Record<AmountUnit, number>
  unitName: string
  /** 1単位あたりの栄養（g の場合は 1g あたり） */
  per: Partial<Record<AmountUnit, Nutrients>>
}

export function foodCandidate(code: string): Candidate | null {
  const f = getFood(code)
  if (!f) return null
  return {
    kind: 'food',
    refId: code,
    name: displayFoodName(f.name),
    sub: f.groupName,
    units: ['g'],
    defaultAmount: { g: 100, unit: 1, serving: 1 },
    unitName: 'g',
    per: { g: scaleNutrients(f.per100g, 1 / 100) },
  }
}

export function productCandidate(p: Product): Candidate {
  const per: Candidate['per'] = {}
  if (p.labelBasis === 'unit') {
    per.unit = p.nutrients
    if (p.unitGrams) per.g = scaleNutrients(p.nutrients, 1 / p.unitGrams)
  } else {
    per.g = scaleNutrients(p.nutrients, 1 / 100)
    if (p.unitGrams) per.unit = scaleNutrients(p.nutrients, p.unitGrams / 100)
  }
  const units: AmountUnit[] = per.unit ? (per.g ? ['unit', 'g'] : ['unit']) : ['g']
  return {
    kind: 'product',
    refId: String(p.id),
    name: p.name,
    sub: '市販品',
    units,
    defaultAmount: { unit: 1, g: p.unitGrams ?? 100, serving: 1 },
    unitName: p.unitName || '個',
    per,
  }
}

export function presetCandidate(id: string): Candidate | null {
  const d = getPresetDish(id)
  if (!d) return null
  return {
    kind: 'preset',
    refId: id,
    name: d.name,
    sub: `標準の料理（${d.category}・目安）`,
    units: ['serving'],
    defaultAmount: { serving: 1, g: d.grams, unit: 1 },
    unitName: '人前',
    per: { serving: d.perServing },
  }
}

export function myDishCandidate(d: MyDish): Candidate {
  return {
    kind: 'myDish',
    refId: String(d.id),
    name: d.name,
    sub: 'マイ料理',
    units: ['serving'],
    defaultAmount: { serving: 1, g: 100, unit: 1 },
    unitName: '人前',
    per: { serving: computeIngredients(d.ingredients, d.servings) },
  }
}

export async function candidateFromRef(kind: SourceKind, refId: string): Promise<Candidate | null> {
  switch (kind) {
    case 'food':
      return foodCandidate(refId)
    case 'preset':
      return presetCandidate(refId)
    case 'product': {
      const p = await db.products.get(Number(refId))
      return p ? productCandidate(p) : null
    }
    case 'myDish': {
      const d = await db.myDishes.get(Number(refId))
      return d ? myDishCandidate(d) : null
    }
  }
}

export function amountLabel(c: Candidate, amount: number, unit: AmountUnit): string {
  const a = Number(amount.toFixed(2))
  if (unit === 'g') return `${a}g`
  if (unit === 'serving') return `${a}人前`
  return `${a}${c.unitName}`
}

export function nutrientsFor(c: Candidate, amount: number, unit: AmountUnit): Nutrients | null {
  const per = c.per[unit]
  return per ? roundNutrients(scaleNutrients(per, amount)) : null
}

export async function addLog(date: string, meal: Meal, c: Candidate, amount: number, unit: AmountUnit) {
  const nutrients = nutrientsFor(c, amount, unit)
  if (!nutrients) throw new Error('この単位では計算できません')
  const entry: LogEntry = {
    date,
    meal,
    kind: c.kind,
    refId: c.refId,
    name: c.name,
    amount,
    unit,
    amountLabel: amountLabel(c, amount, unit),
    nutrients,
    createdAt: Date.now(),
  }
  return db.logs.add(entry)
}

/** 最近記録したもの（重複なし、新しい順） */
export async function recentRefs(limit = 30): Promise<LogEntry[]> {
  const logs = await db.logs.orderBy('createdAt').reverse().limit(300).toArray()
  const seen = new Set<string>()
  const out: LogEntry[] = []
  for (const l of logs) {
    const key = `${l.kind}:${l.refId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l)
    if (out.length >= limit) break
  }
  return out
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return todayStr(new Date(y, m - 1, d + days))
}

export function formatDateJa(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const w = '日月火水木金土'[new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日（${w}）`
}
