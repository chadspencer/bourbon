import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import GameTab from './components/GameTab'
import DucksTab from './components/DucksTab'
import InventoryTab from './components/InventoryTab'
import SalesLogTab from './components/SalesLogTab'
import { Spinner } from './components/UI'
import styles from './App.module.css'

const TABS = [
  { id: 'game',      label: '🎮',  name: 'Game' },
  { id: 'ducks',     label: '🦆',  name: 'Ducks' },
  { id: 'inventory', label: '📦',  name: 'Inventory' },
  { id: 'sales',     label: '📋',  name: 'Sales' },
]

export default function App() {
  const [tab, setTab] = useState('game')
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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoFlame}>🔥</span>
            <div>
              <div className={styles.logoTitle}>Fireball Board</div>
              <div className={styles.logoSub}>Bourbon Game Manager</div>
            </div>
          </div>
          <nav className={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              >
                <span className={styles.tabIcon}>{t.label}</span>
                <span className={styles.tabName}>{t.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className={styles.main}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {tab === 'game' && (
              <GameTab
                inventory={inventory}
                onGameEnd={fetchAll}
              />
            )}
            {tab === 'ducks' && <DucksTab />}
            {tab === 'inventory' && (
              <InventoryTab
                inventory={inventory}
                onRefresh={fetchAll}
              />
            )}
            {tab === 'sales' && (
              <SalesLogTab
                sales={sales}
                loading={false}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
