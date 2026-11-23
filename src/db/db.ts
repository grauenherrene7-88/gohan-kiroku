import Dexie, { type EntityTable } from 'dexie'
import type { Nutrients } from '../domain/nutrients'
import type { Ingredient } from '../data/dishes'
import type { Profile, Target } from '../domain/targets'
import type { NutrientKey } from '../domain/nutrients'

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
]

/** 市販品 */
export interface Product {
  id?: number
  name: string
  barcode?: string
  /** 成分表示が「1袋あたり」等なら 'unit'、「100gあたり」なら '100g' */
  labelBasis: 'unit' | '100g'
  /** 1袋・1個などの呼び方 */
  unitName: string
  /** 1袋(1個)の重さ g。わからなければ null */
  unitGrams: number | null
  /** 成分表示どおりの値（labelBasis の量あたり）。表示がない項目は null */
  nutrients: Nutrients
  source: 'manual' | 'ocr'
  memo?: string
  createdAt: number
  updatedAt: number
}

/** マイ料理（親の夕食などを材料から作る） */
export interface MyDish {
  id?: number
  name: string
  servings: number
  ingredients: Ingredient[]
  memo?: string
  createdAt: number
  updatedAt: number
}

export type SourceKind = 'food' | 'product' | 'preset' | 'myDish'

/** 食事記録。栄養値は記録した時点の値を保存する（後で登録品を直しても過去は変わらない） */
export interface LogEntry {
  id?: number
  date: string // YYYY-MM-DD
  meal: Meal
  kind: SourceKind
  refId: string
  name: string
  /** 量の表示（例: 150g, 1袋, 1.5人前） */
  amountLabel: string
  amount: number
  unit: 'g' | 'unit' | 'serving'
  nutrients: Nutrients
  createdAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export interface AppSettings {
  profile: Profile | null
  targetOverrides: Partial<Record<NutrientKey, Partial<Target>>>
}

export const db = new Dexie('shokuji-app') as Dexie & {
  products: EntityTable<Product, 'id'>
  myDishes: EntityTable<MyDish, 'id'>
  logs: EntityTable<LogEntry, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  products: '++id, name, barcode, updatedAt',
  myDishes: '++id, name, updatedAt',
  logs: '++id, date, [kind+refId], createdAt',
  settings: 'key',
})

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return (s?.value as T) ?? fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}
