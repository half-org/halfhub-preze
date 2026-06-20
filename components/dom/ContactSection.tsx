import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { ContactEmail } from './ContactEmail'
import styles from './Contact.module.css'

const H = SECTIONS.find((s) => s.id === 'contact')!.height

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
        <p className={styles.kicker}>
          <span aria-hidden="true">{'// 04 — '}</span>
          {t.kicker}
        </p>
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
