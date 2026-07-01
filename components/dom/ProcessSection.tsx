'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { COPY } from '@/lib/content'
import { SECTIONS, SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import type { Lang } from '@/lib/types'
import styles from './Process.module.css'

const H = SECTIONS.find((s) => s.id === 'process')!.height
const RANGE = SECTION_RANGES.find((r) => r.id === 'process')!.range

/** Step accents walk the services palette teal → pink, same as the line. */
const STEP_COLORS = ['#45F0D8', '#4FC8F0', '#8F8AFF', '#FF6FB3']

/**
 * Scroll-linked reveal tuning (section-local progress 0..1).
 * Header first, then one step per beat while the line draws underneath them;
 * everything is fully visible by ~0.65 of the range.
 */
const STAGGER = 0.09
const WINDOW = 0.3
const SHIFT_PX = 30
const LINE_START = 0.08
const LINE_END = 0.62

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

export function ProcessSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].process
  const [solid, outline] = splitHalf(t.heading)
  const revealRefs = useRef<(HTMLElement | null)[]>([])
  const lineRef = useRef<HTMLSpanElement | null>(null)

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
      const draw = Math.min(Math.max((local - LINE_START) / (LINE_END - LINE_START), 0), 1)
      lineRef.current?.style.setProperty('--draw', (draw * draw * (3 - 2 * draw)).toFixed(4))
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const setReveal = (i: number) => (el: HTMLElement | null) => {
    revealRefs.current[i] = el
  }

  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <div className={styles.inner}>
          <header className={styles.reveal} ref={setReveal(0)}>
            <p className={styles.kicker}>
              <span aria-hidden="true">{'// 07 — '}</span>
              {t.kicker}
            </p>
            {/* Brand motif: first half solid, second half dissolving to outline. */}
            <h2 id="process-heading" className={styles.heading}>
              <span>{solid}</span>
              <span className={styles.outline}>{outline}</span>
            </h2>
          </header>

          <div className={styles.timeline}>
            <div className={styles.track} aria-hidden="true">
              <span className={styles.line} ref={lineRef} />
            </div>
            <ol className={styles.steps}>
              {t.steps.map((s, i) => (
                <li
                  key={s.index}
                  className={`${styles.step} ${styles.reveal}`}
                  ref={setReveal(i + 1)}
                  style={{ '--step-color': STEP_COLORS[i] } as CSSProperties}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <p className={styles.index} aria-hidden="true">
                    {s.index}
                  </p>
                  <h3 className={styles.name}>{s.name}</h3>
                  <p className={styles.body}>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
