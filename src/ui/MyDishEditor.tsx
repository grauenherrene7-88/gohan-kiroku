import { useMemo, useState } from 'react'
import { db, type Meal, type MyDish } from '../db/db'
import { myDishCandidate } from '../db/logic'
import { displayFoodName, getFood, searchFoods } from '../data/foods'
import { computeIngredients, getPresetDish, getPresetDishes, type Ingredient } from '../data/dishes'
import { formatValue } from '../domain/nutrients'
import { NumInput, NutrientList, NutrientMini, Sheet } from './components'
import { useNav } from './nav'

export function MyDishEditor({ dish, fromPresetId, afterSave }: { dish?: MyDish; fromPresetId?: string; afterSave?: { date: string; meal: Meal } }) {
  const nav = useNav()
  const preset = fromPresetId ? getPresetDish(fromPresetId) : undefined
  const [name, setName] = useState(dish?.name ?? (preset ? `${preset.name}（うち）` : ''))
  const [servings, setServings] = useState<number | null>(dish?.servings ?? 1)
  const [items, setItems] = useState<(Ingredient & { key: number })[]>(
    (dish?.ingredients ?? preset?.ingredients ?? []).map((i, idx) => ({ ...i, key: idx })),
  )
  const [memo, setMemo] = useState(dish?.memo ?? '')
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const results = useMemo(() => (q.trim() ? searchFoods(q, 30) : []), [q])
  const per = computeIngredients(items, servings || 1)
  const canSave = name.trim() !== '' && items.length > 0 && !!servings && servings > 0

  function add(code: string) {
    setItems((list) => [...list, { code, grams: 100, key: Date.now() }])
    setQ('')
  }

  async function save() {
    if (!canSave) return
    const now = Date.now()
    const data: MyDish = {
      ...(dish ?? { createdAt: now }),
      name: name.trim(),
      servings: servings!,
      ingredients: items.filter((i) => i.grams > 0).map(({ code, grams }) => ({ code, grams })),
      memo: memo.trim() || undefined,
      updatedAt: now,
    }
    let id = dish?.id
    if (id) await db.myDishes.put({ ...data, id })
    else id = await db.myDishes.add(data)
    nav.toast('保存しました')
    if (afterSave) {
      const saved = (await db.myDishes.get(id))!
      nav.replace({ type: 'amount', candidate: myDishCandidate(saved), date: afterSave.date, meal: afterSave.meal })
    } else nav.pop()
  }

  async function remove() {
    if (!dish?.id || !confirm(`「${dish.name}」を削除しますか？（これまでの記録は残ります）`)) return
    await db.myDishes.delete(dish.id)
    nav.toast('削除しました')
    nav.pop()
  }

  return (
    <Sheet
      title={dish ? 'マイ料理を編集' : 'マイ料理を作る'}
      footer={
        <>
          {dish && (
            <button className="btn danger" onClick={remove}>
              削除
            </button>
          )}
          <button className="btn primary grow" disabled={!canSave} onClick={save}>
            保存{afterSave ? 'して記録へ' : ''}
          </button>
        </>
      }
    >
      <p className="hint">親に聞いた材料と量を入れると、1人前の栄養を計算します。よく出る料理を登録しておくと次から1タップで記録できます。</p>

      {!dish && !preset && items.length === 0 && (
        <label className="field">
          <span className="field-label">標準の料理をもとに作る（任意）</span>
          <select defaultValue="" onChange={(e) => e.target.value && nav.replace({ type: 'myDish', fromPresetId: e.target.value, afterSave })}>
            <option value="">選ばない</option>
            {getPresetDishes().map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="row2">
        <label className="field">
          <span className="field-label">料理名 *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: うちのカレー" />
        </label>
        <label className="field">
          <span className="field-label">何人分の材料？</span>
          <NumInput value={servings} onChange={setServings} />
        </label>
      </div>

      <h4 className="list-title">材料（{servings || 1}人分の量）</h4>
      {items.length === 0 && <p className="muted">下の検索から材料を追加してください。</p>}
      <ul className="ings">
        {items.map((it) => {
          const f = getFood(it.code)
          return (
            <li key={it.key}>
              <span className="ing-name">{f ? displayFoodName(f.name) : `不明な食品(${it.code})`}</span>
              <NumInput
                className="ing-g"
                value={it.grams}
                ariaLabel="グラム"
                onChange={(v) => setItems((list) => list.map((x) => (x.key === it.key ? { ...x, grams: v ?? 0 } : x)))}
              />
              <span>g</span>
              <button className="icon-btn" aria-label="材料を削除" onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}>
                ×
              </button>
            </li>
          )
        })}
      </ul>

      <input
        className="search"
        type="search"
        autoComplete="off"
        placeholder="材料を検索（例: 豚肉 ばら、たまねぎ、しょうゆ）"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() !== '' && (
        <p className="hint">
          {results.length === 0
            ? '見つかりませんでした。ひらがな・漢字を変えてみてください（例: 鶏肉→にわとり、竹輪→ちくわ）。'
            : `${results.length >= 30 ? '30件以上' : `${results.length}件`}。スペースで区切ると絞り込めます（例: にわとり もも）。`}
        </p>
      )}
      {results.length > 0 && (
        <ul className="cands">
          {results.map((f) => (
            <li key={f.code}>
              <button className="cand" onClick={() => add(f.code)}>
                <span className="cand-name">{displayFoodName(f.name)}</span>
                <span className="cand-kcal">100g {formatValue('energy', f.per100g.energy)}kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">「生」の食品を選ぶと調理による変化は反映されません（目安）。油や調味料も入れると精度が上がります。</p>

      {items.length > 0 && (
        <div className="card">
          <h4>1人前あたり</h4>
          <NutrientMini n={per} />
          <button className="link" onClick={() => setShowAll((s) => !s)}>
            {showAll ? '閉じる' : 'すべての栄養素を見る'}
          </button>
          {showAll && <NutrientList n={per} />}
        </div>
      )}

      <label className="field">
        <span className="field-label">メモ</span>
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="任意" />
      </label>
    </Sheet>
  )
}
