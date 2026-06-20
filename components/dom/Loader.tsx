'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { loaderState } from '@/lib/loader-state'
import { scramble, SCRAMBLE_FPS_MS } from '@/lib/scramble'
import { LogoMark } from '@/components/dom/LogoMark'
import styles from './loader.module.css'

/** Counter color cycle — discrete swaps at ~24fps, never continuous. */
const COUNTER_COLORS = ['#45F0D8', '#86E8FF', '#B07CFF']
const COLOR_STEP_MS = 42 // ~24fps

const GLYPH_COLS = 16
const GLYPH_ROWS = 7
const GLYPH_ROW = '/'.repeat(GLYPH_COLS)

/** How much of the gap to displayed-target we close per frame. */
const LERP = 0.04
/** Counter tween to 100 once all milestones fire. */
const SNAP_MS = 300
/** Overlay fade after the snap tween. */
const FADE_MS = 600

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Branded loader (AT recipe): milestone-gated percent counter over a band of
 * "/" glyphs scrambling to digits at 12fps. Displayed progress is smoothed
 * client-side and capped at 90% until all milestones fire, then snaps to 100,
 * fades out, fades the custom scrollbar in (--baropacity) and unmounts.
 * The world fade-in behind is owned by the spine (worldFade).
 */
export function Loader() {
  const snap = useSyncExternalStore(
    loaderState.subscribe,
    loaderState.getSnapshot,
    loaderState.getServerSnapshot
  )

  const [reduced, setReduced] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [gone, setGone] = useState(false)

  const numRef = useRef<HTMLSpanElement>(null)
  const counterRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const displayedRef = useRef(0)
  const snapStartRef = useRef<{ t0: number; from: number } | null>(null)

  // Milestone: the DOM UI is mounted. Plus a watchdog: if the WebGL path
  // stalls (hung chunk/bin download), force-complete so the overlay never
  // blocks the working DOM site — set() is idempotent, the canvas still
  // fades in via worldFade only when genuinely ready.
  useEffect(() => {
    loaderState.set('ui')
    const watchdog = setTimeout(() => {
      loaderState.set('renderer')
      loaderState.set('hero')
    }, 15000)
    return () => clearTimeout(watchdog)
  }, [])

  // Keep the page behind the opaque overlay out of the tab order while loading.
  useEffect(() => {
    if (gone) return
    const els = document.querySelectorAll('header, main, footer')
    els.forEach((el) => el.toggleAttribute('inert', !exiting))
    return () => els.forEach((el) => el.removeAttribute('inert'))
  }, [exiting, gone])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Smoothed counter: lerp displayed toward target, cap at 90 until complete,
  // then tween to 100 in ~300ms. Writes textContent — no per-frame setState.
  useEffect(() => {
    if (reduced || gone) return
    let raf = 0
    const tick = () => {
      const s = loaderState.getSnapshot()
      let d = displayedRef.current
      if (s.complete) {
        if (!snapStartRef.current) {
          snapStartRef.current = { t0: performance.now(), from: d }
        }
        const { t0, from } = snapStartRef.current
        const k = Math.min(1, (performance.now() - t0) / SNAP_MS)
        d = from + (100 - from) * easeOutCubic(k)
      } else {
        const target = Math.min(s.target * 100, 90)
        d += (target - d) * LERP
      }
      displayedRef.current = d
      if (numRef.current) numRef.current.textContent = String(Math.round(d))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, gone])

  // Reduced motion: plain counter straight from the store, no rAF smoothing.
  useEffect(() => {
    if (!reduced) return
    const pct = Math.round(Math.min(snap.target, snap.complete ? 1 : 0.9) * 100)
    if (numRef.current) numRef.current.textContent = String(pct)
  }, [reduced, snap])

  // Counter color: discrete swap between 3 accents at ~24fps.
  useEffect(() => {
    if (reduced || exiting) return
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % COUNTER_COLORS.length
      if (counterRef.current) counterRef.current.style.color = COUNTER_COLORS[i]
    }, COLOR_STEP_MS)
    return () => clearInterval(id)
  }, [reduced, exiting])

  // Glyph band: random "/" swap to random digits at 12fps, full intensity.
  useEffect(() => {
    if (reduced || exiting) return
    const id = setInterval(() => {
      for (const el of rowRefs.current) {
        if (el) el.textContent = scramble(GLYPH_ROW, 1)
      }
    }, SCRAMBLE_FPS_MS)
    return () => clearInterval(id)
  }, [reduced, exiting])

  // Exit choreography: snap tween (300ms) → fade out (600ms) + scrollbar in →
  // unmount. World fade-in is handled by the spine.
  useEffect(() => {
    if (!snap.complete) return
    const t1 = setTimeout(() => {
      setExiting(true)
      document.documentElement.style.setProperty('--baropacity', '0.9')
    }, SNAP_MS)
    const t2 = setTimeout(() => setGone(true), SNAP_MS + FADE_MS + 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [snap.complete])

  if (gone) return null

  // Coarse, milestone-granular status for assistive tech (the visible
  // per-frame counter is aria-hidden to avoid live-region spam).
  const statusPct = Math.round(
    Math.min(snap.target, snap.complete ? 1 : 0.9) * 100
  )

  return (
    <div
      className={exiting ? `${styles.overlay} ${styles.exiting}` : styles.overlay}
      role="status"
      aria-live="polite"
      data-loader
    >
      <span className={styles.srOnly}>{statusPct}%</span>
      <div className={styles.inner} aria-hidden="true">
        <LogoMark size={26} mode="split" decorative className={styles.logo} />
        <div className={styles.stage}>
          <div className={styles.glyphs}>
            {Array.from({ length: GLYPH_ROWS }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  rowRefs.current[i] = el
                }}
              >
                {GLYPH_ROW}
              </div>
            ))}
          </div>
          <div className={styles.counter} ref={counterRef}>
            <span className={styles.num} ref={numRef}>
              0
            </span>
            <span className={styles.pct}>%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
