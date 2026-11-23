import { useCallback, useMemo, useRef, useState } from 'react'
import { NavContext, type Nav, type Overlay } from './ui/nav'
import { TodayPage } from './ui/TodayPage'
import { AddSheet } from './ui/AddSheet'
import { AmountSheet } from './ui/AmountSheet'
import { ProductEditor } from './ui/ProductEditor'
import { MyDishEditor } from './ui/MyDishEditor'
import { ScanSheet } from './ui/ScanSheet'
import { ItemsPage } from './ui/ItemsPage'
import { HistoryPage } from './ui/HistoryPage'
import { SettingsPage } from './ui/SettingsPage'
import { todayStr } from './db/logic'

type Tab = 'today' | 'history' | 'items' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: '記録', icon: '🍚' },
  { key: 'history', label: '履歴', icon: '📈' },
  { key: 'items', label: '登録品', icon: '🏷️' },
  { key: 'settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayStr())
  const [stack, setStack] = useState<{ id: number; o: Overlay }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const seq = useRef(0)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const nav = useMemo<Nav>(
    () => ({
      push: (o) => setStack((s) => [...s, { id: ++seq.current, o }]),
      pop: () => setStack((s) => s.slice(0, -1)),
      replace: (o) => setStack((s) => [...s.slice(0, -1), { id: ++seq.current, o }]),
      closeAll: () => setStack([]),
      toast: showToast,
    }),
    [showToast],
  )

  const title = { today: '食事の記録', history: '履歴', items: '登録品', settings: '設定' }[tab]

  return (
    <NavContext.Provider value={nav}>
      <div className="app" aria-hidden={stack.length > 0}>
        <header className="topbar">
          <h1>{title}</h1>
        </header>
        <main>
          {tab === 'today' && <TodayPage date={date} setDate={setDate} goSettings={() => setTab('settings')} />}
          {tab === 'history' && (
            <HistoryPage
              openDay={(d) => {
                setDate(d)
                setTab('today')
              }}
            />
          )}
          {tab === 'items' && <ItemsPage />}
          {tab === 'settings' && <SettingsPage />}
        </main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {stack.map(({ id, o }) => (
        <div key={id} className="overlay">
          {o.type === 'add' && <AddSheet date={o.date} meal={o.meal} />}
          {o.type === 'amount' && <AmountSheet {...o} />}
          {o.type === 'product' && <ProductEditor product={o.product} barcode={o.barcode} afterSave={o.afterSave} />}
          {o.type === 'myDish' && <MyDishEditor dish={o.dish} fromPresetId={o.fromPresetId} afterSave={o.afterSave} />}
          {o.type === 'scan' && <ScanSheet onCode={o.onCode} />}
        </div>
      ))}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </NavContext.Provider>
  )
}
