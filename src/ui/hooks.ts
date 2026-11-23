import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { applyOverrides, computeTargets, type Profile, type Target, type Targets } from '../domain/targets'
import type { NutrientKey } from '../domain/nutrients'

export type Overrides = Partial<Record<NutrientKey, Partial<Target>>>

/** undefined = 読み込み中, null = 未設定 */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => ((await db.settings.get('profile'))?.value as Profile | undefined) ?? null, [])
}

export function useOverrides(): Overrides {
  return useLiveQuery(async () => ((await db.settings.get('targetOverrides'))?.value as Overrides | undefined) ?? {}, []) ?? {}
}

export function useTargets(): Targets | null {
  const profile = useProfile()
  const overrides = useOverrides()
  if (!profile) return null
  return applyOverrides(computeTargets(profile), overrides)
}
