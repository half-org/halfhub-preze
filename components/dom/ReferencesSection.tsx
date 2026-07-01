import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import { ReferencesStage } from './ReferencesStage'
import styles from './References.module.css'

const H = SECTIONS.find((s) => s.id === 'references')!.height

/**
 * Scroll-synced references overlay. The outer section provides the scroll
 * room (height from lib/sections.ts); the sticky viewport hosts the stage.
 * Both projects are rendered into the initial HTML (SEO baseline) by
 * ReferencesStage — only their visibility is scroll-driven.
 */
export function ReferencesSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].references
  return (
    <section
      id="references"
      aria-labelledby="references-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      {/* No JS: undo the scroll-deck styling so both projects read as a
          plain stacked list instead of one card and an invisible second. */}
      <noscript>
        <style>{`
          #references .${styles.viewport} { position: static; height: auto; }
          #references .${styles.card} {
            position: static; opacity: 1; transform: none;
            visibility: visible; margin-bottom: 48px;
          }
          #references .${styles.rail} { display: none; }
        `}</style>
      </noscript>
      <div className={styles.viewport}>
        <header className={styles.head}>
          <p className={styles.kicker}>
            <span aria-hidden="true">{'// 03 — '}</span>
            {t.kicker}
          </p>
          <h2 id="references-heading" className={styles.heading}>
            {t.heading}
          </h2>
        </header>
        <ReferencesStage lang={lang} />
      </div>
    </section>
  )
}
