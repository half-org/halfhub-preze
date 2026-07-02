'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { COPY } from '@/lib/content'
import { SECTIONS, SECTION_RANGES } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import type { Lang } from '@/lib/types'
import styles from './Process.module.css'

const H = SECTIONS.find((s) => s.id === 'process')!.height
const RANGE = SECTION_RANGES.find((r) => r.id === 'process')!.range

/** Step accents walk the services palette teal → pink, same as the trace. */
const STEP_COLORS = ['#45F0D8', '#4FC8F0', '#8F8AFF', '#FF6FB3']

/**
 * Choreography in section-local progress. The section is pinned for almost
 * its whole range (release ≈ 0.98), so the trace draws across most of it and
 * each step reveals the moment the trace reaches its node.
 */
const HEAD_WINDOW = 0.08
const DRAW_START = 0.05
const DRAW_END = 0.78
const REVEAL_LEAD = 0.03 // step starts fading in slightly before its node
const REVEAL_SPAN = 0.09
const PULSE_SPEED = 260 // px/s along the trace
const PULSE_DASH = 14

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

/**
 * Build the circuit trace: one continuous vertical data-line that contorts
 * into a distinct motif just above each step's node — the line itself
 * "performs" the step before docking into its pad:
 *   01 signal wave (the first call), 02 click-target loop (the demo),
 *   03 iteration zigzag (the build), 04 infinity knot (steady operation) —
 * and ends in a ground symbol (running, earthed, done).
 */
function buildCircuit(cx: number, height: number, nodeYs: number[], amp: number) {
  const NODE_GAP = 14 // trace runs straight this close to a pad
  const parts: string[] = [`M ${cx} 0`]

  nodeYs.forEach((ny, i) => {
    const motifH = Math.min(64, nodeYs[0] * 0.9)
    const m0 = ny - NODE_GAP - motifH // motif top
    parts.push(`L ${cx} ${m0}`)
    if (i === 0) {
      // signal wave — two smooth half-waves
      const h = motifH / 2
      parts.push(`q ${amp} ${h * 0.5} 0 ${h}`, `q ${-amp} ${h * 0.5} 0 ${h}`)
    } else if (i === 1) {
      // click-target loop — the trace ties a ring, then docks into the pad
      const r = Math.min(15, amp * 0.62)
      parts.push(
        `L ${cx} ${m0 + motifH - 2 * r}`,
        `a ${r} ${r} 0 1 1 0.01 0`,
        `L ${cx} ${m0 + motifH}`
      )
    } else if (i === 2) {
      // iteration zigzag — sharp saw teeth
      const q = motifH / 4
      parts.push(
        `l ${amp} ${q}`,
        `l ${-2 * amp} ${q * 1.2}`,
        `l ${2 * amp} ${q * 1.2}`,
        `l ${-amp} ${q * 0.6}`
      )
    } else {
      // infinity knot — two crossing petals, then straight into the pad
      const px = amp * 1.5
      const py = Math.min(20, motifH * 0.32)
      const knotY = m0 + py
      parts.push(
        `L ${cx} ${knotY}`,
        `c ${-px} ${-py} ${-px} ${py} 0 0`,
        `c ${px} ${-py} ${px} ${py} 0 0`,
        `L ${cx} ${m0 + motifH}`
      )
    }
    parts.push(`L ${cx} ${ny + NODE_GAP}`)
  })

  // tail into the ground symbol under the last node
  parts.push(`L ${cx} ${Math.min(height, nodeYs[3] + 44)}`)
  return parts.join(' ')
}

export function ProcessSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].process
  const [solid, outline] = splitHalf(t.heading)

  const headRef = useRef<HTMLElement | null>(null)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const traceRef = useRef<SVGPathElement | null>(null)
  const glowRef = useRef<SVGPathElement | null>(null)
  const pulseRef = useRef<SVGPathElement | null>(null)
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([])
  const groundRef = useRef<SVGGElement | null>(null)
  const geom = useRef({ length: 0, fracs: [0.2, 0.45, 0.7, 0.92] })

  // Build the trace to the measured spine size; rebuild on resize. The path
  // is decorative (aria-hidden) — without JS the steps simply all show.
  useEffect(() => {
    const svg = svgRef.current
    const trace = traceRef.current
    if (!svg || !trace) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rebuild = () => {
      const box = svg.getBoundingClientRect()
      if (box.width < 8 || box.height < 8) return
      const w = box.width
      const h = box.height
      const cx = w / 2
      const amp = Math.min(26, w * 0.3)
      const nodeYs = [0, 1, 2, 3].map((i) => (h * (i + 0.5)) / 4)
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      const d = buildCircuit(cx, h, nodeYs, amp)
      trace.setAttribute('d', d)
      glowRef.current?.setAttribute('d', d)
      pulseRef.current?.setAttribute('d', d)

      // gradient spans the trace vertically (userSpaceOnUse)
      const grad = svg.querySelector('linearGradient')
      grad?.setAttribute('y2', String(h))

      nodeYs.forEach((y, i) => {
        nodeRefs.current[i]?.setAttribute('cx', String(cx))
        nodeRefs.current[i]?.setAttribute('cy', String(y))
      })
      groundRef.current?.setAttribute(
        'transform',
        `translate(${cx}, ${Math.min(h, nodeYs[3] + 44)})`
      )

      // node fractions along the trace — first arc-length crossing of each
      // node's y (the loops above a node never dip past it)
      const L = trace.getTotalLength()
      const fracs: number[] = []
      let s = 0
      for (const y of nodeYs) {
        while (s < L && trace.getPointAtLength(s).y < y) s += 3
        fracs.push(Math.min(s / L, 1))
      }
      geom.current = { length: L, fracs }

      const dash = String(L)
      for (const p of [trace, glowRef.current]) {
        p?.style.setProperty('stroke-dasharray', dash)
        p?.style.setProperty('stroke-dashoffset', reduced ? '0' : dash)
      }
      pulseRef.current?.style.setProperty('stroke-dasharray', `${PULSE_DASH} ${L}`)
      if (reduced) {
        // static full-draw: nodes lit, no pulse, steps visible via CSS defaults
        nodeRefs.current.forEach((n) => n?.classList.add(styles.nodeLit))
        groundRef.current?.classList.add(styles.nodeLit)
      }
    }

    rebuild()
    const ro = new ResizeObserver(rebuild)
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])

  // Scroll-linked choreography: direct style writes from a rAF loop reading
  // scrollState (no React state). CSS renders the FINAL state by default, so
  // reduced-motion / no-JS simply shows everything.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [a, b] = RANGE
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const local = Math.min(Math.max((scrollState.progress - a) / (b - a), 0), 1)
      const { length: L, fracs } = geom.current

      // header
      const he = 1 - (1 - Math.min(local / HEAD_WINDOW, 1)) ** 3
      const head = headRef.current
      if (head) {
        head.style.opacity = he.toFixed(3)
        head.style.transform = `translate3d(0, ${((1 - he) * 26).toFixed(2)}px, 0)`
      }

      // trace draw (smoothstepped)
      const dRaw = Math.min(Math.max((local - DRAW_START) / (DRAW_END - DRAW_START), 0), 1)
      const draw = dRaw * dRaw * (3 - 2 * dRaw)
      if (L > 0) {
        const off = (L * (1 - draw)).toFixed(1)
        traceRef.current?.style.setProperty('stroke-dashoffset', off)
        glowRef.current?.style.setProperty('stroke-dashoffset', off)
      }

      // steps + nodes light up as the trace reaches them
      for (let i = 0; i < 4; i++) {
        const el = stepRefs.current[i]
        if (!el) continue
        const raw = Math.min(Math.max((draw - fracs[i] + REVEAL_LEAD) / REVEAL_SPAN, 0), 1)
        const e = 1 - (1 - raw) ** 3
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(0, ${((1 - e) * 24).toFixed(2)}px, 0)`
        nodeRefs.current[i]?.classList.toggle(styles.nodeLit, draw >= fracs[i])
      }
      groundRef.current?.classList.toggle(styles.nodeLit, draw >= 0.995)

      // ambient pulse — a bright dash travelling down the drawn trace
      const pulse = pulseRef.current
      if (pulse && L > 0) {
        const drawn = draw * L
        if (drawn < 60) {
          pulse.style.opacity = '0'
        } else {
          const pos = ((now - t0) * (PULSE_SPEED / 1000)) % drawn
          pulse.style.opacity = pos > drawn - PULSE_DASH * 3 ? '0' : '0.9'
          pulse.style.strokeDashoffset = (-pos).toFixed(1)
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const setStep = (i: number) => (el: HTMLLIElement | null) => {
    stepRefs.current[i] = el
  }
  const setNode = (i: number) => (el: SVGCircleElement | null) => {
    nodeRefs.current[i] = el
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
          <header className={styles.reveal} ref={headRef}>
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
            {/* The circuit spine — decorative, built to measure in JS. */}
            <svg ref={svgRef} className={styles.spine} aria-hidden="true">
              <defs>
                <linearGradient
                  id="half-process-grad"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="600"
                >
                  <stop offset="0" stopColor="#45F0D8" />
                  <stop offset="0.38" stopColor="#4FC8F0" />
                  <stop offset="0.68" stopColor="#8F8AFF" />
                  <stop offset="1" stopColor="#FF6FB3" />
                </linearGradient>
              </defs>
              <path ref={glowRef} className={styles.traceGlow} />
              <path ref={traceRef} className={styles.trace} />
              <path ref={pulseRef} className={styles.pulse} />
              {STEP_COLORS.map((c, i) => (
                <circle
                  key={c}
                  ref={setNode(i)}
                  className={styles.node}
                  r="7"
                  style={{ '--step-color': c } as CSSProperties}
                />
              ))}
              {/* ground symbol — the line ends earthed: running, stable */}
              <g ref={groundRef} className={styles.ground}>
                <line x1="-12" y1="0" x2="12" y2="0" />
                <line x1="-7.5" y1="5" x2="7.5" y2="5" />
                <line x1="-3.5" y1="10" x2="3.5" y2="10" />
              </g>
            </svg>

            <ol className={styles.steps}>
              {t.steps.map((s, i) => (
                <li
                  key={s.index}
                  className={`${styles.step} ${styles.reveal}`}
                  ref={setStep(i)}
                  style={{ '--step-color': STEP_COLORS[i] } as CSSProperties}
                >
                  <p className={styles.index} aria-hidden="true">
                    {s.index}
                  </p>
                  <div>
                    <h3 className={styles.name}>{s.name}</h3>
                    <p className={styles.body}>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
