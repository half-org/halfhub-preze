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
 * Last block (index 4) finishes at 4*STAGGER + WINDOW = 0.48, so everything
 * is fully visible just before the middle of the 1.5vh-tall range.
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

const TEAL = '#45f0d8'
const PURPLE = '#b07cff'

/**
 * Decorative "agents reading your site" flow: three agent chips send pulses
 * along curved lanes into a schematic page whose machine-readable markers
 * (schema.org / llms.txt / API) tick as verified. Pure SVG — dash flow via CSS
 * (paused under prefers-reduced-motion), pulse dots via SMIL (hidden there).
 */
function AgentsFlow({
  t,
}: {
  t: { agents: string[]; checks: string[]; web: string }
}) {
  const chips = [
    { label: t.agents[0], cy: 64, color: TEAL },
    { label: t.agents[1], cy: 160, color: TEAL },
    { label: t.agents[2], cy: 256, color: PURPLE },
  ]
  const lanes = [
    { d: 'M140 64 C 214 64, 250 122, 324 122', color: TEAL, dur: '2.8s', flow: styles.flowA },
    { d: 'M140 160 C 214 160, 250 160, 324 160', color: TEAL, dur: '3.6s', flow: styles.flowB },
    { d: 'M140 256 C 214 256, 250 198, 324 198', color: PURPLE, dur: '3.1s', flow: styles.flowC },
  ]
  const checkColors = [TEAL, TEAL, PURPLE]
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 460 292"
      fill="none"
      aria-hidden="true"
    >
      {/* Agent chips */}
      {chips.map((c, i) => (
        <g key={c.label}>
          <rect
            x="0.5"
            y={c.cy - 18.5}
            width="139"
            height="37"
            rx="7"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.13)"
          />
          <circle
            className={styles.chipDot}
            style={{ animationDelay: `${i * 0.7}s` }}
            cx="18"
            cy={c.cy}
            r="3"
            fill={c.color}
          />
          <text x="32" y={c.cy + 3.5} className={styles.diagLabel} fill="#dcdcdc">
            {c.label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Flow lanes + traveling pulses */}
      {lanes.map((l, i) => (
        <g key={l.d}>
          <path
            id={`aiflow-${i}`}
            className={`${styles.flowPath} ${l.flow}`}
            d={l.d}
            stroke={l.color}
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="3 7"
          />
          <circle className={styles.pulse} r="2.5" fill={l.color}>
            <animateMotion dur={l.dur} repeatCount="indefinite">
              <mpath href={`#aiflow-${i}`} />
            </animateMotion>
          </circle>
        </g>
      ))}

      {/* Page schematic */}
      <rect
        x="324.5"
        y="68.5"
        width="127"
        height="183"
        rx="8"
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.2)"
      />
      <line x1="325" y1="96" x2="451" y2="96" stroke="rgba(255,255,255,0.14)" />
      <circle cx="339" cy="82.5" r="1.8" fill="rgba(255,255,255,0.3)" />
      <circle cx="349" cy="82.5" r="1.8" fill="rgba(255,255,255,0.3)" />
      <circle cx="359" cy="82.5" r="1.8" fill="rgba(255,255,255,0.3)" />
      <rect x="338" y="108" width="86" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
      <rect x="338" y="119" width="58" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />
      {t.checks.map((label, i) => (
        <g key={label} className={styles.check} style={{ animationDelay: `${i * 0.9}s` }}>
          <text x="338" y={152 + i * 28} className={styles.diagCheckMark} fill={checkColors[i]}>
            ✓
          </text>
          <text x="352" y={152 + i * 28} className={styles.diagCheckLabel} fill="#c6c6c6">
            {label}
          </text>
        </g>
      ))}
      <text x="388" y="274" textAnchor="middle" className={styles.diagWebLabel} fill="#8f8f8f">
        {t.web.toUpperCase()}
      </text>
    </svg>
  )
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
    { key: 'geo', data: t.geo, cls: styles.panelGeo, reveal: 2 },
    { key: 'a2a', data: t.a2a, cls: styles.panelA2a, reveal: 3 },
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
          <div className={styles.top}>
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
            <div className={`${styles.diagramWrap} ${styles.reveal}`} ref={setReveal(1)}>
              <AgentsFlow t={t.diagram} />
            </div>
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

          <p className={`${styles.note} ${styles.reveal}`} ref={setReveal(4)}>
            {t.note}
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        </div>
      </div>
    </section>
  )
}
