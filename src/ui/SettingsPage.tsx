import { useEffect, useRef, useState } from 'react'
import { db, setSetting } from '../db/db'
import { exportBackup, readBackup, restoreBackup } from '../db/backup'
import { AGE_GROUPS, DEFAULT_PROFILE, ageGroupIndex, computeTargets, estimatedEnergy, type Profile, type Target } from '../domain/targets'
import { NUTRIENTS, formatValue, type NutrientKey } from '../domain/nutrients'
import { FOOD_SOURCE } from '../data/foods'
import { NumInput } from './components'
import { useOverrides, useProfile, type Overrides } from './hooks'
import { useNav } from './nav'
import { todayStr } from '../db/logic'

export function SettingsPage() {
  const nav = useNav()
  const saved = useProfile()
  const overrides = useOverrides()
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saved !== undefined && !loaded) {
      if (saved) setP(saved)
      setLoaded(true)
    }
  }, [saved, loaded])

  const valid = p.age >= 12 && p.age <= 120 && p.weightKg > 20 && p.heightCm > 100
  const targets = valid ? computeTargets(p) : null

  async function saveProfile() {
    if (!valid) return
    await setSetting('profile', p)
    nav.toast('プロフィールを保存しました')
  }

  async function setOverride(k: NutrientKey, field: 'min' | 'max' | 'goal', v: number | null) {
    const next: Overrides = { ...overrides }
    const cur: Partial<Target> = { ...(next[k] ?? {}) }
    if (v === null) delete cur[field]
    else cur[field] = v
    if (Object.keys(cur).length) next[k] = cur
    else delete next[k]
    await setSetting('targetOverrides', next)
  }

  async function doExport() {
    const blob = await exportBackup()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `食事記録バックアップ_${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport(file: File | undefined) {
    if (!file) return
    try {
      const { data, summary } = await readBackup(file)
      const ok = confirm(
        `バックアップ（${summary.exportedAt.slice(0, 10)}）を読み込みます。\n市販品 ${summary.products}件・マイ料理 ${summary.myDishes}件・記録 ${summary.logs}件\n\n今このアプリにあるデータはすべて置き換わります（元に戻せません）。よろしいですか？`,
      )
      if (!ok) return
      await restoreBackup(data)
      setLoaded(false)
      nav.toast('バックアップを読み込みました')
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function wipe() {
    if (!confirm('すべての記録・登録品・設定を削除します。元に戻せません。先にバックアップを書き出すことをおすすめします。削除しますか？')) return
    await Promise.all([db.logs.clear(), db.products.clear(), db.myDishes.clear(), db.settings.clear()])
    setLoaded(false)
    nav.toast('すべて削除しました')
  }

  const ovValue = (k: NutrientKey, f: 'min' | 'max' | 'goal') => (overrides[k]?.[f] as number | undefined) ?? null

  return (
    <div className="page">
      <section className="card">
        <h3>プロフィール</h3>
        <p className="hint">目標値の計算だけに使います。データはこの端末の中にだけ保存されます。</p>
        <div className="field">
          <span className="field-label">性別</span>
          <div className="seg">
            <button className={p.sex === 'male' ? 'on' : ''} onClick={() => setP({ ...p, sex: 'male' })}>
              男性
            </button>
            <button className={p.sex === 'female' ? 'on' : ''} onClick={() => setP({ ...p, sex: 'female' })}>
              女性
            </button>
          </div>
        </div>
        <div className="row3">
          <label className="field">
            <span className="field-label">年齢</span>
            <NumInput value={p.age} onChange={(v) => setP({ ...p, age: v ?? 0 })} />
          </label>
          <label className="field">
            <span className="field-label">身長 cm</span>
            <NumInput value={p.heightCm} onChange={(v) => setP({ ...p, heightCm: v ?? 0 })} />
          </label>
          <label className="field">
            <span className="field-label">体重 kg</span>
            <NumInput value={p.weightKg} onChange={(v) => setP({ ...p, weightKg: v ?? 0 })} />
          </label>
        </div>
        <div className="field">
          <span className="field-label">身体活動レベル</span>
          <div className="seg">
            {(
              [
                ['low', '低い', '座っていることが多い'],
                ['normal', 'ふつう', '通勤・通学・家事・軽い運動'],
                ['high', '高い', '立ち仕事や活発な運動習慣'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={p.activity === k ? 'on' : ''} onClick={() => setP({ ...p, activity: k })}>
                {l}
              </button>
            ))}
          </div>
          <span className="hint">
            {p.activity === 'low' ? '座っていることが多い' : p.activity === 'normal' ? '座りがちでも通勤・通学・家事・軽い運動あり' : '立ち仕事が多い、活発な運動習慣がある'}
          </span>
        </div>
        {p.sex === 'female' && (
          <label className="check">
            <input type="checkbox" checked={p.menstruation} onChange={(e) => setP({ ...p, menstruation: e.target.checked })} />
            月経あり（鉄の推奨量が変わります）
          </label>
        )}
        {p.age > 0 && p.age < 12 && <p className="warn">このアプリの目標値は12歳以上向けです。</p>}
        {valid && (
          <p className="ok-note">
            年齢区分 {AGE_GROUPS[ageGroupIndex(p.age)]}歳・推定エネルギー必要量 約{estimatedEnergy(p)} kcal/日
            {p.heightCm > 0 && `・BMI ${(p.weightKg / (p.heightCm / 100) ** 2).toFixed(1)}`}
          </p>
        )}
        <button className="btn primary wide" disabled={!valid} onClick={saveProfile}>
          保存
        </button>
      </section>

      {targets && saved && (
        <section className="card">
          <h3>1日の目標値</h3>
          <p className="hint">「日本人の食事摂取基準（2025年版）」から自動で計算しています。数字を入れると自分の目標で上書きできます（空欄で自動に戻る）。</p>
          <table className="ntable targets">
            <thead>
              <tr>
                <th>栄養素</th>
                <th>自動</th>
                <th>上書き（以上 / 未満）</th>
              </tr>
            </thead>
            <tbody>
              {NUTRIENTS.map((n) => {
                const t = targets[n.key]
                const auto =
                  t?.goal !== undefined
                    ? `${formatValue(n.key, t.goal)}`
                    : [t?.min !== undefined ? `${formatValue(n.key, t.min)}以上` : '', t?.max !== undefined ? `${formatValue(n.key, t.max)}未満` : ''].filter(Boolean).join(' / ')
                return (
                  <tr key={n.key}>
                    <th>
                      {n.label}
                      <small> {n.unit}</small>
                      {t?.kind && <div className="muted tiny">{t.kind}</div>}
                    </th>
                    <td>{auto || '—'}</td>
                    <td className="ov">
                      {t?.goal !== undefined ? (
                        <NumInput value={ovValue(n.key, 'goal')} onChange={(v) => setOverride(n.key, 'goal', v)} placeholder="目標" />
                      ) : (
                        <>
                          <NumInput value={ovValue(n.key, 'min')} onChange={(v) => setOverride(n.key, 'min', v)} placeholder="以上" />
                          <NumInput value={ovValue(n.key, 'max')} onChange={(v) => setOverride(n.key, 'max', v)} placeholder="未満" />
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h3>バックアップ</h3>
        <p className="hint">データはこのブラウザの中にだけあります。機種変更やブラウザのデータ削除に備えて、ときどき書き出してください。</p>
        <div className="row">
          <button className="btn" onClick={doExport}>
            書き出す（JSON）
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            読み込む
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </div>
        <button className="btn danger small" onClick={wipe}>
          すべてのデータを削除
        </button>
      </section>

      <section className="card credits">
        <h3>データの出典</h3>
        <p>
          食品の栄養成分: 文部科学省「{FOOD_SOURCE.replace('（文部科学省）', '')}」（政府標準利用規約に基づき利用・加工）。
          標準の料理は同成分表の値と一般的なレシピから計算した目安です。
        </p>
        <p>目標値: 厚生労働省「日本人の食事摂取基準（2025年版）」。妊娠・授乳中の付加量や持病のある方の制限には対応していません。</p>
        <p>このアプリは医療上の助言を行うものではありません。</p>
      </section>
    </div>
  )
}
