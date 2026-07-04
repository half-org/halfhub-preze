import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { ContactEmail } from './ContactEmail'
import { ContactStatus } from './ContactStatus'
import styles from './Contact.module.css'

const H = SECTIONS.find((s) => s.id === 'contact')!.height

/**
 * Decorative "ping" — expanding signal rings from a point, the visual for
 * "spojme se". Rings animate via CSS (staggered); under reduced motion only
 * the static boundary ring and the center dot remain.
 */
function SignalPing() {
  return (
    <svg
      className={styles.ping}
      viewBox="0 0 300 300"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="150" cy="150" r="130" stroke="rgba(255,255,255,0.09)" />
      <circle className={styles.pingRing} cx="150" cy="150" r="130" stroke="var(--accent)" strokeOpacity="0.5" />
      <circle
        className={`${styles.pingRing} ${styles.pingRing2}`}
        cx="150"
        cy="150"
        r="130"
        stroke="var(--accent)"
        strokeOpacity="0.5"
      />
      <circle
        className={`${styles.pingRing} ${styles.pingRing3}`}
        cx="150"
        cy="150"
        r="130"
        stroke="var(--accent)"
        strokeOpacity="0.5"
      />
      {/* Crosshair + center dot */}
      <line x1="150" y1="128" x2="150" y2="140" stroke="rgba(255,255,255,0.25)" />
      <line x1="150" y1="160" x2="150" y2="172" stroke="rgba(255,255,255,0.25)" />
      <line x1="128" y1="150" x2="140" y2="150" stroke="rgba(255,255,255,0.25)" />
      <line x1="160" y1="150" x2="172" y2="150" stroke="rgba(255,255,255,0.25)" />
      <circle cx="150" cy="150" r="3" fill="var(--accent)" />
    </svg>
  )
}

export function ContactSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].contact
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <SignalPing />
        <div className={styles.kickerRow}>
          <p className={styles.kicker}>
            <span aria-hidden="true">{'// 08 — '}</span>
            {t.kicker}
          </p>
          <ContactStatus label={t.status} />
        </div>
        <h2 id="contact-heading" className={styles.heading}>
          {t.heading}
        </h2>
        <p className={styles.body}>{t.body}</p>
        <p className={styles.ctaLabel} aria-hidden="true">
          {t.cta}
        </p>
        <ContactEmail lang={lang} />
      </div>
    </section>
  )
}
