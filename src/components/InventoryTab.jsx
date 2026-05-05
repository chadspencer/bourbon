import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { bottleLabel } from '../lib/bottleLabel'
import { SectionHeader, Label, Input, PrimaryBtn, SecondaryBtn, StatPill, Card } from './UI'
import styles from './InventoryTab.module.css'

function AddBottleForm({ existingNames, prefillName, saving, onSave, onCancel, form, setForm }) {
  const isNew = form.isNew || !prefillName && !form.bottle

  function handleNameSelect(val) {
    if (val === '__new__') {
      setForm({ ...form, bottle: '', isNew: true, newName: '' })
    } else {
      setForm({ ...form, bottle: val, isNew: false })
    }
  }

  const selectedVal = form.isNew ? '__new__' : (form.bottle || '')

  return (
    <Card style={{ borderColor: 'var(--border-hot)', marginTop: 8 }}>
      <Label>Bottle</Label>
      <select
        value={selectedVal}
        onChange={e => handleNameSelect(e.target.value)}
        style={{ marginBottom: 8 }}
        className={styles.nameSelect}
      >
        <option value="">— Select bottle —</option>
        {existingNames.map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
        <option value="__new__">+ New bottle name…</option>
      </select>

      {form.isNew && (
        <Input
          placeholder="Enter new bottle name"
          value={form.newName || ''}
          onChange={e => setForm({ ...form, newName: e.target.value })}
          style={{ marginBottom: 8 }}
        />
      )}

      <Input
        placeholder="Qualifier (batch, year, etc.) — optional"
        value={form.qualifier}
        onChange={e => setForm({ ...form, qualifier: e.target.value })}
        style={{ marginBottom: 8 }}
      />
      <div className={styles.newFormRow}>
        {[['Paid', 'paid'], ['Value', 'value']].map(([l, k]) => (
          <div key={k} style={{ flex: 1 }}>
            <Label style={{ fontSize: '0.65rem' }}>{l}</Label>
            <Input
              type="number"
              placeholder={l}
              value={form[k]}
              onChange={e => setForm({ ...form, [k]: e.target.value })}
              style={{ padding: '7px 9px' }}
            />
          </div>
        ))}
      </div>
      <div className={styles.addBtnRow}>
        <PrimaryBtn onClick={onSave} disabled={saving}>{saving ? 'Adding...' : 'Add Bottle'}</PrimaryBtn>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
      </div>
    </Card>
  )
}

function groupByName(inventory) {
  const map = {}
  inventory.forEach(b => {
    if (!map[b.bottle]) map[b.bottle] = []
    map[b.bottle].push(b)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

export default function InventoryTab({ inventory, onRefresh }) {
  const [expanded, setExpanded] = useState({})
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState({ bottle: '', isNew: false, qualifier: '', paid: '', value: '' })
  const [saving, setSaving] = useState(false)

  const totalPaid  = inventory.reduce((s, b) => s + b.paid  * b.quantity, 0)
  const totalValue = inventory.reduce((s, b) => s + b.value * b.quantity, 0)
  const totalProfit = totalValue - totalPaid

  const groups = groupByName(inventory)

  function toggleGroup(name) {
    setExpanded(e => ({ ...e, [name]: !e[name] }))
    setEditing(null)
  }

  function startEdit(b) {
    setEditing(b.id)
    setForm({ qualifier: b.qualifier || '', paid: b.paid, value: b.value })
  }

  async function saveEdit(b) {
    setSaving(true)
    await supabase.from('inventory').update({
      qualifier: form.qualifier.trim() || null,
      paid:  parseFloat(form.paid)  || b.paid,
      value: parseFloat(form.value) || b.value,
    }).eq('id', b.id)
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function deleteBottle(b) {
    await supabase.from('inventory').delete().eq('id', b.id)
    onRefresh()
  }

  async function addBottle() {
    const name = newForm.isNew ? newForm.newName : newForm.bottle
    if (!name || !newForm.paid || !newForm.value) return
    setSaving(true)
    await supabase.from('inventory').insert({
      bottle:    name.trim(),
      qualifier: newForm.qualifier.trim() || null,
      paid:      parseFloat(newForm.paid),
      value:     parseFloat(newForm.value),
      quantity:  1,
    })
    setNewForm({ bottle: '', isNew: false, qualifier: '', paid: '', value: '' })
    setAdding(false)
    setSaving(false)
    onRefresh()
  }

  async function exportCSV() {
    const rows = [['Bottle', 'Qualifier', 'Paid', 'Value', 'Total Paid', 'Total Value', 'Profit']]
    inventory.forEach(b => rows.push([
      b.bottle, b.qualifier || '',
      `$${b.paid}`, `$${b.value}`,
      `$${b.paid * b.quantity}`, `$${b.value * b.quantity}`,
      `$${(b.value - b.paid) * b.quantity}`,
    ]))
    rows.push(['', '', '', '', `$${totalPaid}`, `$${totalValue}`, `$${totalProfit}`])
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `Bourbon_Inventory_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="fade-up">
      <div className={styles.topRow}>
        <SectionHeader style={{ margin: 0 }}>📦 Inventory</SectionHeader>
        <button onClick={exportCSV} className={styles.exportBtn}>⬇ Export CSV</button>
      </div>

      <div className={styles.stats}>
        <StatPill label="Total Paid"  value={`$${totalPaid.toLocaleString()}`}   color="var(--cream-dim)" />
        <StatPill label="Total Value" value={`$${totalValue.toLocaleString()}`}  color="var(--amber)" />
        <StatPill label="Profit"      value={`$${totalProfit.toLocaleString()}`} color="var(--green)" />
      </div>

      <div className={styles.list}>
        {groups.map(([name, bottles]) => {
          const isOpen = !!expanded[name]
          const available = bottles.filter(b => b.quantity > 0)
          return (
            <Card key={name} className={available.length === 0 ? styles.depleted : ''}>
              <button className={styles.groupHeader} onClick={() => toggleGroup(name)}>
                <div>
                  <div className={styles.bottleName}>{name}</div>
                  <div className={styles.bottleMeta}>
                    {available.length} of {bottles.length} available
                  </div>
                </div>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>›</span>
              </button>

              {isOpen && (
                <div className={styles.bottleRows}>
                  {bottles.map((b, i) => (
                    <div key={b.id} className={`${styles.bottleRow} ${b.quantity === 0 ? styles.rowDepleted : ''}`}>
                      {editing === b.id ? (
                        <div className={styles.editRow}>
                          <Input
                            placeholder="Qualifier"
                            value={form.qualifier}
                            onChange={e => setForm({ ...form, qualifier: e.target.value })}
                            style={{ padding: '7px 9px' }}
                          />
                          <div className={styles.editNumbers}>
                            <div>
                              <Label style={{ fontSize: '0.6rem' }}>Paid</Label>
                              <Input type="number" value={form.paid} onChange={e => setForm({ ...form, paid: e.target.value })} style={{ padding: '7px 9px' }} />
                            </div>
                            <div>
                              <Label style={{ fontSize: '0.6rem' }}>Value</Label>
                              <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} style={{ padding: '7px 9px' }} />
                            </div>
                          </div>
                          <div className={styles.editActions}>
                            <button onClick={() => saveEdit(b)} className={styles.iconBtn} style={{ color: 'var(--green)' }} disabled={saving}>✓</button>
                            <button onClick={() => setEditing(null)} className={styles.iconBtn} style={{ color: 'var(--cream-dim)' }}>✕</button>
                            <button onClick={() => deleteBottle(b)} className={styles.iconBtn} style={{ color: 'var(--red)' }}>🗑</button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.rowInner}>
                          <div className={styles.rowInfo}>
                            <span className={styles.rowQualifier}>{b.qualifier || <span className={styles.noQualifier}>No qualifier</span>}</span>
                            <span className={styles.rowMeta}>Paid: ${b.paid} · Value: ${b.value}{b.quantity === 0 ? ' · Depleted' : ''}</span>
                          </div>
                          <button onClick={() => startEdit(b)} className={styles.iconBtn} style={{ color: 'var(--amber)' }}>✏</button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button onClick={() => {
                    setAdding(name)
                    setNewForm({ bottle: name, isNew: false, qualifier: '', paid: '', value: '' })
                  }} className={styles.addRowBtn}>+ Add bottle</button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {!adding ? (
        <SecondaryBtn
          onClick={() => setAdding(true)}
          style={{ width: '100%', marginTop: 6 }}
        >
          + Add Bottle
        </SecondaryBtn>
      ) : (
        <AddBottleForm
          existingNames={groups.map(([name]) => name)}
          prefillName={typeof adding === 'string' ? adding : ''}
          saving={saving}
          onSave={addBottle}
          onCancel={() => setAdding(false)}
          form={newForm}
          setForm={setNewForm}
        />
      )}
    </div>
  )
}
