'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AUDIT_TASKS } from '@/lib/audit-data'
import { COPY, SERVICES } from '@/lib/content'
import type { Lang } from '@/lib/types'
import { useScramble } from './useScramble'
import styles from './Cta.module.css'

const COLOR: Record<string, string> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s.color]),
)
const TASK_COUNT = String(AUDIT_TASKS.length).padStart(2, '0')

/* Transient scan flicker + hours unit — decorative terminal chrome, not COPY. */
const SCAN_TEXT = { cs: '> analyzuji…', en: '> analyzing…' } as const
const HOURS_UNIT = { cs: 'h/týden', en: 'h/week' } as const
const SCAN_MS = 350

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Terminal-styled automation audit. Pure client-side toggle state — no
 * network, no storage; the only outbound channel is the mailto: link that
 * serializes the current selection into the e-mail body.
 */
export function AutomationAudit({ lang }: { lang: Lang }) {
  const t = COPY[lang].cta.audit
  const email = COPY[lang].contact.email
  const unit = HOURS_UNIT[lang]

  // Selection order drives the log order.
  const [selected, setSelected] = useState<string[]>([])
  // Tasks currently in the brief '> analyzing…' scan phase.
  const [scanning, setScanning] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach((id) => window.clearTimeout(id))
  }, [])

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((x) => x !== id))
      setScanning((s) => {
        if (!s.has(id)) return s
        const next = new Set(s)
        next.delete(id)
        return next
      })
      return
    }
    setSelected((prev) => [...prev, id])
    if (prefersReduced()) return // resolve instantly
    setScanning((s) => new Set(s).add(id))
    timers.current.push(
      window.setTimeout(() => {
        setScanning((s) => {
          if (!s.has(id)) return s
          const next = new Set(s)
          next.delete(id)
          return next
        })
      }, SCAN_MS),
    )
  }

  const selectedTasks = useMemo(
    () => selected.map((id) => AUDIT_TASKS.find((task) => task.id === id)!),
    [selected],
  )
  const totals = useMemo<[number, number]>(
    () =>
      selectedTasks.reduce<[number, number]>(
        (acc, task) => [acc[0] + task.hours[0], acc[1] + task.hours[1]],
        [0, 0],
      ),
    [selectedTasks],
  )

  // Displayed total — quick rAF count toward the real sum (instant under
  // prefers-reduced-motion).
  const [shown, setShown] = useState<[number, number]>([0, 0])
  const shownRef = useRef<[number, number]>([0, 0])
  useEffect(() => {
    const from = shownRef.current
    if (from[0] === totals[0] && from[1] === totals[1]) return
    if (prefersReduced()) {
      shownRef.current = totals
      setShown(totals)
      return
    }
    const t0 = performance.now()
    const D = 320
    let raf = 0
    const step = (now: number) => {
      const k = Math.min((now - t0) / D, 1)
      const e = 1 - (1 - k) * (1 - k)
      const val: [number, number] = [
        Math.round(from[0] + (totals[0] - from[0]) * e),
        Math.round(from[1] + (totals[1] - from[1]) * e),
      ]
      shownRef.current = val
      setShown(val)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [totals])

  // mailto body: one line per task, blank line, total, blank line, source tag.
  const mailHref = useMemo(() => {
    const lines = selectedTasks.map((task) => {
      const verdict = t.verdicts[task.verdict]
      return task.verdict === 'fine'
        ? `${task[lang]} — ${verdict}`
        : `${task[lang]} — ${verdict} — ~${task.hours[0]}–${task.hours[1]} ${unit}`
    })
    const body = [
      ...lines,
      '',
      `~${totals[0]}–${totals[1]} h ${t.totalLabel}`,
      '',
      'Web: half — automatizační audit',
    ].join('\n')
    return `mailto:${email}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(body)}`
  }, [selectedTasks, totals, t, lang, unit, email])

  const { ref: sendRef, start: sendStart } = useScramble<HTMLSpanElement>(t.send)

  return (
    <div className={styles.audit}>
      <h3 className={styles.auditHeading}>{t.heading}</h3>

      <div className={styles.terminal}>
        <div className={styles.termHead}>
          <span>
            <span className={styles.termAccent}>AUDIT</span>
            {' — '}
            {t.kicker}
          </span>
          <span className={styles.termCount}>
            {String(selected.length).padStart(2, '0')}&nbsp;/&nbsp;{TASK_COUNT}
          </span>
        </div>

        <div className={styles.termBody}>
          <p className={styles.prompt}>
            <span className={styles.promptMark} aria-hidden="true">
              {'> '}
            </span>
            {t.prompt}
            <span className={styles.cursor} aria-hidden="true" />
          </p>
          <p className={styles.hint}>{t.hint}</p>

          <div className={styles.chips} role="group" aria-label={t.prompt}>
            {AUDIT_TASKS.map((task) => {
              const sel = selected.includes(task.id)
              const color = COLOR[task.serviceId]
              return (
                <button
                  key={task.id}
                  type="button"
                  className={styles.chip}
                  aria-pressed={sel}
                  style={
                    sel
                      ? { borderColor: color, color, backgroundColor: `${color}14` }
                      : undefined
                  }
                  onClick={() => toggle(task.id)}
                >
                  <span aria-hidden="true">{sel ? '[x] ' : '[ ] '}</span>
                  {task[lang]}
                </button>
              )
            })}
          </div>

          <div className={styles.log} aria-live="polite">
            {selectedTasks.map((task) => {
              if (scanning.has(task.id)) {
                return (
                  <p
                    key={task.id}
                    className={`${styles.logLine} ${styles.scanLine}`}
                    aria-hidden="true"
                  >
                    {SCAN_TEXT[lang]}
                  </p>
                )
              }
              const color = COLOR[task.serviceId]
              const fine = task.verdict === 'fine'
              return (
                <p key={task.id} className={styles.logLine}>
                  <span className={styles.logMark} style={{ color }} aria-hidden="true">
                    {'✓ '}
                  </span>
                  {task[lang]}{' '}
                  <span className={styles.logTag} style={fine ? undefined : { color }}>
                    [{t.verdicts[task.verdict]}
                    {fine ? '' : ` · ~${task.hours[0]}–${task.hours[1]} ${unit}`}]
                  </span>
                </p>
              )
            })}
          </div>

          {selected.length === 0 ? (
            <p className={styles.empty}>{t.empty}</p>
          ) : (
            <div className={styles.result}>
              <p className={styles.total}>
                <span className={styles.totalNumber}>
                  ~{shown[0]}–{shown[1]}&nbsp;h
                </span>
                <span className={styles.totalLabel}>{t.totalLabel}</span>
              </p>
              <a
                href={mailHref}
                className={`${styles.ctaBtn} ${styles.send}`}
                onPointerEnter={sendStart}
                onFocus={sendStart}
              >
                <span ref={sendRef}>{t.send}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </a>
              <p className={styles.sendHint}>{t.sendHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
