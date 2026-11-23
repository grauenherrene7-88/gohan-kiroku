import { NUTRIENT_KEYS, emptyNutrients, type NutrientKey, type Nutrients } from './nutrients'

/** 全栄養素に倍率をかける（null は null のまま） */
export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = n[k]
    out[k] = v === null || v === undefined ? null : v * factor
  }
  return out
}

/**
 * 料理など「材料の合計」を作るときの足し算。
 * 一部の材料が不明でも、わかっている分は合計する。全材料が不明な項目だけ null。
 */
export function combineNutrients(list: Nutrients[]): Nutrients {
  const out = emptyNutrients()
  for (const n of list) {
    for (const k of NUTRIENT_KEYS) {
      const v = n[k]
      if (v === null || v === undefined) continue
      out[k] = (out[k] ?? 0) + v
    }
  }
  return out
}

export interface NutrientTotals {
  total: Record<NutrientKey, number>
  /** その栄養素の値が不明だった記録の件数 */
  unknown: Record<NutrientKey, number>
  count: number
}

/** 1日分などの合計。不明な値は 0 として足し、件数を unknown に数える */
export function sumNutrients(list: Nutrients[]): NutrientTotals {
  const total = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Record<NutrientKey, number>
  const unknown = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Record<NutrientKey, number>
  for (const n of list) {
    for (const k of NUTRIENT_KEYS) {
      const v = n[k]
      if (v === null || v === undefined) unknown[k]++
      else total[k] += v
    }
  }
  return { total, unknown, count: list.length }
}

/** 食品成分表の値(100gあたり)から g 分を計算 */
export function nutrientsForGrams(per100g: Nutrients, grams: number): Nutrients {
  return scaleNutrients(per100g, grams / 100)
}

/** 材料リスト（100gあたり値とグラム）から料理1人前を計算 */
export function dishPerServing(
  ingredients: { per100g: Nutrients; grams: number }[],
  servings: number,
): Nutrients {
  const whole = combineNutrients(ingredients.map((i) => nutrientsForGrams(i.per100g, i.grams)))
  return scaleNutrients(whole, 1 / Math.max(servings, 0.01))
}

export function roundNutrients(n: Nutrients, digits = 3): Nutrients {
  const p = 10 ** digits
  const out = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = n[k]
    out[k] = v === null ? null : Math.round(v * p) / p
  }
  return out
}
