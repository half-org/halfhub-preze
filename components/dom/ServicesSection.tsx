import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { ServicesStage } from './ServicesStage'
import styles from './Services.module.css'

const H = SECTIONS.find((s) => s.id === 'services')!.height

/**
 * Scroll-synced services overlay. The outer section provides the scroll room
 * (height from lib/sections.ts); the sticky viewport hosts the stage.
 * All 7 services are rendered into the initial HTML (SEO baseline) by
 * ServicesStage — only their visibility is scroll-driven.
 */
export function ServicesSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].services
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport} data-canvas-viewport="services">
        <header className={styles.head} data-canvas-measure="services">
          <p className={styles.kicker}>
            <span aria-hidden="true">{'// 02 — '}</span>
            {t.kicker}
          </p>
          <h2 id="services-heading" className={styles.heading}>
            {t.heading}
          </h2>
        </header>
        <ServicesStage lang={lang} />
      </div>
    </section>
  )
}
