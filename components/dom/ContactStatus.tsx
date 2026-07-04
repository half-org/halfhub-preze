'use client'

import { useEffect, useState } from 'react'
import styles from './Contact.module.css'

/**
 * Live studio clock — "Praha, CZ — 14:32:05" with a pulsing online dot.
 * The time renders empty on the server (deterministic) and starts ticking
 * after mount; per-second updates are discrete setState, not per-frame work.
 */
export function ContactStatus({ label }: { label: string }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('cs-CZ', {
        timeZone: 'Europe/Prague',
        hour12: false,
      })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <p className={styles.status}>
      <span className={styles.statusDot} aria-hidden="true" />
      {label.toUpperCase()}
      <span suppressHydrationWarning>{time ? ` — ${time}` : ''}</span>
    </p>
  )
}
