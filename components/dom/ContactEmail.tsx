'use client'

import { COPY } from '@/lib/content'
import type { Lang } from '@/lib/types'
import { useScramble } from './useScramble'
import styles from './Contact.module.css'

/** The huge mailto CTA — digit-scramble on hover, arrow nudge. */
export function ContactEmail({ lang }: { lang: Lang }) {
  const t = COPY[lang].contact
  const { ref, start } = useScramble<HTMLSpanElement>(t.email)
  return (
    <a
      href={`mailto:${t.email}`}
      className={styles.email}
      onPointerEnter={start}
      onFocus={start}
    >
      <span ref={ref} className={styles.emailText}>
        {t.email}
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </a>
  )
}
