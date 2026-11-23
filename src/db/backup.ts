import { db } from './db'

const FORMAT = 'shokuji-app-backup'

export async function exportBackup(): Promise<Blob> {
  const data = {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    products: await db.products.toArray(),
    myDishes: await db.myDishes.toArray(),
    logs: await db.logs.toArray(),
    settings: await db.settings.toArray(),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

export interface BackupSummary {
  products: number
  myDishes: number
  logs: number
  exportedAt: string
}

export async function readBackup(file: Blob): Promise<{ data: any; summary: BackupSummary }> {
  const data = JSON.parse(await file.text())
  if (data?.format !== FORMAT) throw new Error('このアプリのバックアップファイルではありません')
  for (const k of ['products', 'myDishes', 'logs', 'settings']) {
    if (!Array.isArray(data[k])) throw new Error(`バックアップの形式が正しくありません（${k}）`)
  }
  return {
    data,
    summary: {
      products: data.products.length,
      myDishes: data.myDishes.length,
      logs: data.logs.length,
      exportedAt: data.exportedAt,
    },
  }
}

/** 今のデータを全部消してバックアップの内容に置き換える */
export async function restoreBackup(data: any) {
  await db.transaction('rw', [db.products, db.myDishes, db.logs, db.settings], async () => {
    await Promise.all([db.products.clear(), db.myDishes.clear(), db.logs.clear(), db.settings.clear()])
    await db.products.bulkAdd(data.products)
    await db.myDishes.bulkAdd(data.myDishes)
    await db.logs.bulkAdd(data.logs)
    await db.settings.bulkAdd(data.settings)
  })
}
