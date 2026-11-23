import { describe, expect, it } from 'vitest'
import { normalizeOcrText, parseLabel } from './parseLabel'

describe('parseLabel', () => {
  it('一般的な表示（1袋あたり）を読み取る', () => {
    const r = parseLabel(`栄養成分表示 1袋(60g)当たり
エネルギー 336kcal
たんぱく質 3.2g
脂質 21.6g
炭水化物 32.4g
食塩相当量 0.4g`)
    expect(r.values).toEqual({ energy: 336, protein: 3.2, fat: 21.6, carb: 32.4, salt: 0.4 })
    expect(r.basis).toBe('unit')
    expect(r.unitName).toBe('袋')
    expect(r.unitGrams).toBe(60)
  })

  it('100gあたりの表示', () => {
    const r = parseLabel('栄養成分表示（100g当たり）エネルギー：250kcal、たんぱく質：8.0g、脂質：10.5g、炭水化物：30.1g、食塩相当量：1.2g')
    expect(r.basis).toBe('100g')
    expect(r.values.energy).toBe(250)
    expect(r.values.carb).toBe(30.1)
    expect(r.values.salt).toBe(1.2)
  })

  it('全角数字やOCRの誤認識を直す', () => {
    const r = parseLabel(`エネルギー　１２０ kca1
た ん ぱ く 質 5,2g
脂 質 O.8g
炭水化物 23.l g
食塩相当量 1.O g`)
    expect(r.values.energy).toBe(120)
    expect(r.values.protein).toBe(5.2)
    expect(r.values.fat).toBe(0.8)
    expect(r.values.carb).toBe(23.1)
    expect(r.values.salt).toBe(1.0)
  })

  it('ナトリウム表示から食塩相当量を計算する', () => {
    const r = parseLabel('エネルギー 50kcal たんぱく質 1g 脂質 0g 炭水化物 12g ナトリウム 200mg')
    expect(r.values.salt).toBeCloseTo(0.51, 2)
  })

  it('糖質＋食物繊維から炭水化物を求める', () => {
    const r = parseLabel('エネルギー 180kcal たんぱく質 10g 脂質 5g 糖質 20g 食物繊維 3g 食塩相当量 0.5g')
    expect(r.values.carb).toBe(23)
    expect(r.values.fiber).toBe(3)
  })

  it('ビタミン・ミネラルも読み取れる', () => {
    const r = parseLabel('カルシウム 120mg 鉄 2.1mg ビタミンB1 0.3mg ビタミンB12 1.2μg ビタミンC 50mg ビタミンD 2.5µg')
    expect(r.values.calcium).toBe(120)
    expect(r.values.iron).toBe(2.1)
    expect(r.values.vitB1).toBe(0.3)
    expect(r.values.vitB12).toBe(1.2)
    expect(r.values.vitC).toBe(50)
    expect(r.values.vitD).toBe(2.5)
  })

  it('内容量から1個の重さを拾う', () => {
    const r = parseLabel('内容量 110g\n1個当たり エネルギー 180kcal')
    expect(r.unitGrams).toBe(110)
    expect(r.unitName).toBe('個')
  })
})

describe('normalizeOcrText', () => {
  it('kca1 を kcal に直す', () => {
    expect(normalizeOcrText('100kca1')).toBe('100kcal')
  })
})
