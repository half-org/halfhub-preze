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

/**
 * Decorative brand-motif circle: the left half is a dashed outline (the idea,
 * still unformed), the right half a solid stroke (HALF — the execution), with
 * a single point of contact slowly orbiting the seam. CSS dash drift pauses
 * under prefers-reduced-motion; the SMIL orbit dot is hidden there.
 */
function HalvesCircle({
  t,
}: {
  t: { idea: string; half: string; sub: string }
}) {
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 340 340"
      fill="none"
      aria-hidden="true"
    >
      {/* Left half: dashed outline — the idea. */}
      <path
        className={styles.ideaArc}
        d="M170 40 A130 130 0 0 0 170 300"
        stroke="#f2f2f2"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="3 8"
      />
      {/* Right half: solid — the delivery. */}
      <path
        d="M170 40 A130 130 0 0 1 170 300"
        stroke="#f2f2f2"
        strokeOpacity="0.9"
        strokeWidth="1.5"
      />
      {/* Seam between the halves. */}
      <line
        x1="170"
        y1="52"
        x2="170"
        y2="288"
        stroke="rgba(255,255,255,0.14)"
        strokeDasharray="2 6"
      />
      {/* Orbiting point of contact. */}
      <path
        id="about-orbit"
        d="M170 40 A130 130 0 0 1 170 300 A130 130 0 0 1 170 40"
        stroke="none"
      />
      <circle className={styles.orbitDot} r="3" fill="var(--accent)">
        <animateMotion dur="10s" repeatCount="indefinite">
          <mpath href="#about-orbit" />
        </animateMotion>
      </circle>
      <text x="102" y="174" textAnchor="middle" className={styles.diagIdea} fill="#9a9a9a">
        {t.idea.toUpperCase()}
      </text>
      <text x="238" y="170" textAnchor="middle" className={styles.diagHalf} fill="#f2f2f2">
        {t.half}
      </text>
      <text x="238" y="190" textAnchor="middle" className={styles.diagSub} fill="var(--accent)">
        {t.sub.toUpperCase()}
      </text>
    </svg>
  )
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
        <div className={styles.grid}>
          <div className={styles.inner}>
            <p className={styles.kicker}>
              <span aria-hidden="true">{'// 05 — '}</span>
              {t.kicker}
            </p>
            {/* Brand motif: first half solid, second half dissolving to outline. */}
            <h2 id="about-heading" className={styles.heading}>
              <span>{solid}</span>
              <span className={styles.outline}>{outline}</span>
            </h2>
            <p className={styles.body}>{t.body}</p>
          </div>
          <div className={styles.diagramWrap}>
            <HalvesCircle t={t.diagram} />
          </div>
        </div>
      </div>
    </section>
  )
}
