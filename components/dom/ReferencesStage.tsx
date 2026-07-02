'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { COPY, REFERENCES } from '@/lib/content'
import { SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import { refsProgress } from '@/lib/refs-progress'
import { getGPUPolicy } from '@/lib/gpu-tier'
import type { Lang } from '@/lib/types'
import { useScramble } from './useScramble'
import styles from './References.module.css'

const RANGE = SECTION_RANGES.find((r) => r.id === 'references')!.range
const TOTAL = String(REFERENCES.length).padStart(2, '0')

/** Mono visit link — scramble on hover, brand-color shift via CSS var. */
function VisitLink({
  href,
  domain,
  label,
  color,
  focusable,
}: {
  href: string
  domain: string
  label: string
  color: string
  focusable: boolean
}) {
  const { ref, start } = useScramble<HTMLSpanElement>(label)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.visit}
      style={{ '--ref-color': color } as CSSProperties}
      tabIndex={focusable ? 0 : -1}
      onPointerEnter={start}
      onFocus={start}
    >
      <span ref={ref}>{label}</span>
      <span className={styles.visitArrow} aria-hidden="true">
        ↗
      </span>
      <span className={styles.domain}>{domain}</span>
    </a>
  )
}

/**
 * Client stage for the references deck. Both projects render in the initial
 * (server) HTML; a rAF loop reads scrollState and maps local progress through
 * refsProgress() — the same function the canvas scene uses — so DOM and WebGL
 * can never disagree. setState fires ONLY when the active index changes;
 * per-frame drift goes through refs + direct style writes.
 * With WebGL disabled the desktop screenshot renders as a framed <img> so
 * non-WebGL users still see the work.
 */
export function ReferencesStage({ lang }: { lang: Lang }) {
  const t = COPY[lang].references
  const [active, setActive] = useState(0)
  const [webglOff, setWebglOff] = useState(false)
  const activeRef = useRef(0)
  const driftRefs = useRef<(HTMLDivElement | null)[]>([])

  // client-only capability check (SSR HTML stays identical for everyone)
  useEffect(() => {
    if (getGPUPolicy().webglDisabled) setWebglOff(true)
  }, [])

  useEffect(() => {
    // active-index tracking always runs (it drives which card is visible);
    // the decorative parallax drift is skipped under prefers-reduced-motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const [a, b] = RANGE
    const loop = () => {
      const local = Math.min(Math.max((scrollState.progress - a) / (b - a), 0), 1)
      const { active: idx, t: drift } = refsProgress(local)
      if (idx !== activeRef.current) {
        activeRef.current = idx
        setActive(idx)
      }
      if (!reduced && local > 0 && local < 1) {
        const el = driftRefs.current[idx]
        if (el) el.style.transform = `translate3d(0, ${(drift * -14).toFixed(2)}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.stage}>
      <div className={styles.deck}>
        {REFERENCES.map((r, i) => {
          const c = r[lang]
          const isActive = i === active
          const state = isActive
            ? styles.cardActive
            : i < active
              ? styles.cardAbove
              : styles.cardBelow
          return (
            <article
              key={r.id}
              className={`${styles.card} ${state}`}
              aria-current={isActive || undefined}
              aria-hidden={!isActive || undefined}
            >
              <div
                className={styles.drift}
                data-canvas-measure="references"
                ref={(el) => {
                  driftRefs.current[i] = el
                }}
              >
                <p className={styles.index} style={{ color: r.color }} aria-hidden="true">
                  {r.index}
                </p>
                <h3 className={styles.name}>{c.name}</h3>
                <p className={styles.tagline}>{c.tagline}</p>
                <ul className={styles.points}>
                  {c.points.map((p) => (
                    <li key={p} className={styles.point}>
                      <span
                        className={styles.pointMark}
                        style={{ color: r.color }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <VisitLink
                  href={r.url}
                  domain={r.domain}
                  label={t.visit}
                  color={r.color}
                  focusable={isActive}
                />
              </div>
            </article>
          )
        })}
      </div>
      {webglOff && (
        <div className={styles.fallback} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.shot}
            src={REFERENCES[active].assets.desktop}
            alt=""
            loading="lazy"
          />
        </div>
      )}
      <div className={styles.rail} aria-hidden="true">
        {REFERENCES.map((r, i) => (
          <span
            key={r.id}
            className={`${styles.tick} ${i === active ? styles.tickActive : ''}`}
            style={i === active ? { background: r.color } : undefined}
          />
        ))}
        <span className={styles.railCount}>
          {REFERENCES[active].index}&nbsp;/&nbsp;{TOTAL}
        </span>
      </div>
    </div>
  )
}
