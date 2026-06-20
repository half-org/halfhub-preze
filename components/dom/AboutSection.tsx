import { COPY } from '@/lib/content'
import { SECTIONS } from '@/lib/sections'
import type { Lang } from '@/lib/types'
import styles from './About.module.css'

const H = SECTIONS.find((s) => s.id === 'about')!.height

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

export function AboutSection({ lang }: { lang: Lang }) {
  const t = COPY[lang].about
  const [solid, outline] = splitHalf(t.heading)
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className={styles.section}
      style={{ height: `${H * 100}vh` }}
    >
      <div className={styles.viewport}>
        <div className={styles.inner}>
          <p className={styles.kicker}>
            <span aria-hidden="true">{'// 03 — '}</span>
            {t.kicker}
          </p>
          {/* Brand motif: first half solid, second half dissolving to outline. */}
          <h2 id="about-heading" className={styles.heading}>
            <span>{solid}</span>
            <span className={styles.outline}>{outline}</span>
          </h2>
          <p className={styles.body}>{t.body}</p>
        </div>
      </div>
    </section>
  )
}
