import { useState } from 'react'
import { SectionHeader, Label, Input, PrimaryBtn, CopyBtn, Card } from './UI'
import styles from './DucksTab.module.css'

export default function DucksTab() {
  const [count, setCount] = useState('')
  const [list, setList] = useState('')
  const [copied, setCopied] = useState(false)

  function generate() {
    const n = parseInt(count)
    if (!n || n < 1) return
    setList(Array.from({ length: n }, (_, i) => `${i}.`).join('\n'))
  }

  function copy() {
    navigator.clipboard.writeText(list).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fade-up">
      <SectionHeader>🦆 Duck List Generator</SectionHeader>

      <div className={styles.row}>
        <Input
          type="number"
          value={count}
          onChange={e => setCount(e.target.value)}
          placeholder="How many ducks?"
          onKeyDown={e => e.key === 'Enter' && generate()}
          style={{ flex: 1 }}
          min={1}
          max={99}
        />
        <PrimaryBtn onClick={generate}>Generate</PrimaryBtn>
      </div>

      {list && (
        <Card style={{ marginTop: 16 }}>
          <div className={styles.header}>
            <Label style={{ margin: 0 }}>{count} ducks</Label>
            <CopyBtn onClick={copy} copied={copied} />
          </div>
          <pre className={styles.pre}>{list}</pre>
        </Card>
      )}
    </div>
  )
}
