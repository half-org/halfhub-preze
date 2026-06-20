import { COPY } from '@/lib/content'
import type { Lang } from '@/lib/types'
import styles from './Footer.module.css'

export function Footer({ lang }: { lang: Lang }) {
  const t = COPY[lang]
  return (
    <footer className={styles.footer}>
      <span className={styles.line}>{t.footer.line}</span>
      <a className={styles.mail} href={`mailto:${t.contact.email}`}>
        {t.contact.email}
      </a>
    </footer>
  )
}
