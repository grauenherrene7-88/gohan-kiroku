import { createContext, useContext } from 'react'
import type { Meal, MyDish, Product } from '../db/db'
import type { Candidate } from '../db/logic'

/** 画面の上に重ねて開く画面 */
export type Overlay =
  | { type: 'add'; date: string; meal: Meal }
  | { type: 'amount'; candidate: Candidate; date: string; meal: Meal; logId?: number; initialAmount?: number; initialUnit?: string }
  | { type: 'product'; product?: Product; barcode?: string; afterSave?: { date: string; meal: Meal } }
  | { type: 'myDish'; dish?: MyDish; fromPresetId?: string; afterSave?: { date: string; meal: Meal } }
  | { type: 'scan'; onCode: (code: string) => void }

export interface Nav {
  push(o: Overlay): void
  pop(): void
  /** 一番上を閉じてから別の画面を開く */
  replace(o: Overlay): void
  /** 全部閉じる */
  closeAll(): void
  toast(msg: string): void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav(): Nav {
  const n = useContext(NavContext)
  if (!n) throw new Error('NavContext がありません')
  return n
}
