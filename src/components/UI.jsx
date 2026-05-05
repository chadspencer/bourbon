import styles from './UI.module.css'

export function SectionHeader({ children, style }) {
  return (
    <h2 className={styles.sectionHeader} style={style}>
      {children}
    </h2>
  )
}

export function Label({ children, style }) {
  return (
    <div className={styles.label} style={style}>
      {children}
    </div>
  )
}

export function Input({ style, className, ...props }) {
  return (
    <input
      className={`${styles.input} ${className || ''}`}
      style={style}
      {...props}
    />
  )
}

export function Select({ children, style, className, ...props }) {
  return (
    <select className={`${styles.select} ${className || ''}`} style={style} {...props}>
      {children}
    </select>
  )
}

export function PrimaryBtn({ children, style, ...props }) {
  return (
    <button className={styles.primaryBtn} style={style} {...props}>
      {children}
    </button>
  )
}

export function SecondaryBtn({ children, style, ...props }) {
  return (
    <button className={styles.secondaryBtn} style={style} {...props}>
      {children}
    </button>
  )
}

export function CopyBtn({ onClick, copied }) {
  return (
    <button onClick={onClick} className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      role="switch"
      aria-checked={value}
    >
      <div className={styles.toggleThumb} />
    </div>
  )
}

export function Card({ children, style, className }) {
  return (
    <div className={`${styles.card} ${className || ''}`} style={style}>
      {children}
    </div>
  )
}

export function StatPill({ label, value, color }) {
  return (
    <div className={styles.statPill}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
    </div>
  )
}

export function Spinner() {
  return <div className={styles.spinner} />
}
