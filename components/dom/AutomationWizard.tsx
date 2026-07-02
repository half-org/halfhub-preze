'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '@/lib/content'
import {
  INDUSTRIES,
  TEAM_SIZES,
  SYMPTOMS,
  FREQUENCIES,
  buildPlan,
  optionLabel,
  type WizardAnswers,
} from '@/lib/wizard-data'
import type { Lang } from '@/lib/types'
import { useScramble } from './useScramble'
import cta from './Cta.module.css'
import styles from './Wizard.module.css'

const ANALYZE_MS = 900
const VISIBLE_ITEMS = 2
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Three-step AI automation-map wizard. Asks for symptoms and routine (never
 * "what do you want to automate"), then shows a personalized map with a
 * reclaimed-hours estimate: two items in the open, the rest blurred behind
 * the full-report e-mail gate. Pure client-side state — no network, no
 * storage; the only outbound channel is the mailto: the visitor triggers.
 * The plan comes from the rule set in lib/wizard-data.ts; a real AI backend
 * can replace buildPlan later without touching this component.
 */
export function AutomationWizard({ lang }: { lang: Lang }) {
  const t = COPY[lang].cta.wizard
  const email = COPY[lang].contact.email

  const [step, setStep] = useState(0)
  const [industry, setIndustry] = useState('')
  const [team, setTeam] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [freq, setFreq] = useState('')
  const [note, setNote] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [lead, setLead] = useState({ email: '', phone: '', company: '' })
  const [sent, setSent] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const goTo = (next: number) => {
    setStep(next)
    // keep long steps readable — the terminal body scrolls internally
    bodyRef.current?.scrollTo({ top: 0 })
    if (next === 2 && !prefersReduced()) {
      setAnalyzing(true)
      timer.current = window.setTimeout(() => setAnalyzing(false), ANALYZE_MS)
    }
  }

  const toggleSymptom = (id: string) =>
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const answers: WizardAnswers = { industry, team, symptoms, freq, note }
  const plan = useMemo(
    () => (step === 2 ? buildPlan(answers) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, industry, team, symptoms, freq]
  )

  const emailOk = EMAIL_RE.test(lead.email)

  // Full report request: answers + generated map + contact, serialized into
  // the visitor's own e-mail client. Nothing leaves the page until they send.
  const mailHref = useMemo(() => {
    if (!plan) return '#'
    const line = (label: string, value: string) => (value ? `${label}: ${value}` : null)
    const body = [
      line('Obor / Industry', optionLabel(INDUSTRIES, industry, lang)),
      line('Tým / Team', optionLabel(TEAM_SIZES, team, lang)),
      line(
        'Rutina / Routine',
        symptoms.map((id) => optionLabel(SYMPTOMS, id, lang)).join('; ')
      ),
      line('Reporting', optionLabel(FREQUENCIES, freq, lang)),
      line('Poznámka / Note', note.trim()),
      '',
      ...plan.items.map(
        (item, i) =>
          `${i + 1}. ${item[lang].name} — ~${item.scaled[0]}–${item.scaled[1]} ${t.hoursUnit} — ${t.tags[item.complexity]}`
      ),
      `= ~${plan.total[0]}–${plan.total[1]} ${t.hoursUnit} ${t.totalLabel}`,
      '',
      line('E-mail', lead.email),
      line('Telefon / Phone', lead.phone.trim()),
      line('Firma / Company', lead.company.trim()),
      '',
      'Web: half — AI mapa automatizací',
    ]
      .filter((x): x is string => x !== null)
      .join('\n')
    return `mailto:${email}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(body)}`
  }, [plan, industry, team, symptoms, freq, note, lead, lang, t, email])

  const callHref = `mailto:${email}?subject=${encodeURIComponent(t.callSubject)}`
  const { ref: sendRef, start: sendStart } = useScramble<HTMLSpanElement>(t.send)

  const reset = () => {
    setStep(0)
    setIndustry('')
    setTeam('')
    setSymptoms([])
    setFreq('')
    setNote('')
    setLead({ email: '', phone: '', company: '' })
    setSent(false)
  }

  const option = (
    sel: boolean,
    onClick: () => void,
    label: string,
    key: string
  ) => (
    <button
      key={key}
      type="button"
      className={`${styles.option} ${sel ? styles.optionOn : ''}`}
      aria-pressed={sel}
      onClick={onClick}
    >
      <span aria-hidden="true">{sel ? '[x] ' : '[ ] '}</span>
      {label}
    </button>
  )

  return (
    <div className={cta.audit} id="audit">
      <h3 className={cta.auditHeading}>{t.heading}</h3>

      <div className={cta.terminal}>
        <div className={cta.termHead}>
          <span>
            <span className={cta.termAccent}>AUDIT</span>
            {' — '}
            {t.kicker}
          </span>
          <span className={cta.termCount}>
            {t.stepLabel}&nbsp;{String(step + 1).padStart(2, '0')}&nbsp;/&nbsp;03
          </span>
        </div>

        {/* progress bar — one segment per step */}
        <div className={styles.progress} aria-hidden="true">
          {t.steps.map((name, i) => (
            <span
              key={name}
              className={`${styles.progressSeg} ${i <= step ? styles.progressOn : ''}`}
            >
              {name}
            </span>
          ))}
        </div>

        <div ref={bodyRef} className={cta.termBody}>
          {step === 0 && (
            <div key="s0" className={styles.step}>
              <p className={cta.hint}>{t.intro}</p>

              <p className={`${cta.prompt} ${styles.prompt}`}>
                <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                {t.industryPrompt}
                <span className={cta.cursor} aria-hidden="true" />
              </p>
              <div className={styles.optionGrid} role="group" aria-label={t.industryPrompt}>
                {INDUSTRIES.map((o) =>
                  option(industry === o.id, () => setIndustry(o.id), o[lang], o.id)
                )}
              </div>

              <p className={`${cta.prompt} ${styles.prompt}`}>
                <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                {t.teamPrompt}
              </p>
              <div className={styles.optionGrid} role="group" aria-label={t.teamPrompt}>
                {TEAM_SIZES.map((o) =>
                  option(team === o.id, () => setTeam(o.id), o[lang], o.id)
                )}
              </div>

              <div className={styles.nav}>
                <button
                  type="button"
                  className={`${cta.ctaBtn} ${styles.nextBtn}`}
                  disabled={!industry || !team}
                  onClick={() => goTo(1)}
                >
                  {t.next}
                  <span className={cta.arrow} aria-hidden="true">→</span>
                </button>
                {(!industry || !team) && (
                  <span className={styles.navHint}>{t.nextHint}</span>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div key="s1" className={styles.step}>
              <p className={`${cta.prompt} ${styles.promptFirst}`}>
                <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                {t.symptomsPrompt}
                <span className={cta.cursor} aria-hidden="true" />
              </p>
              <p className={cta.hint}>{t.symptomsHint}</p>
              <div className={styles.optionGrid} role="group" aria-label={t.symptomsPrompt}>
                {SYMPTOMS.map((o) =>
                  option(symptoms.includes(o.id), () => toggleSymptom(o.id), o[lang], o.id)
                )}
              </div>

              <p className={`${cta.prompt} ${styles.prompt}`}>
                <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                {t.freqPrompt}
              </p>
              <div className={styles.optionGrid} role="group" aria-label={t.freqPrompt}>
                {FREQUENCIES.map((o) =>
                  option(freq === o.id, () => setFreq(o.id), o[lang], o.id)
                )}
              </div>

              <p className={`${cta.prompt} ${styles.prompt}`}>
                <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                {t.notePrompt}
              </p>
              <p className={cta.hint}>{t.noteHint}</p>
              <textarea
                className={styles.note}
                rows={3}
                value={note}
                placeholder={t.notePlaceholder}
                aria-label={t.notePrompt}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className={styles.nav}>
                <button type="button" className={styles.backBtn} onClick={() => goTo(0)}>
                  ←&nbsp;{t.back}
                </button>
                <button
                  type="button"
                  className={`${cta.ctaBtn} ${styles.nextBtn}`}
                  onClick={() => goTo(2)}
                >
                  {t.generate}
                  <span className={cta.arrow} aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && plan && (
            <div key="s2" className={styles.step} aria-live="polite">
              {analyzing ? (
                <p className={styles.analyzing}>
                  <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                  {t.analyzing}
                  <span className={cta.cursor} aria-hidden="true" />
                </p>
              ) : (
                <>
                  <p className={`${cta.prompt} ${styles.promptFirst}`}>
                    <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                    {t.resultPrompt}
                    <span className={cta.cursor} aria-hidden="true" />
                  </p>
                  <p className={styles.summary}>
                    {optionLabel(INDUSTRIES, industry, lang)}
                    {' · '}
                    {optionLabel(TEAM_SIZES, team, lang)}
                  </p>

                  <p className={`${cta.total} ${styles.total}`}>
                    <span className={cta.totalNumber}>
                      ~{plan.total[0]}–{plan.total[1]}&nbsp;h
                    </span>
                    <span className={cta.totalLabel}>{t.totalLabel}</span>
                  </p>

                  <div className={styles.plan}>
                    {plan.items.slice(0, VISIBLE_ITEMS).map((item) => (
                      <article key={item.id} className={styles.card}>
                        <header className={styles.cardHead}>
                          <h4 className={styles.cardName}>{item[lang].name}</h4>
                          <span className={styles.cardHours}>
                            ~{item.scaled[0]}–{item.scaled[1]}&nbsp;{t.hoursUnit}
                          </span>
                        </header>
                        <p className={styles.cardDesc}>{item[lang].desc}</p>
                        <span className={styles.cardTag}>{t.tags[item.complexity]}</span>
                      </article>
                    ))}

                    {plan.items.length > VISIBLE_ITEMS && (
                      <div className={styles.locked}>
                        <div className={styles.lockedList} aria-hidden="true">
                          {plan.items.slice(VISIBLE_ITEMS).map((item) => (
                            <article key={item.id} className={styles.card}>
                              <header className={styles.cardHead}>
                                <h4 className={styles.cardName}>{item[lang].name}</h4>
                                <span className={styles.cardHours}>
                                  ~{item.scaled[0]}–{item.scaled[1]}&nbsp;{t.hoursUnit}
                                </span>
                              </header>
                              <p className={styles.cardDesc}>{item[lang].desc}</p>
                              <span className={styles.cardTag}>{t.tags[item.complexity]}</span>
                            </article>
                          ))}
                        </div>
                        <p className={styles.lockedNote}>
                          +&nbsp;{plan.items.length - VISIBLE_ITEMS} — {t.lockedNote}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={styles.gate}>
                    <p className={`${cta.prompt} ${styles.prompt}`}>
                      <span className={cta.promptMark} aria-hidden="true">{'> '}</span>
                      {t.emailPrompt}
                    </p>
                    <div className={styles.form}>
                      <input
                        type="email"
                        className={styles.input}
                        value={lead.email}
                        placeholder={t.emailPlaceholder}
                        aria-label={t.emailLabel}
                        autoComplete="email"
                        onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))}
                      />
                      <input
                        type="tel"
                        className={styles.input}
                        value={lead.phone}
                        placeholder={t.phoneLabel}
                        aria-label={t.phoneLabel}
                        autoComplete="tel"
                        onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
                      />
                      <input
                        type="text"
                        className={styles.input}
                        value={lead.company}
                        placeholder={t.companyLabel}
                        aria-label={t.companyLabel}
                        autoComplete="organization"
                        onChange={(e) => setLead((l) => ({ ...l, company: e.target.value }))}
                      />
                    </div>
                    <a
                      href={emailOk ? mailHref : undefined}
                      className={`${cta.ctaBtn} ${cta.send} ${!emailOk ? styles.sendOff : ''}`}
                      aria-disabled={!emailOk}
                      onPointerEnter={sendStart}
                      onFocus={sendStart}
                      onClick={(e) => {
                        if (!emailOk) e.preventDefault()
                        else setSent(true)
                      }}
                    >
                      <span ref={sendRef}>{t.send}</span>
                      <span className={cta.arrow} aria-hidden="true">→</span>
                    </a>
                    {sent ? (
                      <p className={styles.sentNote}>{t.sent}</p>
                    ) : (
                      <p className={cta.sendHint}>{t.sendHint}</p>
                    )}
                    <a href={callHref} className={styles.callLink}>
                      {t.call}
                      <span aria-hidden="true">&nbsp;↗</span>
                    </a>
                  </div>

                  <div className={styles.nav}>
                    <button type="button" className={styles.backBtn} onClick={() => goTo(1)}>
                      ←&nbsp;{t.back}
                    </button>
                    <button type="button" className={styles.backBtn} onClick={reset}>
                      {t.restart}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
