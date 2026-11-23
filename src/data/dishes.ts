// 家庭料理の標準プリセット（1人前）。
// 成分表の「調理済み流通食品類」(18群)にある料理はそれをそのまま使い、
// ない料理は一般的なレシピの材料から計算する。どれも「目安」の値。
import { getFood } from './foods'
import { dishPerServing } from '../domain/nutrition'
import type { Nutrients } from '../domain/nutrients'
import { normalize } from '../domain/search'

export interface Ingredient {
  code: string
  grams: number
}

export interface PresetDish {
  id: string
  name: string
  category: '主食' | '主菜' | '副菜' | '汁物' | '丼・麺・一品'
  /** 1人前の材料 */
  ingredients: Ingredient[]
  note?: string
}

const RICE = '01088' // こめ［水稲めし］精白米 うるち米
const DASHI = '17021'
const SOY = '17007'
const MIRIN = '16025'
const SAKE = '16001'
const SUGAR = '03003'
const OIL = '14006'
const SALT = '17012'
const MISO = '17045'
const SESAME_OIL = '14002'

const g = (code: string, grams: number): Ingredient => ({ code, grams })

export const PRESET_DISHES: PresetDish[] = [
  // 主食
  { id: 'rice-s', name: 'ごはん（茶碗小盛り 100g）', category: '主食', ingredients: [g(RICE, 100)] },
  { id: 'rice', name: 'ごはん（茶碗1杯 150g）', category: '主食', ingredients: [g(RICE, 150)] },
  { id: 'rice-l', name: 'ごはん（大盛り 250g）', category: '主食', ingredients: [g(RICE, 250)] },
  { id: 'bread', name: '食パン 6枚切り1枚', category: '主食', ingredients: [g('01026', 60)] },

  // 汁物
  {
    id: 'miso-soup',
    name: '味噌汁（豆腐とわかめ）',
    category: '汁物',
    ingredients: [g(DASHI, 150), g(MISO, 12), g('04032', 30), g('09041', 10), g('06226', 5)],
  },
  { id: 'tonjiru', name: '豚汁', category: '汁物', ingredients: [g('18028', 200)] },
  { id: 'pumpkin-soup', name: 'かぼちゃのクリームスープ', category: '汁物', ingredients: [g('18042', 150)] },
  { id: 'corn-soup', name: 'コーンクリームスープ', category: '汁物', ingredients: [g('18005', 150)] },

  // 主菜（和）
  {
    id: 'shogayaki',
    name: '豚の生姜焼き（キャベツ添え）',
    category: '主菜',
    ingredients: [
      g('11123', 100), g('06153', 30), g(SOY, 9), g(MIRIN, 6), g(SAKE, 5), g('06103', 5), g(OIL, 3), g('06061', 50),
    ],
  },
  { id: 'nikujaga', name: '肉じゃが', category: '主菜', ingredients: [g('18036', 200)] },
  { id: 'chikuzenni', name: '筑前煮', category: '主菜', ingredients: [g('18035', 150)] },
  { id: 'karaage', name: '鶏の唐揚げ（4〜5個）', category: '主菜', ingredients: [g('18054', 120)] },
  {
    id: 'teriyaki-chicken',
    name: '鶏の照り焼き',
    category: '主菜',
    ingredients: [g('11221', 120), g(SOY, 9), g(MIRIN, 9), g(SAKE, 5), g(SUGAR, 2), g(OIL, 3)],
  },
  { id: 'salmon', name: '焼き鮭（1切れ）', category: '主菜', ingredients: [g('10134', 80), g(SALT, 0.8)] },
  { id: 'saba-shio', name: '塩さば（1切れ）', category: '主菜', ingredients: [g('10154', 80), g(SALT, 1.2)] },
  {
    id: 'saba-miso',
    name: 'さばの味噌煮',
    category: '主菜',
    ingredients: [g('10154', 80), g(MISO, 12), g(SUGAR, 6), g(SAKE, 10), g(MIRIN, 6), g('06103', 3)],
  },
  {
    id: 'buri-teri',
    name: 'ぶりの照り焼き',
    category: '主菜',
    ingredients: [g('10241', 80), g(SOY, 9), g(MIRIN, 9), g(SAKE, 5), g(SUGAR, 2), g(OIL, 2)],
  },
  { id: 'aji-nanban', name: 'アジの南蛮漬け', category: '主菜', ingredients: [g('18038', 120)] },
  {
    id: 'tamagoyaki',
    name: '卵焼き（卵1個分）',
    category: '主菜',
    ingredients: [g('12004', 50), g(SUGAR, 3), g(SOY, 1), g(DASHI, 10), g(OIL, 2)],
  },
  { id: 'medamayaki', name: '目玉焼き（1個）', category: '主菜', ingredients: [g('12021', 50)] },
  {
    id: 'hiyayakko',
    name: '冷奴',
    category: '主菜',
    ingredients: [g('04033', 100), g(SOY, 5), g('06226', 3), g('06103', 2)],
  },

  // 主菜（洋・中）
  { id: 'hamburg', name: 'ハンバーグ（合いびき）', category: '主菜', ingredients: [g('18050', 150)] },
  { id: 'tofu-hamburg', name: '豆腐ハンバーグ', category: '主菜', ingredients: [g('18052', 150)] },
  { id: 'croquette', name: 'ポテトコロッケ（2個）', category: '主菜', ingredients: [g('18018', 120)] },
  { id: 'cream-croquette', name: 'カニクリームコロッケ（2個）', category: '主菜', ingredients: [g('18043', 120)] },
  { id: 'ebi-fry', name: 'えびフライ（2本）', category: '主菜', ingredients: [g('18020', 80)] },
  { id: 'shiromi-fry', name: '白身魚フライ', category: '主菜', ingredients: [g('18021', 80)] },
  { id: 'menchi', name: 'メンチカツ', category: '主菜', ingredients: [g('18022', 100)] },
  { id: 'meatball', name: 'ミートボール', category: '主菜', ingredients: [g('18015', 80)] },
  { id: 'beef-stew', name: 'ビーフシチュー', category: '主菜', ingredients: [g('18011', 250)] },
  { id: 'chicken-stew', name: 'クリームシチュー（チキン）', category: '主菜', ingredients: [g('18045', 250)] },
  { id: 'gratin', name: 'えびグラタン', category: '主菜', ingredients: [g('18003', 250)] },
  { id: 'gyoza', name: '餃子（6個）', category: '主菜', ingredients: [g('18002', 150)] },
  { id: 'shumai', name: 'しゅうまい（4個）', category: '主菜', ingredients: [g('18012', 80)] },
  { id: 'harumaki', name: '春巻き（2本）', category: '主菜', ingredients: [g('18056', 100)] },
  { id: 'subuta', name: '酢豚', category: '主菜', ingredients: [g('18047', 200)] },
  { id: 'happosai', name: '八宝菜', category: '主菜', ingredients: [g('18048', 200)] },
  { id: 'mabo', name: '麻婆豆腐', category: '主菜', ingredients: [g('18049', 200)] },
  {
    id: 'yasai-itame',
    name: '野菜炒め（豚肉入り）',
    category: '主菜',
    ingredients: [
      g('06061', 60), g('06291', 50), g('06214', 15), g('06245', 15), g('11129', 40), g(OIL, 4), g(SALT, 0.8), g(SOY, 3),
    ],
  },

  // 副菜
  { id: 'kinpira', name: 'きんぴらごぼう', category: '副菜', ingredients: [g('18033', 60)] },
  { id: 'hijiki', name: 'ひじきの炒め煮', category: '副菜', ingredients: [g('18037', 60)] },
  { id: 'kiriboshi', name: '切り干し大根の煮物', category: '副菜', ingredients: [g('18032', 60)] },
  { id: 'shiraae', name: '青菜の白和え', category: '副菜', ingredients: [g('18024', 70)] },
  { id: 'goma-ae', name: 'いんげんのごま和え', category: '副菜', ingredients: [g('18025', 60)] },
  { id: 'namasu', name: '紅白なます', category: '副菜', ingredients: [g('18027', 50)] },
  { id: 'namul', name: 'もやしのナムル', category: '副菜', ingredients: [g('18039', 60)] },
  {
    id: 'ohitashi',
    name: 'ほうれん草のおひたし',
    category: '副菜',
    ingredients: [g('06267', 70), g(SOY, 4), g(DASHI, 5)],
  },
  {
    id: 'salad',
    name: 'サラダ（レタス・トマト・きゅうり、ドレッシング）',
    category: '副菜',
    ingredients: [g('06312', 30), g('06182', 40), g('06065', 20), g('17116', 10)],
  },

  // 丼・麺・一品
  { id: 'curry-pork', name: 'カレーライス（ポーク）', category: '丼・麺・一品', ingredients: [g('18041', 250), g(RICE, 250)] },
  { id: 'curry-beef', name: 'カレーライス（ビーフ）', category: '丼・麺・一品', ingredients: [g('18001', 250), g(RICE, 250)] },
  { id: 'curry-chicken', name: 'カレーライス（チキン）', category: '丼・麺・一品', ingredients: [g('18040', 250), g(RICE, 250)] },
  { id: 'oyakodon', name: '親子丼', category: '丼・麺・一品', ingredients: [g('18030', 180), g(RICE, 250)] },
  { id: 'gyudon', name: '牛丼', category: '丼・麺・一品', ingredients: [g('18031', 150), g(RICE, 250)] },
  { id: 'chahan', name: 'チャーハン', category: '丼・麺・一品', ingredients: [g('18057', 250)] },
  { id: 'okonomiyaki', name: 'お好み焼き', category: '丼・麺・一品', ingredients: [g('18053', 250)] },
  {
    id: 'yakisoba',
    name: '焼きそば',
    category: '丼・麺・一品',
    ingredients: [g('01049', 150), g('11129', 40), g('06061', 60), g('06214', 15), g('06291', 30), g(OIL, 5), g('17002', 25)],
  },
  {
    id: 'meat-sauce',
    name: 'スパゲッティ ミートソース',
    category: '丼・麺・一品',
    ingredients: [
      g('01064', 250), g('11089', 40), g('11163', 30), g('06153', 40), g('06214', 15), g('06184', 80), g('17036', 15),
      g(OIL, 5), g(SALT, 1), g('17002', 5),
    ],
  },
  {
    id: 'kake-udon',
    name: 'かけうどん',
    category: '丼・麺・一品',
    ingredients: [g('01039', 230), g(DASHI, 300), g(SOY, 15), g(MIRIN, 10), g('06226', 5)],
    note: 'つゆを全部飲んだ場合の値',
  },
  {
    id: 'ramen-home',
    name: '中華そば（鶏がらしょうゆ）',
    category: '丼・麺・一品',
    ingredients: [g('01048', 230), g('17024', 300), g(SOY, 18), g(SESAME_OIL, 2), g('06226', 5), g('11176', 15)],
    note: 'スープを全部飲んだ場合の値',
  },
]

// ひらがなで打っても見つかるように、漢字を含む料理名の読み（検索用）
const YOMI: Record<string, string> = {
  'rice-s': 'ごはん ちゃわん こもり はくまい',
  rice: 'ごはん ちゃわん いっぱい はくまい',
  'rice-l': 'ごはん おおもり はくまい',
  bread: 'しょくぱん ぱん',
  'miso-soup': 'みそしる とうふ わかめ',
  tonjiru: 'とんじる ぶたじる',
  'pumpkin-soup': 'かぼちゃ すーぷ',
  shogayaki: 'ぶたのしょうがやき しょうがやき ぶたにく',
  nikujaga: 'にくじゃが',
  chikuzenni: 'ちくぜんに にもの',
  karaage: 'とりのからあげ からあげ とりにく',
  'teriyaki-chicken': 'とりのてりやき てりやき とりにく',
  salmon: 'やきざけ しゃけ さけ',
  'saba-shio': 'しおさば さば',
  'saba-miso': 'さばのみそに みそに さば',
  'buri-teri': 'ぶりのてりやき てりやき ぶり',
  'aji-nanban': 'あじのなんばんづけ なんばんづけ あじ',
  tamagoyaki: 'たまごやき だしまき',
  medamayaki: 'めだまやき たまご',
  hiyayakko: 'ひややっこ とうふ',
  hamburg: 'はんばーぐ あいびき',
  'tofu-hamburg': 'とうふはんばーぐ',
  croquette: 'ころっけ',
  'cream-croquette': 'かにくりーむころっけ ころっけ',
  'shiromi-fry': 'しろみざかなふらい ふらい',
  menchi: 'めんちかつ',
  'beef-stew': 'びーふしちゅー しちゅー',
  'chicken-stew': 'くりーむしちゅー しちゅー',
  gyoza: 'ぎょうざ',
  harumaki: 'はるまき',
  subuta: 'すぶた',
  happosai: 'はっぽうさい',
  mabo: 'まーぼーどうふ まーぼー',
  'yasai-itame': 'やさいいため ぶたにく',
  kinpira: 'きんぴらごぼう きんぴら',
  hijiki: 'ひじきのいために ひじき',
  kiriboshi: 'きりぼしだいこん にもの',
  shiraae: 'あおなのしらあえ しらあえ',
  'goma-ae': 'いんげんのごまあえ ごまあえ',
  namasu: 'こうはくなます なます',
  ohitashi: 'ほうれんそうのおひたし おひたし',
  salad: 'さらだ',
  'curry-pork': 'かれーらいす かれー ぽーく ぶたにく',
  'curry-beef': 'かれーらいす かれー びーふ ぎゅうにく',
  'curry-chicken': 'かれーらいす かれー ちきん とりにく',
  oyakodon: 'おやこどん どんぶり',
  gyudon: 'ぎゅうどん どんぶり',
  okonomiyaki: 'おこのみやき',
  yakisoba: 'やきそば',
  'meat-sauce': 'すぱげってぃ みーとそーす ぱすた',
  'kake-udon': 'かけうどん うどん',
  'ramen-home': 'ちゅうかそば らーめん',
}

export interface ComputedDish extends PresetDish {
  perServing: Nutrients
  grams: number
  norm: string
}

const cache = new Map<string, ComputedDish>()

export function computeIngredients(ingredients: Ingredient[], servings = 1): Nutrients {
  const list = ingredients.flatMap((i) => {
    const f = getFood(i.code)
    return f ? [{ per100g: f.per100g, grams: i.grams }] : []
  })
  return dishPerServing(list, servings)
}

export function getPresetDishes(): ComputedDish[] {
  return PRESET_DISHES.map((d) => {
    let c = cache.get(d.id)
    if (!c) {
      c = {
        ...d,
        perServing: computeIngredients(d.ingredients),
        grams: d.ingredients.reduce((s, i) => s + i.grams, 0),
        norm: [d.name + d.category, ...(YOMI[d.id] ?? '').split(/\s+/)].map(normalize).filter(Boolean).join('|'),
      }
      cache.set(d.id, c)
    }
    return c
  })
}

export function getPresetDish(id: string): ComputedDish | undefined {
  return getPresetDishes().find((d) => d.id === id)
}
