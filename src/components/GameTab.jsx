import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionHeader, Label, Input, Select, PrimaryBtn, CopyBtn, Toggle, Card } from './UI'
import { bottleLabel } from '../lib/bottleLabel'
import styles from './GameTab.module.css'

function getMidEve() {
  return new Date().getHours() < 12 ? 'Mid' : 'Eve'
}
function getDateStr() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function GameTab({ inventory, sales, onGameEnd }) {
  const [view, setView] = useState('list') // list | select | setup | active
  const [mode, setMode] = useState(null)   // 'single' | 'multi' | 'ducks'
  const [selectedBottle, setSelectedBottle] = useState('')
  const [multiBottles, setMultiBottles] = useState(['', '', '', ''])
  const [twoPrice, setTwoPrice] = useState(false)
  const [price1, setPrice1] = useState('')
  const [price2, setPrice2] = useState('')
  const [template, setTemplate] = useState('')
  const [duckCount, setDuckCount] = useState(10)
  const [duckList, setDuckList] = useState('')
  const [soldFor, setSoldFor] = useState('')
  const [copied, setCopied] = useState('')
  const [gameBottles, setGameBottles] = useState([])
  const [saving, setSaving] = useState(false)

  const available = inventory.filter(b => b.quantity > 0)

  function reset() {
    setView('list')
    setMode(null)
    setSelectedBottle('')
    setMultiBottles(['', '', '', ''])
    setTwoPrice(false)
    setPrice1('')
    setPrice2('')
    setTemplate('')
    setDuckList('')
    setSoldFor('')
    setGameBottles([])
  }

  function calcPrices(bottle, two) {
    const b = inventory.find(x => x.bottle === bottle)
    if (!b) return { p1: '', p2: '' }
    const base = Math.round(b.paid / 10)
    return two
      ? { p1: String(Math.round(base * 1.3)), p2: String(base) }
      : { p1: String(base), p2: '' }
  }

  function calcMultiPrices(bottles, two) {
    const found = bottles.map(n => inventory.find(b => b.bottle === n)).filter(Boolean)
    if (!found.length) return { p1: '', p2: '' }
    const total = found.reduce((s, b) => s + b.value, 0)
    const base = Math.round(total / 10)
    return two
      ? { p1: String(Math.round(base * 1.3)), p2: String(base) }
      : { p1: String(base), p2: '' }
  }

  function handleModeSelect(m) {
    setMode(m)
    setSelectedBottle('')
    setMultiBottles(['', '', '', ''])
    setPrice1('')
    setPrice2('')
    setTwoPrice(false)
    setDuckCount(10)
    setView('setup')
  }

  function handleBottleSelect(bottle) {
    setSelectedBottle(bottle)
    const { p1, p2 } = calcPrices(bottle, twoPrice)
    setPrice1(p1)
    setPrice2(p2)
  }

  function handleMultiSelect(idx, val) {
    const updated = [...multiBottles]
    updated[idx] = val
    setMultiBottles(updated)
    const { p1, p2 } = calcMultiPrices(updated, twoPrice)
    setPrice1(p1)
    setPrice2(p2)
  }

  function handleTwoPriceToggle(val) {
    setTwoPrice(val)
    if (mode === 'single' && selectedBottle) {
      const { p1, p2 } = calcPrices(selectedBottle, val)
      setPrice1(p1); setPrice2(p2)
    } else if (mode === 'multi') {
      const { p1, p2 } = calcMultiPrices(multiBottles, val)
      setPrice1(p1); setPrice2(p2)
    }
  }

  function buildTemplate(bottles) {
    const date = getDateStr()
    const time = getMidEve()
    let bottleLine = ''
    if (mode === 'single') {
      const b = inventory.find(x => x.bottle === selectedBottle)
      bottleLine = b ? bottleLabel(b) : selectedBottle
    } else {
      bottleLine = bottles
        .map(name => {
          const b = inventory.find(x => x.bottle === name)
          return b ? `${bottleLabel(b)} ($${Math.round(b.value / 10)})` : null
        })
        .filter(Boolean)
        .join('\n')
    }
    const sipLine = twoPrice
      ? `${price1} ☝️\n${price2} ✌️`
      : `${price1} 🥃`
    return `${date} ${time}🔥\n${bottleLine}\n\n${sipLine}\n\nSip info posted below board after live.\n\n🥩 in SE SGF any time`
  }

  function startGame() {
    const bottles = mode === 'single'
      ? [selectedBottle]
      : mode === 'multi'
        ? multiBottles.filter(Boolean)
        : [selectedBottle]

    const count = mode === 'ducks' ? duckCount : 10
    const list = Array.from({ length: count }, (_, i) => `${i}.`).join('\n')
    setDuckList(list)
    setGameBottles(bottles)

    if (mode !== 'ducks') {
      setTemplate(buildTemplate(bottles))
    }

    setView('active')
    setSoldFor('')
  }

  async function endGame() {
    const amount = parseFloat(soldFor)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      for (const bottleName of gameBottles) {
        const bottle = inventory.find(b => b.bottle === bottleName)
        if (!bottle) continue
        const newQty = Math.max(0, bottle.quantity - 1)
        await supabase
          .from('inventory')
          .update({
            quantity: newQty,
            total_paid: bottle.paid * newQty,
            total_value: bottle.value * newQty,
            profit: (bottle.value - bottle.paid) * newQty,
          })
          .eq('id', bottle.id)
      }
      await supabase.from('sales').insert({
        bottles: gameBottles,
        mode,
        sold_for: amount,
        date: new Date().toISOString(),
      })
      onGameEnd()
      reset()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const canStart = mode === 'single' || mode === 'ducks'
    ? selectedBottle && (mode === 'ducks' || price1)
    : multiBottles.filter(Boolean).length >= 2 && price1

  // ── List view ──────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="fade-up">
        <div className={styles.listHeader}>
          <SectionHeader style={{ margin: 0 }}>Games</SectionHeader>
          <PrimaryBtn onClick={() => setView('select')}>+ Create New</PrimaryBtn>
        </div>
        {sales.length === 0 ? (
          <div className={styles.empty}>No games yet. Create one!</div>
        ) : (
          <div className={styles.gameList}>
            {sales.map(s => (
              <div key={s.id} className={styles.gameCard}>
                <div className={styles.gameCardMain}>
                  <div>
                    <div className={styles.gameBottles}>
                      {Array.isArray(s.bottles) ? s.bottles.join(' + ') : s.bottles}
                    </div>
                    <div className={styles.gameMeta}>
                      {new Date(s.date).toLocaleDateString()} · {s.mode === 'multi' ? 'Fireball Multi' : s.mode === 'ducks' ? 'Duck Race' : 'Fireball Single'}
                    </div>
                  </div>
                  <div className={styles.gameAmount}>${s.sold_for.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Select view ────────────────────────────────────────────────
  if (view === 'select') {
    return (
      <div className="fade-up">
        <div className={styles.backRow}>
          <button onClick={reset} className={styles.backBtn}>← Back</button>
          <SectionHeader style={{ margin: 0 }}>New Game</SectionHeader>
        </div>
        <div className={styles.modeGrid}>
          <ModeCard onClick={() => handleModeSelect('single')} icon="🔥" label="Fireball Single" sub="1 bottle · 10 spots" />
          <ModeCard onClick={() => handleModeSelect('multi')} icon="🔥" label="Fireball Multi" sub="4 bottles · 10 spots" />
          <ModeCard onClick={() => handleModeSelect('ducks')} icon="🦆" label="Duck Race" sub="1 bottle · custom spots" wide />
        </div>
      </div>
    )
  }

  // ── Setup view ─────────────────────────────────────────────────
  if (view === 'setup') {
    const title = mode === 'single' ? 'Fireball Single' : mode === 'multi' ? 'Fireball Multi' : 'Duck Race'
    return (
      <div className="fade-up">
        <div className={styles.backRow}>
          <button onClick={() => setView('select')} className={styles.backBtn}>← Back</button>
          <SectionHeader style={{ margin: 0 }}>{title}</SectionHeader>
        </div>

        {/* Bottle selection */}
        {mode === 'multi' ? (
          <div className={styles.field}>
            <Label>Select 4 Bottles</Label>
            {[0, 1, 2, 3].map(i => (
              <Select
                key={i}
                value={multiBottles[i]}
                onChange={e => handleMultiSelect(i, e.target.value)}
                style={{ marginBottom: 8 }}
              >
                <option value="">— Bottle {i + 1} —</option>
                {available.map(b => (
                  <option key={b.id} value={b.bottle}>{bottleLabel(b)} (qty: {b.quantity})</option>
                ))}
              </Select>
            ))}
          </div>
        ) : (
          <div className={styles.field}>
            <Label>Select Bottle</Label>
            <Select value={selectedBottle} onChange={e => handleBottleSelect(e.target.value)}>
              <option value="">— Choose —</option>
              {available.map(b => (
                <option key={b.id} value={b.bottle}>{bottleLabel(b)} (qty: {b.quantity})</option>
              ))}
            </Select>
          </div>
        )}

        {/* Pricing — fireball only */}
        {mode !== 'ducks' && (
          <>
            <div className={styles.toggleRow}>
              <Label style={{ margin: 0 }}>Two-price game?</Label>
              <Toggle value={twoPrice} onChange={handleTwoPriceToggle} />
            </div>
            <div className={styles.priceRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <Label>{twoPrice ? 'Price ☝️' : 'Price 🥃'}</Label>
                <Input type="number" value={price1} onChange={e => setPrice1(e.target.value)} placeholder="$" />
              </div>
              {twoPrice && (
                <div className={styles.field} style={{ flex: 1 }}>
                  <Label>Price ✌️</Label>
                  <Input type="number" value={price2} onChange={e => setPrice2(e.target.value)} placeholder="$" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Duck count — duck race only */}
        {mode === 'ducks' && (
          <div className={styles.field}>
            <Label>Number of Spots</Label>
            <Input
              type="number"
              value={duckCount}
              onChange={e => setDuckCount(parseInt(e.target.value) || 10)}
              min={1} max={99}
              style={{ maxWidth: 120 }}
            />
          </div>
        )}

        <PrimaryBtn onClick={startGame} disabled={!canStart} style={{ width: '100%', marginTop: 8 }}>
          {mode === 'ducks' ? '🦆 Start Race' : '🔥 Start Game'}
        </PrimaryBtn>
      </div>
    )
  }

  // ── Active view ────────────────────────────────────────────────
  const isDucks = mode === 'ducks'
  return (
    <div className="fade-up">
      <div className={styles.activeHeader}>
        <SectionHeader style={{ margin: 0 }}>
          {isDucks ? '🦆 Race Active' : '🔥 Game Active'}
        </SectionHeader>
        <span className={styles.activePill}>{gameBottles.join(', ')}</span>
      </div>

      {!isDucks && (
        <Card style={{ marginBottom: 14 }}>
          <div className={styles.blockHeader}>
            <Label style={{ margin: 0 }}>🔥 Fireball Template</Label>
            <CopyBtn onClick={() => copyText(template, 'tmpl')} copied={copied === 'tmpl'} />
          </div>
          <pre className={styles.pre}>{template}</pre>
        </Card>
      )}

      <Card style={{ marginBottom: 20 }}>
        <div className={styles.blockHeader}>
          <Label style={{ margin: 0 }}>🦆 {isDucks ? 'Duck List' : 'Spots'}</Label>
          <CopyBtn onClick={() => copyText(duckList, 'duck')} copied={copied === 'duck'} />
        </div>
        <pre className={styles.pre} style={{ maxHeight: 220, overflowY: 'auto' }}>{duckList}</pre>
      </Card>

      <Card style={{ borderColor: 'var(--border-hot)' }}>
        <Label>{isDucks ? 'Race ran for...' : 'Bottle ran for...'}</Label>
        <div className={styles.endRow}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className={styles.dollarSign}>$</span>
            <Input
              type="number"
              value={soldFor}
              onChange={e => setSoldFor(e.target.value)}
              placeholder="0"
              style={{ paddingLeft: 24 }}
            />
          </div>
          <PrimaryBtn onClick={endGame} disabled={!soldFor || saving}>
            {saving ? 'Saving...' : isDucks ? 'End Race' : 'End Game'}
          </PrimaryBtn>
        </div>
      </Card>
    </div>
  )
}

function ModeCard({ onClick, icon, label, sub, wide }) {
  return (
    <button onClick={onClick} className={`${styles.modeCard} ${wide ? styles.modeCardWide : ''}`}>
      <div className={styles.modeIcon}>{icon}</div>
      <div className={styles.modeLabel}>{label}</div>
      <div className={styles.modeSub}>{sub}</div>
    </button>
  )
}
