'use client'

import { useEffect, useRef, useState } from 'react'
import { SERVICES } from '@/lib/content'
import { SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import { serviceProgress } from '@/lib/services-progress'
import type { Lang } from '@/lib/types'
import styles from './Services.module.css'

const RANGE = SECTION_RANGES.find((r) => r.id === 'services')!.range
const TOTAL = String(SERVICES.length).padStart(2, '0')

/**
 * Client stage for the services deck. All 7 services render in the initial
 * (server) HTML; a rAF loop reads scrollState and maps local progress through
 * serviceProgress() — the same function the canvas scene uses — so DOM and
 * WebGL can never disagree. setState fires ONLY when the active index
 * changes; per-frame drift goes through refs + direct style writes.
 */
export function ServicesStage({ lang }: { lang: Lang }) {
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const driftRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    const [a, b] = RANGE
    const loop = () => {
      const local = Math.min(Math.max((scrollState.progress - a) / (b - a), 0), 1)
      const { active: idx, t } = serviceProgress(local)
      if (idx !== activeRef.current) {
        activeRef.current = idx
        setActive(idx)
      }
      if (local > 0 && local < 1) {
        const el = driftRefs.current[idx]
        if (el) el.style.transform = `translate3d(0, ${(t * -16).toFixed(2)}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.stage}>
      <div className={styles.deck}>
        {SERVICES.map((s, i) => {
          const c = s[lang]
          const isActive = i === active
          const state = isActive
            ? styles.cardActive
            : i < active
              ? styles.cardAbove
              : styles.cardBelow
          return (
            <article
              key={s.id}
              className={`${styles.card} ${state}`}
              aria-current={isActive || undefined}
            >
              <div
                className={styles.drift}
                ref={(el) => {
                  driftRefs.current[i] = el
                }}
              >
                <p className={styles.index} style={{ color: s.color }} aria-hidden="true">
                  {s.index}
                </p>
                <h3 className={styles.name}>{c.name}</h3>
                <p className={styles.tagline}>{c.tagline}</p>
                <ul className={styles.points}>
                  {c.points.map((p) => (
                    <li key={p} className={styles.point}>
                      <span
                        className={styles.pointMark}
                        style={{ color: s.color }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>
      <div className={styles.rail} aria-hidden="true">
        {SERVICES.map((s, i) => (
          <span
            key={s.id}
            className={`${styles.tick} ${i === active ? styles.tickActive : ''}`}
            style={i === active ? { background: s.color } : undefined}
          />
        ))}
        <span className={styles.railCount}>
          {SERVICES[active].index}&nbsp;/&nbsp;{TOTAL}
        </span>
      </div>
    </div>
  )
}
