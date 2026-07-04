'use client'

import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { AutomationWizard } from './AutomationWizard'
import { useScramble } from './useScramble'
import styles from './Cta.module.css'

const H = SECTIONS.find((s) => s.id === 'cta')!.height

/**
 * Decorative "clickable demo" loop: a schematic app window where a cursor
 * clicks the try-it button, a progress bar fills, chart bars grow and a toggle
 * flips — then it resets and runs again. One shared 8s CSS timeline; the
 * static (no-animation / reduced-motion) state is the COMPLETED demo, with
 * cursor and ripple hidden.
 */
function DemoWindow({ t }: { t: { title: string; button: string } }) {
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 440 300"
      fill="none"
      aria-hidden="true"
    >
      {/* Window chrome */}
      <rect
        x="20.5"
        y="30.5"
        width="399"
        height="239"
        rx="10"
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.2)"
      />
      <circle cx="40" cy="48" r="1.8" fill="rgba(255,255,255,0.3)" />
      <circle cx="51" cy="48" r="1.8" fill="rgba(255,255,255,0.3)" />
      <circle cx="62" cy="48" r="1.8" fill="rgba(255,255,255,0.3)" />
      <text x="80" y="51.5" className={styles.diagTitle} fill="#8f8f8f">
        {t.title.toUpperCase()}
      </text>
      <line x1="21" y1="64" x2="419" y2="64" stroke="rgba(255,255,255,0.14)" />

      {/* Content placeholders */}
      <rect x="44" y="88" width="150" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
      <rect x="44" y="100" width="104" height="4" rx="2" fill="rgba(255,255,255,0.07)" />

      {/* Progress bar */}
      <rect x="44" y="132" width="180" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
      <rect
        className={styles.demoProgress}
        x="44"
        y="132"
        width="180"
        height="4"
        rx="2"
        fill="var(--accent)"
        fillOpacity="0.75"
      />

      {/* Toggle */}
      <rect
        x="44"
        y="154"
        width="32"
        height="16"
        rx="8"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.2)"
      />
      <circle className={styles.demoKnob} cx="68" cy="162" r="5" fill="var(--accent)" />

      {/* Try-it button */}
      <rect
        x="44"
        y="196"
        width="122"
        height="34"
        rx="17"
        fill="rgba(69, 240, 216, 0.06)"
        stroke="rgba(69, 240, 216, 0.5)"
      />
      <rect
        className={styles.demoBtnFill}
        x="44"
        y="196"
        width="122"
        height="34"
        rx="17"
        fill="var(--accent)"
        fillOpacity="0.22"
      />
      <text x="105" y="216.5" textAnchor="middle" className={styles.diagBtn} fill="var(--accent)">
        {t.button.toUpperCase()}
      </text>

      {/* Bar chart */}
      <line x1="272" y1="230" x2="400" y2="230" stroke="rgba(255,255,255,0.14)" />
      <rect className={styles.demoBar1} x="280" y="170" width="24" height="60" fill="var(--accent)" fillOpacity="0.25" />
      <rect className={styles.demoBar2} x="316" y="135" width="24" height="95" fill="var(--accent)" fillOpacity="0.45" />
      <rect className={styles.demoBar3} x="352" y="100" width="24" height="130" fill="var(--accent)" fillOpacity="0.7" />

      {/* Click ripple + cursor (hidden at rest, brought alive by the loop) */}
      <circle className={styles.demoRipple} cx="105" cy="213" r="15" stroke="var(--accent)" strokeWidth="1.5" />
      <g className={styles.demoCursor}>
        <path
          d="M0 0 L0 14.5 L3.6 11.2 L6 16.5 L8.6 15.3 L6.2 10.1 L11 9.6 Z"
          fill="#f2f2f2"
          stroke="#050505"
          strokeWidth="1"
        />
      </g>
    </svg>
  )
}

/**
 * CTA section — natural flow (not sticky) inside the 250vh room:
 * Block 1 (~100vh, centered) — the free-demo offer with a mailto pill.
 * Block 2 (~100vh+, content-sized) — the AI automation-map wizard.
 * The pink particle field behind it is rendered by the canvas world.
 */
export function CtaSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].cta
  const email = COPY[lang].contact.email
  const { ref, start } = useScramble<HTMLSpanElement>(t.demo.cta)

  return (
    <section
      id="cta"
      aria-labelledby="cta-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.block}>
        <div className={styles.demoGrid}>
          <div>
            <p className={styles.kicker}>
              <span aria-hidden="true">{'// 06 — '}</span>
              {t.demo.kicker}
            </p>
            <h2 id="cta-heading" className={styles.heading}>
              {t.demo.heading}
            </h2>
            <p className={styles.body}>{t.demo.body}</p>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(t.demo.mailSubject)}`}
              className={styles.ctaBtn}
              onPointerEnter={start}
              onFocus={start}
            >
              <span ref={ref}>{t.demo.cta}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </a>
          </div>
          <div className={styles.diagramWrap}>
            <DemoWindow t={t.demo.diagram} />
          </div>
        </div>
      </div>

      <div className={`${styles.block} ${styles.auditBlock}`}>
        <AutomationWizard lang={lang} />
      </div>
    </section>
  )
}
