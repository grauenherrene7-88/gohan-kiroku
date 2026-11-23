// 文部科学省「日本食品標準成分表（八訂）増補2023年」第2章データ(Excel)を
// アプリ用の src/data/foods.json に変換するスクリプト。
// 使い方: npm run convert-foods
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const ExcelJS = require('exceljs')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2] ?? path.join(root, 'data-src', 'mext-2023.xlsx')
const output = path.join(root, 'src', 'data', 'foods.json')

// src/domain/nutrients.ts の NUTRIENT_KEYS と同じ順番・同じキーにすること
const COLUMNS = {
  energy: 7, // ENERC_KCAL
  protein: 10, // PROT-
  fat: 13, // FAT-
  carb: 21, // CHOCDF-
  fiber: 19, // FIB-
  salt: 61, // NACL_EQ
  potassium: 25,
  calcium: 26,
  magnesium: 27,
  iron: 29,
  zinc: 30,
  vitA: 43, // VITA_RAE
  vitD: 44,
  vitE: 45, // TOCPHA
  vitK: 49,
  vitB1: 50,
  vitB2: 51,
  niacin: 53, // NE
  vitB6: 54,
  vitB12: 55,
  folate: 56,
  vitC: 59,
}
// 列見出しの成分識別子で列ずれを検出する
const EXPECTED_IDS = {
  7: 'ENERC_KCAL', 10: 'PROT-', 13: 'FAT-', 21: 'CHOCDF-', 19: 'FIB-', 61: 'NACL_EQ',
  25: 'K', 26: 'CA', 27: 'MG', 29: 'FE', 30: 'ZN', 43: 'VITA_RAE', 44: 'VITD', 45: 'TOCPHA',
  49: 'VITK', 50: 'THIA', 51: 'RIBF', 53: 'NE', 54: 'VITB6A', 55: 'VITB12', 56: 'FOL', 59: 'VITC',
}

const GROUPS = [
  '', '穀類', 'いも及びでん粉類', '砂糖及び甘味類', '豆類', '種実類', '野菜類', '果実類', 'きのこ類',
  '藻類', '魚介類', '肉類', '卵類', '乳類', '油脂類', '菓子類', 'し好飲料類', '調味料及び香辛料類',
  '調理済み流通食品類',
]

function cellText(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if ('result' in v) return String(v.result ?? '')
    return ''
  }
  return String(v)
}

/** 成分表の表記を数値に: Tr→0, (0)→0, (1.2)→1.2, -→null, *→null */
export function parseValue(raw) {
  let s = cellText(raw).trim()
  if (s === '' || s === '-' || s === '−' || s === '*') return null
  s = s.replace(/^\((.*)\)$/, '$1').trim()
  if (s === 'Tr' || s === 'TR') return 0
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(input)
const ws = wb.getWorksheet('表全体') ?? wb.worksheets[0]

// 成分識別子の行（12行目）を確認
const idRow = ws.getRow(12)
for (const [col, id] of Object.entries(EXPECTED_IDS)) {
  const actual = cellText(idRow.getCell(Number(col)).value).trim()
  if (actual !== id) {
    throw new Error(`列 ${col} の成分識別子が想定(${id})と違います: "${actual}"。Excelの形式が変わった可能性があります。`)
  }
}

const keys = Object.keys(COLUMNS)
const foods = []
for (let r = 13; r <= ws.rowCount; r++) {
  const row = ws.getRow(r)
  const code = cellText(row.getCell(2).value).trim()
  const name = cellText(row.getCell(4).value).replace(/\s+/g, ' ').replace(/　+/g, ' ').trim()
  if (!/^\d{5}$/.test(code) || !name) continue
  const group = Number(cellText(row.getCell(1).value))
  const values = keys.map((k) => parseValue(row.getCell(COLUMNS[k]).value))
  foods.push([code, name, group, ...values])
}

writeFileSync(
  output,
  JSON.stringify({
    source: '日本食品標準成分表（八訂）増補2023年（文部科学省）',
    keys,
    groups: GROUPS,
    foods,
  }),
)
console.log(`${foods.length} 食品を ${path.relative(root, output)} に書き出しました`)
