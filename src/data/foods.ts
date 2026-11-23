import raw from './foods.json'
import { NUTRIENT_KEYS, emptyNutrients, type Nutrients } from '../domain/nutrients'
import { expandQuery, matches, normalize, score } from '../domain/search'

export interface Food {
  code: string
  name: string
  group: number
  groupName: string
  /** 可食部100gあたり */
  per100g: Nutrients
  /** 検索用 */
  norm: string
}

interface RawData {
  source: string
  keys: string[]
  groups: string[]
  foods: (string | number | null)[][]
}

const data = raw as RawData

if (data.keys.join() !== NUTRIENT_KEYS.join()) {
  throw new Error('foods.json の栄養素キーが nutrients.ts と一致しません。npm run convert-foods を実行してください。')
}

export const FOOD_SOURCE = data.source

export const FOODS: Food[] = data.foods.map((row) => {
  const [code, name, group, ...values] = row as [string, string, number, ...(number | null)[]]
  const per100g = emptyNutrients()
  NUTRIENT_KEYS.forEach((k, i) => (per100g[k] = values[i] ?? null))
  const groupName = data.groups[group] ?? ''
  return { code, name, group, groupName, per100g, norm: normalize(name + groupName) }
})

const BY_CODE = new Map(FOODS.map((f) => [f.code, f]))

export function getFood(code: string): Food | undefined {
  return BY_CODE.get(code)
}

/** 表示用に名前を短くする（＜畜肉類＞などの分類を外す） */
export function displayFoodName(name: string): string {
  return name.replace(/^＜[^＞]+＞\s*/, '').replace(/^（[^）]+）\s*/, '')
}

// 普段の料理ではあまり使わない部位・加工品を後ろに回す（検索結果の並び順だけに使う）
const PENALTIES: [RegExp, number][] = [
  [/副品目|副生物/, 3],
  [/漬物|漬け|ハム類|ソーセージ類|ベーコン類/, 1.5],
  [/［親/, 2],
  [/その他］/, 1.5],
  [/缶詰|乾燥|干し|冷凍|粉末/, 1],
  [/輸入|交雑|子牛|和牛|中型種|成鶏|成鶏肉/, 0.8],
  [/焼き|ゆで|蒸し|揚げ|油いため|ソテー|天ぷら|フライ|電子レンジ/, 0.5],
]

// 家庭料理でよく使う食品は上に出す
const COMMON = new Set([
  '01088', '01026', '01039', '01048', '01049', '01064', '01015', '01079', // ごはん・パン・めん・小麦粉・パン粉
  '11123', '11129', '11130', '11119', '11163', '11089', '11046', '11064', '11221', '11219', '11227', '11230', // 肉
  '10134', '10154', '10241', '10003', '10329', // 魚介
  '10381', '10385', '10386', '10383', '02003', '02005', '12005', '04039', '04041', // 練り物・こんにゃく・ゆで卵・厚揚げ・がんもどき
  '12004', '13003', '04032', '04033', '04040', '04046', // 卵・牛乳・豆腐・油揚げ・納豆
  '06153', '06214', '02017', '06061', '06291', '06245', '06191', '06267', '06134', '06084', '06103', '06226',
  '06233', '06263', '06048', '06065', '06182', '06312', '06086', '08016', '08001', '08039', // 野菜・きのこ
  '17007', '17045', '03003', '16025', '16001', '17012', '14006', '14002', '17021', '17015', '17042', '17036', '17002', // 調味料
])

function penalty(name: string, code: string): number {
  let p = COMMON.has(code) ? -3 : 0
  for (const [re, v] of PENALTIES) if (re.test(name)) p += v
  return p
}

export function searchFoods(query: string, limit = 50): Food[] {
  const terms = expandQuery(query)
  if (terms.length === 0) return []
  return FOODS.filter((f) => matches(f.norm, terms))
    .map((f) => ({ f, s: score(f.norm, terms) + penalty(f.name, f.code) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.f)
}
