// 「日本人の食事摂取基準（2025年版）」（厚生労働省）の値をもとにした目標値。
// 対象は12歳以上（12〜14, 15〜17, 18〜29, 30〜49, 50〜64, 65〜74, 75以上）。
// 妊娠・授乳中の付加量には対応していない。
import type { NutrientKey } from './nutrients'

export type Sex = 'male' | 'female'
export type Activity = 'low' | 'normal' | 'high'

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  /** 女性のみ：月経あり（鉄の推奨量が変わる） */
  menstruation: boolean
}

export const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 20,
  heightCm: 170,
  weightKg: 63,
  activity: 'normal',
  menstruation: true,
}

export const AGE_GROUPS = ['12〜14', '15〜17', '18〜29', '30〜49', '50〜64', '65〜74', '75以上'] as const

export function ageGroupIndex(age: number): number {
  if (age < 15) return 0
  if (age < 18) return 1
  if (age < 30) return 2
  if (age < 50) return 3
  if (age < 65) return 4
  if (age < 75) return 5
  return 6
}

type Row = readonly (number | null)[]
type BySex = { male: Row; female: Row }

const T = {
  // エネルギー: 基礎代謝基準値(kcal/kg/日)
  bmr: { male: [31.0, 27.0, 23.7, 22.5, 21.8, 21.6, 21.5], female: [29.6, 25.3, 22.1, 21.9, 20.7, 20.7, 20.7] },
  // 身体活動レベル（男女共通）。75歳以上の「高い」は設定なし
  pal: {
    low: [1.5, 1.55, 1.5, 1.5, 1.5, 1.5, 1.4],
    normal: [1.7, 1.75, 1.75, 1.75, 1.75, 1.7, 1.7],
    high: [1.9, 1.95, 2.0, 2.0, 2.0, 1.9, null],
  },
  proteinRda: { male: [60, 65, 65, 65, 65, 60, 60], female: [55, 55, 50, 50, 50, 50, 50] },
  proteinDgMinPct: [13, 13, 13, 13, 14, 15, 15],
  fiber: { male: [17, 19, 20, 22, 22, 21, 20], female: [16, 18, 18, 18, 18, 18, 17] },
  salt: { male: [7.0, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5], female: [6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5] },
  potassium: { male: [2600, 3000, 3000, 3000, 3000, 3000, 3000], female: [2400, 2600, 2600, 2600, 2600, 2600, 2600] },
  calcium: { male: [1000, 800, 800, 750, 750, 750, 750], female: [800, 650, 650, 650, 650, 650, 600] },
  calciumUl: { male: [null, null, 2500, 2500, 2500, 2500, 2500], female: [null, null, 2500, 2500, 2500, 2500, 2500] },
  magnesium: { male: [290, 360, 340, 380, 370, 350, 330], female: [290, 310, 280, 290, 290, 280, 270] },
  ironMale: [9.0, 9.0, 7.0, 7.5, 7.0, 7.0, 6.5],
  ironFemaleNoMens: [8.0, 6.5, 6.0, 6.0, 6.0, 6.0, 5.5],
  ironFemaleMens: [12.5, 11.0, 10.0, 10.5, 10.5, null, null],
  zinc: { male: [8.5, 10.0, 9.0, 9.5, 9.5, 9.0, 9.0], female: [8.5, 8.0, 7.5, 8.0, 8.0, 7.5, 7.0] },
  zincUl: { male: [null, null, 40, 45, 45, 45, 40], female: [null, null, 35, 35, 35, 35, 35] },
  vitA: { male: [800, 900, 850, 900, 900, 850, 800], female: [700, 650, 650, 700, 700, 700, 650] },
  vitD: { male: [9, 9, 9, 9, 9, 9, 9], female: [9, 9, 9, 9, 9, 9, 9] },
  vitDUl: { male: [80, 90, 100, 100, 100, 100, 100], female: [80, 90, 100, 100, 100, 100, 100] },
  vitE: { male: [6.5, 7.0, 6.5, 6.5, 6.5, 7.5, 7.0], female: [6.0, 6.0, 5.0, 6.0, 6.0, 7.0, 6.0] },
  vitEUl: { male: [650, 750, 800, 800, 800, 800, 800], female: [600, 650, 650, 700, 700, 700, 650] },
  vitK: { male: [140, 150, 150, 150, 150, 150, 150], female: [150, 150, 150, 150, 150, 150, 150] },
  vitB1: { male: [1.1, 1.2, 1.1, 1.2, 1.1, 1.0, 1.0], female: [1.0, 1.0, 0.8, 0.9, 0.8, 0.8, 0.7] },
  vitB2: { male: [1.6, 1.7, 1.6, 1.7, 1.6, 1.4, 1.4], female: [1.4, 1.4, 1.2, 1.2, 1.2, 1.1, 1.1] },
  niacin: { male: [15, 16, 15, 16, 15, 14, 13], female: [14, 13, 11, 12, 11, 11, 10] },
  vitB6: { male: [1.4, 1.5, 1.5, 1.5, 1.5, 1.4, 1.4], female: [1.3, 1.3, 1.2, 1.2, 1.2, 1.2, 1.2] },
  vitB12: { male: [4, 4, 4, 4, 4, 4, 4], female: [4, 4, 4, 4, 4, 4, 4] },
  folate: { male: [230, 240, 240, 240, 240, 240, 240], female: [230, 240, 240, 240, 240, 240, 240] },
  vitC: { male: [90, 100, 100, 100, 100, 100, 100], female: [90, 100, 100, 100, 100, 100, 100] },
} as const

/** 指標の種類（表示用） */
export type TargetKind = '推定必要量' | '推奨量' | '目安量' | '目標量'

export interface Target {
  /** これ以上摂りたい量 */
  min?: number
  /** これ以下に抑えたい量（目標量の上限・耐容上限量） */
  max?: number
  /** エネルギーのように「ちょうど」を目指すもの */
  goal?: number
  kind: TargetKind
  note?: string
}

export type Targets = Partial<Record<NutrientKey, Target>>

const pick = (t: BySex, p: Profile, i: number) => t[p.sex][i] ?? undefined

export function estimatedEnergy(p: Profile): number {
  const i = ageGroupIndex(p.age)
  const pal = T.pal[p.activity][i] ?? T.pal.normal[i]!
  return Math.round(T.bmr[p.sex][i] * p.weightKg * pal)
}

export function computeTargets(p: Profile): Targets {
  const i = ageGroupIndex(p.age)
  const kcal = estimatedEnergy(p)
  const proteinMin = Math.max(T.proteinRda[p.sex][i], (kcal * T.proteinDgMinPct[i]) / 100 / 4)

  let iron: number
  if (p.sex === 'male') iron = T.ironMale[i]
  else iron = (p.menstruation ? T.ironFemaleMens[i] : null) ?? T.ironFemaleNoMens[i]

  return {
    energy: { goal: kcal, kind: '推定必要量', note: '基礎代謝基準値×体重×身体活動レベル' },
    protein: {
      min: round1(proteinMin),
      max: round1((kcal * 0.2) / 4),
      kind: '目標量',
      note: `推奨量${T.proteinRda[p.sex][i]}gとエネルギー比${T.proteinDgMinPct[i]}〜20%から算出`,
    },
    fat: { min: round1((kcal * 0.2) / 9), max: round1((kcal * 0.3) / 9), kind: '目標量', note: 'エネルギー比20〜30%' },
    carb: { min: round1((kcal * 0.5) / 4), max: round1((kcal * 0.65) / 4), kind: '目標量', note: 'エネルギー比50〜65%' },
    fiber: { min: pick(T.fiber, p, i), kind: '目標量' },
    salt: { max: pick(T.salt, p, i), kind: '目標量', note: '未満を目指す' },
    potassium: { min: pick(T.potassium, p, i), kind: '目標量' },
    calcium: { min: pick(T.calcium, p, i), max: pick(T.calciumUl, p, i), kind: '推奨量' },
    magnesium: { min: pick(T.magnesium, p, i), kind: '推奨量' },
    iron: { min: iron, kind: '推奨量', note: p.sex === 'female' && p.menstruation ? '月経ありの値' : undefined },
    zinc: { min: pick(T.zinc, p, i), max: pick(T.zincUl, p, i), kind: '推奨量' },
    vitA: { min: pick(T.vitA, p, i), kind: '推奨量' },
    vitD: { min: pick(T.vitD, p, i), max: pick(T.vitDUl, p, i), kind: '目安量' },
    vitE: { min: pick(T.vitE, p, i), max: pick(T.vitEUl, p, i), kind: '目安量' },
    vitK: { min: pick(T.vitK, p, i), kind: '目安量' },
    vitB1: { min: pick(T.vitB1, p, i), kind: '推奨量' },
    vitB2: { min: pick(T.vitB2, p, i), kind: '推奨量' },
    niacin: { min: pick(T.niacin, p, i), kind: '推奨量' },
    vitB6: { min: pick(T.vitB6, p, i), kind: '推奨量' },
    vitB12: { min: pick(T.vitB12, p, i), kind: '目安量' },
    folate: { min: pick(T.folate, p, i), kind: '推奨量' },
    vitC: { min: pick(T.vitC, p, i), kind: '推奨量' },
  }
}

/** 手動で上書きした目標値を反映 */
export function applyOverrides(t: Targets, overrides: Partial<Record<NutrientKey, Partial<Target>>>): Targets {
  const out: Targets = { ...t }
  for (const [k, o] of Object.entries(overrides) as [NutrientKey, Partial<Target>][]) {
    if (!o) continue
    out[k] = { ...(t[k] ?? { kind: '目標量' }), ...o }
  }
  return out
}

export type Status = 'low' | 'ok' | 'high' | 'none'

/** 摂取量が目標に対してどうか */
export function judge(value: number, t: Target | undefined): { status: Status; ratio: number } {
  if (!t) return { status: 'none', ratio: 0 }
  if (t.goal !== undefined) {
    const ratio = value / t.goal
    return { status: ratio < 0.9 ? 'low' : ratio > 1.1 ? 'high' : 'ok', ratio }
  }
  if (t.max !== undefined && value > t.max) {
    return { status: 'high', ratio: t.min ? value / t.min : value / t.max }
  }
  if (t.min !== undefined) {
    const ratio = value / t.min
    return { status: ratio < 1 ? 'low' : 'ok', ratio }
  }
  if (t.max !== undefined) return { status: 'ok', ratio: value / t.max }
  return { status: 'none', ratio: 0 }
}

function round1(v: number) {
  return Math.round(v * 10) / 10
}
