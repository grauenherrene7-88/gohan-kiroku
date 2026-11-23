// 栄養成分表示の文字列（OCR結果）から数値を取り出す。
// OCRは誤認識が多いので、ここで取れた値は必ず人が確認する前提。
import type { NutrientKey } from '../domain/nutrients'

export interface ParsedLabel {
  values: Partial<Record<NutrientKey, number>>
  /** 「100gあたり」なら '100g'、「1袋(45g)あたり」などなら 'unit' */
  basis: 'unit' | '100g' | null
  unitName: string | null
  unitGrams: number | null
  /** 正規化後のテキスト（確認画面に表示） */
  text: string
}

/** OCRでよくある誤認識を直し、全角を半角にする */
export function normalizeOcrText(s: string): string {
  let t = s.normalize('NFKC')
  // 日本語の間に入る余計な空白を消す（数字の間の空白は残す）
  t = t.replace(/([^\x00-\x7F])\s+(?=[^\x00-\x7F])/g, '$1')
  t = t.replace(/[，､]/g, ',').replace(/[．・]/g, (c) => (c === '．' ? '.' : c))
  // 数字に挟まれた O/o/D → 0, l/I/| → 1
  t = t.replace(/(?<=\d)[OoD](?=[\d.]|\s*[gkm])/g, '0').replace(/(?<=[\s:：])[OoD](?=[.,]\d)/g, '0')
  t = t.replace(/(?<=\d)[lI|](?=[\d.])/g, '1').replace(/(?<=[\s:：])[lI|](?=[\d.,]\d)/g, '1')
  // 小数点の直後（例: 23.l → 23.1, 1.O → 1.0）
  t = t.replace(/(?<=\d\.)[lI|]/g, '1').replace(/(?<=\d\.)[OoD]/g, '0')
  // 小数点がカンマに化けたもの（例: 3,5g → 3.5g）
  t = t.replace(/(\d),(\d)(?=\s*(?:g|mg|μg|ug|kcal))/g, '$1.$2')
  // 単位の表記ゆれ
  t = t.replace(/kca[1lI]/gi, 'kcal').replace(/Kcal/g, 'kcal').replace(/[µu]g/g, 'μg').replace(/(?<=\d\s*)9(?=\s*$)/gm, 'g')
  return t
}

const NUM = String.raw`(\d+(?:\.\d+)?)`

interface FieldRule {
  key: NutrientKey
  label: RegExp
  unit: 'kcal' | 'g' | 'mg' | 'μg'
}

// ラベル → 数値。ラベルと数値の間には 0〜15文字程度の何か（空白・記号・誤認識）が入りうる
const RULES: FieldRule[] = [
  { key: 'energy', label: /(?:エネルギー|熱量|エネルギ)/, unit: 'kcal' },
  { key: 'protein', label: /(?:たんぱく質|たんぱく|タンパク質|蛋白質|たん白質)/, unit: 'g' },
  { key: 'fat', label: /脂質/, unit: 'g' },
  { key: 'carb', label: /炭水化物/, unit: 'g' },
  { key: 'fiber', label: /食物繊維/, unit: 'g' },
  { key: 'salt', label: /(?:食塩相当量|食塩相当|食塩)/, unit: 'g' },
  { key: 'calcium', label: /カルシウム/, unit: 'mg' },
  { key: 'iron', label: /鉄(?!分)/, unit: 'mg' },
  { key: 'potassium', label: /カリウム/, unit: 'mg' },
  { key: 'magnesium', label: /マグネシウム/, unit: 'mg' },
  { key: 'zinc', label: /亜鉛/, unit: 'mg' },
  { key: 'vitA', label: /ビタミンA/, unit: 'μg' },
  { key: 'vitD', label: /ビタミンD/, unit: 'μg' },
  { key: 'vitE', label: /ビタミンE/, unit: 'mg' },
  { key: 'vitK', label: /ビタミンK/, unit: 'μg' },
  { key: 'vitB1', label: /ビタミンB1(?!2)/, unit: 'mg' },
  { key: 'vitB2', label: /ビタミンB2/, unit: 'mg' },
  { key: 'niacin', label: /ナイアシン/, unit: 'mg' },
  { key: 'vitB6', label: /ビタミンB6/, unit: 'mg' },
  { key: 'vitB12', label: /ビタミンB12/, unit: 'μg' },
  { key: 'folate', label: /葉酸/, unit: 'μg' },
  { key: 'vitC', label: /ビタミンC/, unit: 'mg' },
]

function findNumberAfter(text: string, label: RegExp, unit: FieldRule['unit']): number | null {
  const re = new RegExp(label.source + String.raw`[^\d\n]{0,15}?` + NUM + String.raw`\s*(kcal|mg|μg|g)?`, 'g')
  for (const m of text.matchAll(re)) {
    const v = Number(m[1])
    const u = m[2] as string | undefined
    if (!Number.isFinite(v)) continue
    if (unit === 'kcal' && u && u !== 'kcal') continue
    // 単位の換算（表示単位がアプリと違う場合）
    if (u === 'mg' && unit === 'g') return v / 1000
    if (u === 'g' && unit === 'mg') return v * 1000
    if (u === 'μg' && unit === 'mg') return v / 1000
    if (u === 'mg' && unit === 'μg') return v * 1000
    return v
  }
  return null
}

export function parseLabel(raw: string): ParsedLabel {
  const text = normalizeOcrText(raw)
  const values: ParsedLabel['values'] = {}

  for (const r of RULES) {
    const v = findNumberAfter(text, r.label, r.unit)
    if (v !== null) values[r.key] = v
  }

  // 食塩相当量がなくナトリウムだけ書かれている場合: 食塩(g) = Na(mg) × 2.54 / 1000
  if (values.salt === undefined) {
    const na = /ナトリウム[^\d\n]{0,10}?(\d+(?:\.\d+)?)\s*(mg|g)?/.exec(text)
    if (na) {
      const mg = na[2] === 'g' ? Number(na[1]) * 1000 : Number(na[1])
      values.salt = Math.round(((mg * 2.54) / 1000) * 100) / 100
    }
  }

  // 「糖質」と「食物繊維」だけで炭水化物がない場合は合計する
  if (values.carb === undefined) {
    const sugar = findNumberAfter(text, /糖質/, 'g')
    if (sugar !== null) values.carb = sugar + (values.fiber ?? 0)
  }

  // 何あたりの表示か
  let basis: ParsedLabel['basis'] = null
  let unitName: string | null = null
  let unitGrams: number | null = null
  if (/100\s*(?:g|ml|mL)\s*(?:当たり|当り|あたり)/.test(text)) basis = '100g'
  const unitM = /1\s*(袋|個|本|枚|食|箱|パック|包装|カップ|缶|杯|切れ|粒)\s*(?:[(（]\s*(\d+(?:\.\d+)?)\s*(?:g|ml|mL)\s*[)）])?\s*(?:当たり|当り|あたり)/.exec(text)
  if (unitM) {
    if (basis === null) basis = 'unit'
    unitName = unitM[1]
    unitGrams = unitM[2] ? Number(unitM[2]) : null
  }
  if (unitGrams === null) {
    const net = /内容量[^\d\n]{0,6}(\d+(?:\.\d+)?)\s*(?:g|ml|mL)/.exec(text)
    if (net) unitGrams = Number(net[1])
  }

  return { values, basis, unitName, unitGrams, text }
}
