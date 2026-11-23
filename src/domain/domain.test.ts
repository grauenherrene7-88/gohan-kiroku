import { describe, expect, it } from 'vitest'
import { emptyNutrients } from './nutrients'
import { combineNutrients, dishPerServing, nutrientsForGrams, sumNutrients } from './nutrition'
import { computeTargets, estimatedEnergy, judge } from './targets'
import { expandQuery, matches, normalize } from './search'
import { getFood, searchFoods } from '../data/foods'
import { getPresetDishes } from '../data/dishes'

const n = (o: Partial<Record<string, number | null>>) => ({ ...emptyNutrients(), ...o })

describe('nutrition', () => {
  it('100gあたりの値をグラムで換算する', () => {
    const r = nutrientsForGrams(n({ energy: 156, protein: 2.5, vitD: null }), 150)
    expect(r.energy).toBeCloseTo(234)
    expect(r.protein).toBeCloseTo(3.75)
    expect(r.vitD).toBeNull()
  })

  it('料理は材料の合計を人数で割る', () => {
    const r = dishPerServing(
      [
        { per100g: n({ energy: 100, salt: 0 }), grams: 200 },
        { per100g: n({ energy: 0, salt: 10 }), grams: 10 },
      ],
      2,
    )
    expect(r.energy).toBe(100)
    expect(r.salt).toBe(0.5)
  })

  it('料理: 一部の材料が不明でも分かる分は足す', () => {
    const r = combineNutrients([n({ vitD: 1 }), n({ vitD: null })])
    expect(r.vitD).toBe(1)
    expect(combineNutrients([n({}), n({})]).vitD).toBeNull()
  })

  it('1日の合計で不明な件数を数える', () => {
    const t = sumNutrients([n({ energy: 300, vitC: null }), n({ energy: 200, vitC: 10 })])
    expect(t.total.energy).toBe(500)
    expect(t.total.vitC).toBe(10)
    expect(t.unknown.vitC).toBe(1)
    expect(t.unknown.energy).toBe(0)
  })
})

describe('targets', () => {
  const male20 = { sex: 'male', age: 20, heightCm: 170, weightKg: 63, activity: 'normal', menstruation: false } as const
  it('推定エネルギー必要量 = 基礎代謝基準値×体重×PAL', () => {
    expect(estimatedEnergy(male20)).toBe(Math.round(23.7 * 63 * 1.75))
  })
  it('年齢・性別の表を引く', () => {
    const t = computeTargets(male20)
    expect(t.salt?.max).toBe(7.5)
    expect(t.calcium?.min).toBe(800)
    expect(t.iron?.min).toBe(7.0)
    const f = computeTargets({ ...male20, sex: 'female', menstruation: true })
    expect(f.iron?.min).toBe(10.0)
    expect(f.salt?.max).toBe(6.5)
  })
  it('判定', () => {
    expect(judge(50, { min: 100, kind: '推奨量' }).status).toBe('low')
    expect(judge(120, { min: 100, kind: '推奨量' }).status).toBe('ok')
    expect(judge(8, { max: 7.5, kind: '目標量' }).status).toBe('high')
    expect(judge(2000, { goal: 2600, kind: '推定必要量' }).status).toBe('low')
  })
})

describe('search', () => {
  it('カタカナとひらがなを同一視', () => {
    expect(normalize('ジャガイモ')).toBe(normalize('じゃがいも'))
  })
  it('言い換え', () => {
    expect(matches(normalize('こめ［水稲めし］精白米 うるち米'), expandQuery('ごはん'))).toBe(true)
  })
  it('成分表を検索できる', () => {
    expect(searchFoods('ごはん')[0]?.code).toBe('01088')
    expect(searchFoods('木綿豆腐').length).toBeGreaterThan(0)
  })
  it('よく使う部位が内臓より先に出る', () => {
    const top = searchFoods('にわとり').slice(0, 5).map((f) => f.name).join('\n')
    expect(top).toMatch(/もも/)
    expect(top).toMatch(/むね/)
    expect(top).not.toMatch(/肝臓|心臓/)
    expect(searchFoods('豚肉').slice(0, 5).some((f) => /副生物/.test(f.name))).toBe(false)
    expect(searchFoods('しょうゆ')[0]?.code).toBe('17007')
    expect(searchFoods('ちくわ').some((f) => f.code === '10381')).toBe(true)
  })
})

describe('data', () => {
  it('ごはん150gは成分表の値×1.5', () => {
    const rice = getFood('01088')!
    const dish = getPresetDishes().find((d) => d.id === 'rice')!
    expect(dish.perServing.energy).toBeCloseTo(rice.per100g.energy! * 1.5)
  })
  it('プリセットの材料コードが全部成分表にある', () => {
    for (const d of getPresetDishes()) {
      for (const i of d.ingredients) expect(getFood(i.code), `${d.name}: ${i.code}`).toBeDefined()
    }
  })
})
