// 栄養素の定義はここに一元化する。計算・表示・保存はすべてこのキー集合で回す。

export const NUTRIENT_KEYS = [
  'energy',
  'protein',
  'fat',
  'carb',
  'fiber',
  'salt',
  'potassium',
  'calcium',
  'magnesium',
  'iron',
  'zinc',
  'vitA',
  'vitD',
  'vitE',
  'vitK',
  'vitB1',
  'vitB2',
  'niacin',
  'vitB6',
  'vitB12',
  'folate',
  'vitC',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

/** 値が不明（成分表の「-」や市販品の未表示）は null */
export type Nutrients = Record<NutrientKey, number | null>

export type NutrientGroup = 'main' | 'mineral' | 'vitamin'

export interface NutrientDef {
  key: NutrientKey
  label: string
  short: string
  unit: string
  group: NutrientGroup
  /** 表示時の小数桁 */
  digits: number
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'energy', label: 'エネルギー', short: 'エネルギー', unit: 'kcal', group: 'main', digits: 0 },
  { key: 'protein', label: 'たんぱく質', short: 'たんぱく質', unit: 'g', group: 'main', digits: 1 },
  { key: 'fat', label: '脂質', short: '脂質', unit: 'g', group: 'main', digits: 1 },
  { key: 'carb', label: '炭水化物', short: '炭水化物', unit: 'g', group: 'main', digits: 1 },
  { key: 'fiber', label: '食物繊維', short: '食物繊維', unit: 'g', group: 'main', digits: 1 },
  { key: 'salt', label: '食塩相当量', short: '食塩', unit: 'g', group: 'main', digits: 1 },
  { key: 'potassium', label: 'カリウム', short: 'カリウム', unit: 'mg', group: 'mineral', digits: 0 },
  { key: 'calcium', label: 'カルシウム', short: 'カルシウム', unit: 'mg', group: 'mineral', digits: 0 },
  { key: 'magnesium', label: 'マグネシウム', short: 'マグネシウム', unit: 'mg', group: 'mineral', digits: 0 },
  { key: 'iron', label: '鉄', short: '鉄', unit: 'mg', group: 'mineral', digits: 1 },
  { key: 'zinc', label: '亜鉛', short: '亜鉛', unit: 'mg', group: 'mineral', digits: 1 },
  { key: 'vitA', label: 'ビタミンA', short: 'ビタミンA', unit: 'μg', group: 'vitamin', digits: 0 },
  { key: 'vitD', label: 'ビタミンD', short: 'ビタミンD', unit: 'μg', group: 'vitamin', digits: 1 },
  { key: 'vitE', label: 'ビタミンE', short: 'ビタミンE', unit: 'mg', group: 'vitamin', digits: 1 },
  { key: 'vitK', label: 'ビタミンK', short: 'ビタミンK', unit: 'μg', group: 'vitamin', digits: 0 },
  { key: 'vitB1', label: 'ビタミンB1', short: 'B1', unit: 'mg', group: 'vitamin', digits: 2 },
  { key: 'vitB2', label: 'ビタミンB2', short: 'B2', unit: 'mg', group: 'vitamin', digits: 2 },
  { key: 'niacin', label: 'ナイアシン', short: 'ナイアシン', unit: 'mgNE', group: 'vitamin', digits: 1 },
  { key: 'vitB6', label: 'ビタミンB6', short: 'B6', unit: 'mg', group: 'vitamin', digits: 2 },
  { key: 'vitB12', label: 'ビタミンB12', short: 'B12', unit: 'μg', group: 'vitamin', digits: 1 },
  { key: 'folate', label: '葉酸', short: '葉酸', unit: 'μg', group: 'vitamin', digits: 0 },
  { key: 'vitC', label: 'ビタミンC', short: 'ビタミンC', unit: 'mg', group: 'vitamin', digits: 0 },
]

export const NUTRIENT_BY_KEY: Record<NutrientKey, NutrientDef> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, n]),
) as Record<NutrientKey, NutrientDef>

/** 市販品の成分表示に必ず載っている項目 */
export const LABEL_KEYS: NutrientKey[] = ['energy', 'protein', 'fat', 'carb', 'salt']

export const GROUP_LABEL: Record<NutrientGroup, string> = {
  main: 'エネルギー・主要栄養素',
  mineral: 'ミネラル',
  vitamin: 'ビタミン',
}

export function emptyNutrients(value: number | null = null): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, value])) as Nutrients
}

export function formatValue(key: NutrientKey, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '－'
  const d = NUTRIENT_BY_KEY[key].digits
  return v.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: d })
}
