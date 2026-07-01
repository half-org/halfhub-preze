'use client'

import { useEffect, useRef } from 'react'
import { COPY } from '@/lib/content'
import { SECTIONS, SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import type { Lang } from '@/lib/types'
import styles from './Hero.module.css'

const H = SECTIONS.find((s) => s.id === 'home')!.height
const RANGE = SECTION_RANGES.find((r) => r.id === 'home')!.range

/** Deterministic per-word variation — SSR markup must match the client. */
const seed = (i: number) => {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Hero copy pinned bottom-left under the particle logo. The block itself is
 * static; a rAF loop reading scrollState dissolves the headline word by word
 * on the way down (echoing the logo's particle split), parallaxes the sub and
 * retires the scroll hint. CSS holds the resting (visible) state — the loop
 * is skipped under prefers-reduced-motion, and no-JS renders it static.
 */
export function Hero({ lang }: { lang: Lang }) {
  const t = COPY[lang].hero
  const wordRefs = useRef<(HTMLElement | null)[]>([])
  const kickerRef = useRef<HTMLParagraphElement | null>(null)
  const subRef = useRef<HTMLParagraphElement | null>(null)
  const hintRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [a, b] = RANGE
    let raf = 0
    let last = -1
    const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const p = clamp01((scrollState.progress - a) / (b - a))
      if (p === last) return
      last = p

      // headline: each word lifts off on its own beat between p 0.26..0.88
      const words = wordRefs.current
      for (let i = 0; i < words.length; i++) {
        const el = words[i]
        if (!el) continue
        const s1 = seed(i)
        const s2 = seed(i + 17)
        const e = clamp01((p - (0.26 + s1 * 0.24)) / 0.38)
        const k = e * e * (3 - 2 * e)
        el.style.transform = `translate3d(0, ${(-k * (34 + s2 * 64)).toFixed(2)}px, 0)`
        el.style.opacity = (1 - k * 0.92).toFixed(3)
      }

      if (kickerRef.current) {
        const k = clamp01((p - 0.5) / 0.5)
        kickerRef.current.style.transform = `translate3d(0, ${(-p * 26).toFixed(2)}px, 0)`
        kickerRef.current.style.opacity = (1 - k * 0.6).toFixed(3)
      }
      if (subRef.current) {
        const k = clamp01((p - 0.42) / 0.4)
        subRef.current.style.transform = `translate3d(0, ${(-p * 44).toFixed(2)}px, 0)`
        subRef.current.style.opacity = (1 - k * 0.8).toFixed(3)
      }
      if (hintRef.current) {
        // the hint has done its job the moment scrolling starts
        hintRef.current.style.opacity = (1 - clamp01(p / 0.2)).toFixed(3)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const words = t.headline.split(' ')

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <div className={styles.block}>
          <p className={styles.kicker} ref={kickerRef}>
            <span aria-hidden="true">{'// 01 — '}</span>
            {t.kicker}
          </p>
          <h1 id="home-heading" className={styles.headline} aria-label={t.headline}>
            {words.map((w, i) => (
              <span key={i}>
                {i > 0 && ' '}
                <span
                  aria-hidden="true"
                  className={styles.word}
                  ref={(el) => {
                    wordRefs.current[i] = el
                  }}
                >
                  {w}
                </span>
              </span>
            ))}
          </h1>
          <p className={styles.sub} ref={subRef}>
            {t.sub}
          </p>
          <p className={styles.hint} ref={hintRef}>
            <span className={styles.hintLine} aria-hidden="true" />
            {t.scrollHint}
          </p>
        </div>
      </div>
    </section>
  )
}
