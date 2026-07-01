'use client'

import { useEffect, useRef } from 'react'
import { COPY } from '@/lib/content'
import { SECTIONS, SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import type { Lang } from '@/lib/types'
import styles from './AiReady.module.css'

const H = SECTIONS.find((s) => s.id === 'aiready')!.height
const RANGE = SECTION_RANGES.find((r) => r.id === 'aiready')!.range

/**
 * Scroll-linked reveal tuning (section-local progress 0..1).
 * Last block (index 3) finishes at 3*STAGGER + WINDOW = 0.43, so everything
 * is fully visible well before the middle of the 1.5vh-tall range.
 */
const STAGGER = 0.05
const WINDOW = 0.28
const SHIFT_PX = 26

/** Split a heading near its middle (at a word boundary) for the half motif. */
function splitHalf(text: string): [string, string] {
  const mid = Math.floor(text.length / 2)
  const before = text.lastIndexOf(' ', mid)
  const after = text.indexOf(' ', mid)
  let cut = before
  if (cut <= 0 || (after !== -1 && after - mid < mid - cut)) cut = after
  if (cut <= 0) return [text, '']
  return [text.slice(0, cut), text.slice(cut)]
}

export function AiReadySection({ lang }: { lang: Lang }) {
  const t = COPY[lang].aiready
  const [solid, outline] = splitHalf(t.heading)
  const revealRefs = useRef<(HTMLElement | null)[]>([])

  // Gentle scroll-linked entrance: direct style writes from a rAF loop reading
  // scrollState (no React state). CSS renders the FINAL state by default, so
  // reduced-motion / no-JS simply shows everything.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [a, b] = RANGE
    let raf = 0
    let last = -1
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const local = Math.min(Math.max((scrollState.progress - a) / (b - a), 0), 1)
      if (local === last) return
      last = local
      const els = revealRefs.current
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        if (!el) continue
        const raw = Math.min(Math.max((local - i * STAGGER) / WINDOW, 0), 1)
        const e = 1 - (1 - raw) ** 3 // easeOutCubic
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(0, ${((1 - e) * SHIFT_PX).toFixed(2)}px, 0)`
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const setReveal = (i: number) => (el: HTMLElement | null) => {
    revealRefs.current[i] = el
  }

  const panels = [
    { key: 'geo', data: t.geo, cls: styles.panelGeo, reveal: 1 },
    { key: 'a2a', data: t.a2a, cls: styles.panelA2a, reveal: 2 },
  ] as const

  return (
    <section
      id="aiready"
      aria-labelledby="aiready-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <div className={styles.inner}>
          <div className={styles.reveal} ref={setReveal(0)}>
            <p className={styles.kicker}>
              <span aria-hidden="true">{'// 04 — '}</span>
              {t.kicker}
            </p>
            {/* Brand motif: first half solid, second half dissolving to outline. */}
            <h2 id="aiready-heading" className={styles.heading}>
              <span>{solid}</span>
              <span className={styles.outline}>{outline}</span>
            </h2>
            <p className={styles.body}>{t.body}</p>
          </div>

          <div className={styles.panels}>
            {panels.map((p) => (
              <article
                key={p.key}
                className={`${styles.panel} ${p.cls} ${styles.reveal}`}
                ref={setReveal(p.reveal)}
              >
                <h3 className={styles.panelLabel}>{p.data.label}</h3>
                <p className={styles.panelDesc}>{p.data.desc}</p>
                <ul className={styles.points}>
                  {p.data.points.map((point) => (
                    <li key={point} className={styles.point}>
                      <span className={styles.pointMark} aria-hidden="true">
                        +
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className={`${styles.note} ${styles.reveal}`} ref={setReveal(3)}>
            {t.note}
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        </div>
      </div>
    </section>
  )
}
