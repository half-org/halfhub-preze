import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import styles from './Hero.module.css'

const H = SECTIONS.find((s) => s.id === 'home')!.height

export function Hero({ lang }: { lang: Lang }) {
  const t = COPY[lang].hero
  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <div className={styles.block}>
          <p className={styles.kicker}>
            <span aria-hidden="true">{'// 01 — '}</span>
            {t.kicker}
          </p>
          <h1 id="home-heading" className={styles.headline}>
            {t.headline}
          </h1>
          <p className={styles.sub}>{t.sub}</p>
          <p className={styles.hint}>
            <span className={styles.hintLine} aria-hidden="true" />
            {t.scrollHint}
          </p>
        </div>
      </div>
    </section>
  )
}
