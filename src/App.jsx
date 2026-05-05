import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import GameTab from './components/GameTab'
import InventoryTab from './components/InventoryTab'
import SalesLogTab from './components/SalesLogTab'
import { Spinner } from './components/UI'
import styles from './App.module.css'

function IconGame({ active }) {
  const c = active ? 'var(--amber)' : 'var(--cream-dim)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C8.5 3 4 7 4 12s3.5 9 8 9 8-4 8-9-4.5-9-8-9z"/>
      <line x1="8" y1="12" x2="11" y2="12"/>
      <line x1="9.5" y1="10.5" x2="9.5" y2="13.5"/>
      <circle cx="15" cy="10.5" r="0.9" fill={c} stroke="none"/>
      <circle cx="15" cy="13.5" r="0.9" fill={c} stroke="none"/>
    </svg>
  )
}

function IconInventory({ active }) {
  const c = active ? 'var(--amber)' : 'var(--cream-dim)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 4H8L9 3z"/>
      <path d="M8 7c0 0-1 1.5-1 5s1 7 1 7h6s1-3 1-7-1-5-1-5"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}

function IconSales({ active }) {
  const c = active ? 'var(--amber)' : 'var(--cream-dim)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="8" y1="17" x2="8" y2="12"/>
      <line x1="12" y1="17" x2="12" y2="9"/>
      <line x1="16" y1="17" x2="16" y2="13"/>
    </svg>
  )
}

const TABS = [
  { id: 'game',      label: 'Game',      Icon: IconGame },
  { id: 'inventory', label: 'Inventory', Icon: IconInventory },
  { id: 'sales',     label: 'Sales',     Icon: IconSales },
]

function getHashTab() {
  const hash = window.location.hash.replace('#/', '')
  return TABS.some(t => t.id === hash) ? hash : 'game'
}

export default function App() {
  const [tab, setTab] = useState(getHashTab)

  function navigate(id) {
    setTab(id)
    window.location.hash = `/${id}`
  }

  useEffect(() => {
    const onHash = () => setTab(getHashTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const [inventory, setInventory] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: inv }, { data: sal }] = await Promise.all([
      supabase.from('inventory').select('*').order('bottle'),
      supabase.from('sales').select('*').order('date', { ascending: false }),
    ])
    setInventory(inv || [])
    setSales(sal || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logoFlame}>🔥</span>
          <div>
            <div className={styles.logoTitle}>Fireball Board</div>
            <div className={styles.logoSub}>Bourbon Game Manager</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {tab === 'game' && (
              <GameTab inventory={inventory} sales={sales} onGameEnd={fetchAll} />
            )}
            {tab === 'inventory' && (
              <InventoryTab inventory={inventory} onRefresh={fetchAll} />
            )}
            {tab === 'sales' && (
              <SalesLogTab sales={sales} loading={false} />
            )}
          </>
        )}
      </main>

      <nav className={styles.tabBar}>
        <div className={styles.tabBarInner}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            >
              <span className={styles.tabIcon}>
                <t.Icon active={tab === t.id} />
              </span>
              <span className={styles.tabName}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
