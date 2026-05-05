import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionHeader, Label, Input, Select, PrimaryBtn, SecondaryBtn, CopyBtn, Toggle, Card } from './UI'
import { bottleLabel } from '../lib/bottleLabel'
import styles from './GameTab.module.css'

function getMidEve() {
  return new Date().getHours() < 12 ? 'Mid' : 'Eve'
}
function getDateStr() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function modeLabel(m) {
  return m === 'multi' ? 'Fireball Multi' : m === 'ducks' ? 'Duck Race' : 'Fireball Single'
}
function formatBottles(bottles) {
  if (!Array.isArray(bottles)) return bottles
  const counts = {}
  bottles.forEach(b => { counts[b] = (counts[b] || 0) + 1 })
  return Object.entries(counts)
    .map(([name, count]) => count > 1 ? `${count}× ${name}` : name)
    .join(' + ')
}
function toDateInput(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

export default function GameTab({ inventory, sales, onGameEnd }) {
  const [view, setView] = useState('list') // list | select | setup | active
  const [mode, setMode] = useState(null)   // 'single' | 'multi' | 'ducks'
  const [selectedBottle, setSelectedBottle] = useState('')
  const [singleQty, setSingleQty] = useState(1)
  const [multiBottles, setMultiBottles] = useState(['', '', '', ''])
  const [twoPrice, setTwoPrice] = useState(false)
  const [price1, setPrice1] = useState('')
  const [price2, setPrice2] = useState('')
  const [template, setTemplate] = useState('')
  const [duckCount, setDuckCount] = useState(10)
  const [duckSlotCount, setDuckSlotCount] = useState(1)
  const [duckList, setDuckList] = useState('')
  const [soldFor, setSoldFor] = useState('')
  const [copied, setCopied] = useState('')
  const [gameBottles, setGameBottles] = useState([])
  const [activeGameId, setActiveGameId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingGameId, setEditingGameId] = useState(null)
  const [editSoldFor, setEditSoldFor] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const available = inventory.filter(b => b.quantity > 0)

  function reset() {
    setView('list')
    setMode(null)
    setSelectedBottle('')
    setSingleQty(1)
    setMultiBottles(['', '', '', ''])
    setTwoPrice(false)
    setPrice1('')
    setPrice2('')
    setTemplate('')
    setDuckList('')
    setSoldFor('')
    setGameBottles([])
    setActiveGameId(null)
  }

  function calcPrices(bottle, two, qty = 1) {
    const b = inventory.find(x => x.bottle === bottle)
    if (!b) return { p1: '', p2: '' }
    const base = Math.round(b.value * qty / 10)
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
    setSingleQty(1)
    setMultiBottles(['', '', '', ''])
    setPrice1('')
    setPrice2('')
    setTwoPrice(false)
    setDuckCount(10)
    setDuckSlotCount(1)
    setView('setup')
  }

  function removeDuckSlot(idx) {
    const updated = [...multiBottles]
    updated.splice(idx, 1)
    updated.push('')
    setMultiBottles(updated)
    setDuckSlotCount(c => c - 1)
  }

  function handleBottleSelect(bottle) {
    setSelectedBottle(bottle)
    const { p1, p2 } = calcPrices(bottle, twoPrice, singleQty)
    setPrice1(p1)
    setPrice2(p2)
  }

  function handleSingleQtyChange(qty) {
    setSingleQty(qty)
    if (selectedBottle) {
      const { p1, p2 } = calcPrices(selectedBottle, twoPrice, qty)
      setPrice1(p1)
      setPrice2(p2)
    }
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
      const { p1, p2 } = calcPrices(selectedBottle, val, singleQty)
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
      const label = b ? bottleLabel(b) : selectedBottle
      bottleLine = singleQty > 1 ? `${singleQty}× ${label}` : label
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

  async function startGame() {
    const bottles = mode === 'single'
      ? Array(singleQty).fill(selectedBottle)
      : multiBottles.filter(Boolean)

    const count = mode === 'ducks' ? duckCount : 10
    const list = Array.from({ length: count }, (_, i) => `${i}.`).join('\n')
    setDuckList(list)
    setGameBottles(bottles)

    if (mode !== 'ducks') {
      setTemplate(buildTemplate(bottles))
    }

    setSoldFor('')
    setView('active')

    const { data } = await supabase.from('sales').insert({
      bottles,
      mode,
      sold_for: -1,
      date: new Date().toISOString(),
    }).select().single()

    if (data) {
      setActiveGameId(data.id)
      onGameEnd(true)
    }
  }

  async function endGame() {
    const amount = parseFloat(soldFor)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      const usedIds = new Set()
      for (const bottleName of gameBottles) {
        const bottle = inventory.find(b => b.bottle === bottleName && !usedIds.has(b.id) && b.quantity > 0)
        if (!bottle) continue
        usedIds.add(bottle.id)
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
      if (activeGameId) {
        await supabase.from('sales').update({ sold_for: amount }).eq('id', activeGameId)
      } else {
        await supabase.from('sales').insert({
          bottles: gameBottles,
          mode,
          sold_for: amount,
          date: new Date().toISOString(),
        })
      }
      onGameEnd()
      reset()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function startEditGame(s) {
    setEditingGameId(s.id)
    setEditSoldFor(s.sold_for < 0 ? '' : s.sold_for)
    setEditDate(toDateInput(s.date))
  }

  async function saveGameEdit(id) {
    const amount = parseFloat(editSoldFor)
    if (isNaN(amount) || amount < 0) return
    setEditSaving(true)
    const updates = { sold_for: amount }
    if (editDate) updates.date = new Date(editDate + 'T12:00:00').toISOString()
    await supabase.from('sales').update(updates).eq('id', id)
    setEditSaving(false)
    setEditingGameId(null)
    onGameEnd()
  }

  async function deleteGame(id) {
    await supabase.from('sales').delete().eq('id', id)
    onGameEnd()
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const canStart = mode === 'single'
    ? selectedBottle && price1
    : mode === 'ducks'
      ? multiBottles.filter(Boolean).length >= 1
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
            {sales.map(s => {
              const isActive = s.sold_for < 0
              return (
                <div key={s.id} className={styles.gameCard}>
                  {editingGameId === s.id ? (
                    <div>
                      <div className={styles.gameBottles} style={{ marginBottom: 10 }}>
                        {formatBottles(s.bottles)}
                      </div>
                      <div className={styles.gameEditRow}>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span className={styles.dollarSign}>$</span>
                          <Input
                            type="number"
                            value={editSoldFor}
                            onChange={e => setEditSoldFor(e.target.value)}
                            placeholder="0"
                            style={{ paddingLeft: 24 }}
                            autoFocus
                          />
                        </div>
                        <PrimaryBtn onClick={() => saveGameEdit(s.id)} disabled={editSoldFor === '' || editSaving}>
                          {editSaving ? '...' : '✓'}
                        </PrimaryBtn>
                        <SecondaryBtn onClick={() => setEditingGameId(null)}>✕</SecondaryBtn>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.gameCardMain}>
                      <div className={styles.gameCardInfo}>
                        <div className={styles.gameBottles}>
                          {formatBottles(s.bottles)}
                        </div>
                        <div className={styles.gameMeta}>
                          {new Date(s.date).toLocaleDateString()} · {modeLabel(s.mode)}
                        </div>
                      </div>
                      <div className={styles.gameCardRight}>
                        <div className={styles.gameCardAmountRow}>
                          {!isActive && (
                            <span className={styles.gameAmount}>${Number(s.sold_for).toLocaleString()}</span>
                          )}
                          <span className={isActive ? styles.gameActiveBadge : styles.gameCompleteBadge}>
                            {isActive ? 'Active' : 'Complete'}
                          </span>
                        </div>
                        <div className={styles.gameActions}>
                          {!isActive && (
                            <button className={styles.gameActionBtn} onClick={() => startEditGame(s)}>✏</button>
                          )}
                          {isActive && (
                            <button className={styles.gameActionBtn} onClick={() => deleteGame(s.id)}>🗑</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
          <ModeCard onClick={() => handleModeSelect('single')} icon="🔥" label="Fireball Single" sub="1+ bottles · 10 spots" />
          <ModeCard onClick={() => handleModeSelect('multi')} icon="🔥" label="Fireball Multi" sub="4 bottles · 10 spots" />
          <ModeCard onClick={() => handleModeSelect('ducks')} icon="🦆" label="Duck Race" sub="multi bottle · custom spots" wide />
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
        {mode === 'single' ? (
          <div className={styles.field}>
            <Label>Select Bottle</Label>
            <div className={styles.singleBottleRow}>
              <Select value={selectedBottle} onChange={e => handleBottleSelect(e.target.value)} style={{ flex: 1 }}>
                <option value="">— Choose —</option>
                {available.map(b => (
                  <option key={b.id} value={b.bottle}>{bottleLabel(b)} (qty: {b.quantity})</option>
                ))}
              </Select>
              <div className={styles.qtyWrap}>
                <Label style={{ fontSize: '0.65rem', marginBottom: 4 }}>Qty</Label>
                <Input
                  type="number"
                  value={singleQty}
                  min={1}
                  max={20}
                  onChange={e => handleSingleQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 64, textAlign: 'center' }}
                />
              </div>
            </div>
          </div>
        ) : mode === 'multi' ? (
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
            <Label>Select Bottles</Label>
            {Array.from({ length: duckSlotCount }, (_, i) => (
              <div key={i} className={styles.duckSlotRow}>
                <Select
                  value={multiBottles[i]}
                  onChange={e => handleMultiSelect(i, e.target.value)}
                >
                  <option value="">— Bottle {i + 1} —</option>
                  {available.map(b => (
                    <option key={b.id} value={b.bottle}>{bottleLabel(b)} (qty: {b.quantity})</option>
                  ))}
                </Select>
                {duckSlotCount > 1 && (
                  <button className={styles.removeSlotBtn} onClick={() => removeDuckSlot(i)}>✕</button>
                )}
              </div>
            ))}
            {duckSlotCount < 4 && (
              <button className={styles.addSlotBtn} onClick={() => setDuckSlotCount(c => c + 1)}>
                + Add Bottle
              </button>
            )}
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
      <div className={styles.backRow}>
        <button onClick={reset} className={styles.backBtn}>← Games</button>
        <SectionHeader style={{ margin: 0 }}>
          {isDucks ? '🦆 Race Active' : '🔥 Game Active'}
        </SectionHeader>
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

      {isDucks && (
        <Card style={{ marginBottom: 20 }}>
          <div className={styles.blockHeader}>
            <Label style={{ margin: 0 }}>🦆 Duck List</Label>
            <CopyBtn onClick={() => copyText(duckList, 'duck')} copied={copied === 'duck'} />
          </div>
          <pre className={styles.pre} style={{ maxHeight: 220, overflowY: 'auto' }}>{duckList}</pre>
        </Card>
      )}

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
