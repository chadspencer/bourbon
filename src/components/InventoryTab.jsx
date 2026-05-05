import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionHeader, Label, Input, PrimaryBtn, SecondaryBtn, StatPill, Card, Spinner } from './UI'
import styles from './InventoryTab.module.css'

export default function InventoryTab({ inventory, onRefresh }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState({ bottle: '', paid: '', value: '', quantity: '' })
  const [saving, setSaving] = useState(false)

  const totalPaid = inventory.reduce((s, b) => s + b.paid * b.quantity, 0)
  const totalValue = inventory.reduce((s, b) => s + b.value * b.quantity, 0)
  const totalProfit = totalValue - totalPaid

  function startEdit(b) {
    setEditing(b.id)
    setForm({ paid: b.paid, value: b.value, quantity: b.quantity })
  }

  async function saveEdit(b) {
    setSaving(true)
    const paid = parseFloat(form.paid) || b.paid
    const value = parseFloat(form.value) || b.value
    const quantity = parseInt(form.quantity) ?? b.quantity
    const total_paid = paid * quantity
    const total_value = value * quantity
    await supabase.from('inventory').update({
      paid, value, quantity, total_paid, total_value, profit: total_value - total_paid,
    }).eq('id', b.id)
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function addBottle() {
    if (!newForm.bottle || !newForm.paid || !newForm.value || newForm.quantity === '') return
    setSaving(true)
    const paid = parseFloat(newForm.paid)
    const value = parseFloat(newForm.value)
    const quantity = parseInt(newForm.quantity)
    await supabase.from('inventory').insert({
      bottle: newForm.bottle.trim(),
      paid,
      value,
      quantity,
      total_paid: paid * quantity,
      total_value: value * quantity,
      profit: (value - paid) * quantity,
    })
    setNewForm({ bottle: '', paid: '', value: '', quantity: '' })
    setAdding(false)
    setSaving(false)
    onRefresh()
  }

  async function exportCSV() {
    const rows = [['Bottle', 'Paid', 'Value', 'Quantity', 'Total Paid', 'Total Value', 'Profit']]
    inventory.forEach(b => {
      const tp = b.paid * b.quantity
      const tv = b.value * b.quantity
      rows.push([b.bottle, `$${b.paid}`, `$${b.value}`, b.quantity, `$${tp}`, `$${tv}`, `$${tv - tp}`])
    })
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
        <StatPill label="Total Paid" value={`$${totalPaid.toLocaleString()}`} color="var(--cream-dim)" />
        <StatPill label="Total Value" value={`$${totalValue.toLocaleString()}`} color="var(--amber)" />
        <StatPill label="Profit" value={`$${totalProfit.toLocaleString()}`} color="var(--green)" />
      </div>

      <div className={styles.list}>
        {inventory.map(b => (
          <Card key={b.id} className={b.quantity === 0 ? styles.depleted : ''}>
            <div className={styles.bottleRow}>
              <div>
                <div className={styles.bottleName}>{b.bottle}</div>
                <div className={styles.bottleMeta}>
                  Paid: ${b.paid} · Value: ${b.value} · Qty:{' '}
                  <span style={{ color: b.quantity === 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                    {b.quantity}
                  </span>
                </div>
              </div>
              <div className={styles.editBtns}>
                {editing === b.id ? (
                  <>
                    <button onClick={() => saveEdit(b)} className={styles.iconBtn} style={{ color: 'var(--green)' }}>✓</button>
                    <button onClick={() => setEditing(null)} className={styles.iconBtn} style={{ color: 'var(--red)' }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => startEdit(b)} className={styles.iconBtn} style={{ color: 'var(--amber)' }}>✏</button>
                )}
              </div>
            </div>

            {editing === b.id && (
              <div className={styles.editForm}>
                {[['Paid', 'paid'], ['Value', 'value'], ['Qty', 'quantity']].map(([l, k]) => (
                  <div key={k}>
                    <Label style={{ fontSize: '0.65rem' }}>{l}</Label>
                    <Input
                      type="number"
                      value={form[k]}
                      onChange={e => setForm({ ...form, [k]: e.target.value })}
                      style={{ padding: '7px 9px' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {adding ? (
        <Card style={{ borderColor: 'var(--border-hot)', marginTop: 4 }}>
          <Label>New Bottle</Label>
          <Input
            placeholder="Bottle name"
            value={newForm.bottle}
            onChange={e => setNewForm({ ...newForm, bottle: e.target.value })}
            style={{ marginBottom: 10 }}
          />
          <div className={styles.newFormRow}>
            {[['Paid', 'paid'], ['Value', 'value'], ['Qty', 'quantity']].map(([l, k]) => (
              <div key={k} style={{ flex: 1 }}>
                <Label style={{ fontSize: '0.65rem' }}>{l}</Label>
                <Input
                  type="number"
                  placeholder={l}
                  value={newForm[k]}
                  onChange={e => setNewForm({ ...newForm, [k]: e.target.value })}
                  style={{ padding: '7px 9px' }}
                />
              </div>
            ))}
          </div>
          <div className={styles.addBtnRow}>
            <PrimaryBtn onClick={addBottle} disabled={saving}>
              {saving ? 'Adding...' : 'Add Bottle'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => setAdding(false)}>Cancel</SecondaryBtn>
          </div>
        </Card>
      ) : (
        <SecondaryBtn onClick={() => setAdding(true)} style={{ width: '100%', marginTop: 6 }}>
          + Add Bottle
        </SecondaryBtn>
      )}
    </div>
  )
}
