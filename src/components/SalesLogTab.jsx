import { SectionHeader, Spinner } from './UI'
import styles from './SalesLogTab.module.css'

export default function SalesLogTab({ sales, loading }) {
  if (loading) return <Spinner />

  const total = sales.reduce((s, x) => s + x.sold_for, 0)

  return (
    <div className="fade-up">
      <div className={styles.topRow}>
        <SectionHeader style={{ margin: 0 }}>📋 Sales Log</SectionHeader>
        {sales.length > 0 && (
          <div className={styles.totalBadge}>${total.toLocaleString()} total</div>
        )}
      </div>

      {sales.length === 0 ? (
        <div className={styles.empty}>No sales yet. Start a game!</div>
      ) : (
        <div className={styles.list}>
          {sales.map(s => (
            <div key={s.id} className={styles.saleCard}>
              <div className={styles.saleMain}>
                <div>
                  <div className={styles.saleBottles}>
                    {Array.isArray(s.bottles) ? s.bottles.join(' + ') : s.bottles}
                  </div>
                  <div className={styles.saleMeta}>
                    {new Date(s.date).toLocaleDateString()} · {s.mode === 'multi' ? 'Multi' : 'Single'}
                  </div>
                </div>
                <div className={styles.saleAmount}>${s.sold_for.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
