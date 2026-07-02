'use client'

import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { AutomationWizard } from './AutomationWizard'
import { useScramble } from './useScramble'
import styles from './Cta.module.css'

const H = SECTIONS.find((s) => s.id === 'cta')!.height

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

      <div className={`${styles.block} ${styles.auditBlock}`}>
        <AutomationWizard lang={lang} />
      </div>
    </section>
  )
}
