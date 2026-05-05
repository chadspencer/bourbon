import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionHeader, Label, Input, Select, PrimaryBtn, SecondaryBtn, CopyBtn, Toggle, Card } from './UI'
import styles from './GameTab.module.css'

function getMidEve() {
  return new Date().getHours() < 12 ? 'Mid' : 'Eve'
}
function getDateStr() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function GameTab({ inventory, onGameEnd }) {
  const [mode, setMode] = useState(null)
  const [gameActive, setGameActive] = useState(false)
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
    setTemplate('')
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
      bottleLine = selectedBottle
    } else {
      bottleLine = bottles
        .map(name => {
          const b = inventory.find(x => x.bottle === name)
          return b ? `${b.bottle} ($${Math.round(b.value / 10)})` : null
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
    const bottles = mode === 'single' ? [selectedBottle] : multiBottles.filter(Boolean)
    const tmpl = buildTemplate(bottles)
    const list = Array.from({ length: duckCount }, (_, i) => `${i}.`).join('\n')
    setTemplate(tmpl)
    setDuckList(list)
    setGameBottles(bottles)
    setGameActive(true)
    setSoldFor('')
  }

  async function endGame() {
    const amount = parseFloat(soldFor)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      // Decrease quantity for each bottle used
      for (const bottleName of gameBottles) {
        const bottle = inventory.find(b => b.bottle === bottleName)
        if (!bottle) continue
        const newQty = Math.max(0, bottle.quantity - 1)
        const totalPaid = bottle.paid * newQty
        const totalValue = bottle.value * newQty
        await supabase
          .from('inventory')
          .update({
            quantity: newQty,
            total_paid: totalPaid,
            total_value: totalValue,
            profit: totalValue - totalPaid,
          })
          .eq('id', bottle.id)
      }

      // Log the sale
      await supabase.from('sales').insert({
        bottles: gameBottles,
        mode,
        sold_for: amount,
        date: new Date().toISOString(),
      })

      onGameEnd()
      setGameActive(false)
      setMode(null)
      setTemplate('')
      setDuckList('')
      setSoldFor('')
      setGameBottles([])
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

  const canStart = mode === 'single'
    ? selectedBottle && price1
    : multiBottles.filter(Boolean).length >= 2 && price1

  return (
    <div className="fade-up">
      {!gameActive ? (
        <>
          {!mode ? (
            <>
              <SectionHeader>Start a Game</SectionHeader>
              <div className={styles.modeGrid}>
                <ModeCard onClick={() => handleModeSelect('single')} icon="🥃" label="Single" sub="1 bottle" />
                <ModeCard onClick={() => handleModeSelect('multi')} icon="🍾" label="Multi" sub="4 bottles" />
              </div>
            </>
          ) : (
            <>
              <div className={styles.backRow}>
                <button onClick={() => setMode(null)} className={styles.backBtn}>← Back</button>
                <SectionHeader style={{ margin: 0 }}>
                  {mode === 'single' ? 'Single Game' : 'Multi Game'}
                </SectionHeader>
              </div>

              {mode === 'single' ? (
                <div className={styles.field}>
                  <Label>Select Bottle</Label>
                  <Select value={selectedBottle} onChange={e => handleBottleSelect(e.target.value)}>
                    <option value="">— Choose —</option>
                    {available.map(b => (
                      <option key={b.id} value={b.bottle}>
                        {b.bottle} (qty: {b.quantity})
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
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
                        <option key={b.id} value={b.bottle}>
                          {b.bottle} (qty: {b.quantity})
                        </option>
                      ))}
                    </Select>
                  ))}
                </div>
              )}

              <div className={styles.toggleRow}>
                <Label style={{ margin: 0 }}>Two-price game?</Label>
                <Toggle value={twoPrice} onChange={handleTwoPriceToggle} />
              </div>

              <div className={styles.priceRow}>
                <div className={styles.field} style={{ flex: 1 }}>
                  <Label>{twoPrice ? 'Price ☝️' : 'Price 🥃'}</Label>
                  <Input
                    type="number"
                    value={price1}
                    onChange={e => setPrice1(e.target.value)}
                    placeholder="$"
                  />
                </div>
                {twoPrice && (
                  <div className={styles.field} style={{ flex: 1 }}>
                    <Label>Price ✌️</Label>
                    <Input
                      type="number"
                      value={price2}
                      onChange={e => setPrice2(e.target.value)}
                      placeholder="$"
                    />
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <Label>Duck Count</Label>
                <Input
                  type="number"
                  value={duckCount}
                  onChange={e => setDuckCount(parseInt(e.target.value) || 10)}
                  min={1}
                  max={99}
                  style={{ maxWidth: 120 }}
                />
              </div>

              <PrimaryBtn onClick={startGame} disabled={!canStart} style={{ width: '100%', marginTop: 8 }}>
                🔥 Start Game
              </PrimaryBtn>
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.activeHeader}>
            <SectionHeader style={{ margin: 0 }}>🔥 Game Active</SectionHeader>
            <span className={styles.activePill}>{gameBottles.join(', ')}</span>
          </div>

          <Card style={{ marginBottom: 14 }}>
            <div className={styles.blockHeader}>
              <Label style={{ margin: 0 }}>🔥 Fireball Template</Label>
              <CopyBtn onClick={() => copyText(template, 'tmpl')} copied={copied === 'tmpl'} />
            </div>
            <pre className={styles.pre}>{template}</pre>
          </Card>

          <Card style={{ marginBottom: 20 }}>
            <div className={styles.blockHeader}>
              <Label style={{ margin: 0 }}>🦆 Duck List</Label>
              <CopyBtn onClick={() => copyText(duckList, 'duck')} copied={copied === 'duck'} />
            </div>
            <pre className={styles.pre} style={{ maxHeight: 220, overflowY: 'auto' }}>{duckList}</pre>
          </Card>

          <Card style={{ borderColor: 'var(--border-hot)' }}>
            <Label>Bottle ran for...</Label>
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
                {saving ? 'Saving...' : 'End Game'}
              </PrimaryBtn>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function ModeCard({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick} className={styles.modeCard}>
      <div className={styles.modeIcon}>{icon}</div>
      <div className={styles.modeLabel}>{label}</div>
      <div className={styles.modeSub}>{sub}</div>
    </button>
  )
}
