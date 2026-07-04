import styles from './SectionBridge.module.css'

/**
 * Connective thread between two section rooms: a thin vertical line stitched
 * through the boundary with the NEXT section's kicker at its center. Sits at
 * height 0 in normal flow, so it scrolls through the viewport exactly while
 * the canvas wipe runs — the next section announces itself instead of the
 * gap reading as empty black. Decorative (the section's own heading follows).
 */
export function SectionBridge({ num, label }: { num: string; label: string }) {
  return (
    <div className={styles.bridge} aria-hidden="true">
      <div className={styles.inner}>
        <span className={`${styles.line} ${styles.lineIn}`} />
        <p className={styles.label}>
          {'// '}
          {num}
          {' — '}
          {label}
        </p>
        <span className={`${styles.line} ${styles.lineOut}`} />
      </div>
    </div>
  )
}
