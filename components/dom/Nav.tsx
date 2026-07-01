'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { COPY } from '@/lib/content'
import { SECTION_RANGES } from '@/lib/sections'
import { scrollState, scrollToId } from '@/lib/scroll'
import type { Lang } from '@/lib/types'
import { useScramble } from './useScramble'
import { LogoMark } from './LogoMark'
import styles from './Nav.module.css'

const HERO_END = SECTION_RANGES[0].range[1]
const FADE_A = HERO_END * 0.55
const FADE_B = HERO_END * 0.95

function NavLink({ id, label, className }: { id: string; label: string; className?: string }) {
  const { ref, start } = useScramble<HTMLSpanElement>(label)
  return (
    <a
      href={`#${id}`}
      className={`${styles.link}${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        e.preventDefault()
        scrollToId(id)
      }}
      onPointerEnter={start}
      onFocus={start}
    >
      <span ref={ref}>{label}</span>
    </a>
  )
}

function LangLink({ href, label }: { href: string; label: string }) {
  const { ref, start } = useScramble<HTMLSpanElement>(label)
  return (
    <Link href={href} className={styles.lang} onPointerEnter={start} onFocus={start}>
      <span ref={ref}>{label}</span>
    </Link>
  )
}

export function Nav({ lang }: { lang: Lang }) {
  const t = COPY[lang].nav
  const bgRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // Background fade-in past the hero + gentle scroll-velocity wobble.
  // Per-frame values via direct style writes — no React state in the loop.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const loop = () => {
      const p = scrollState.progress
      const o = Math.min(Math.max((p - FADE_A) / (FADE_B - FADE_A), 0), 1)
      if (bgRef.current) bgRef.current.style.opacity = o.toFixed(3)
      if (!reduced && rowRef.current) {
        const v = Math.max(-6, Math.min(6, scrollState.velocity * -0.15))
        rowRef.current.style.transform = `translate3d(0, ${v.toFixed(2)}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <header className={styles.header}>
      <div ref={bgRef} className={styles.bg} aria-hidden="true" />
      <div ref={rowRef} className={styles.row}>
        <a
          href="#home"
          className={styles.wordmark}
          aria-label="HALF"
          onClick={(e) => {
            e.preventDefault()
            scrollToId('home')
          }}
        >
          <LogoMark size={16} mode="full" decorative />
        </a>
        <nav className={styles.nav}>
          <NavLink id="services" label={t.services} />
          <NavLink id="references" label={t.references} />
          <NavLink id="about" label={t.about} className={styles.hideSm} />
          <NavLink id="cta" label={t.demo} className={styles.hideSm} />
          <NavLink id="contact" label={t.contact} />
          <LangLink href={t.langHref} label={t.lang} />
        </nav>
      </div>
    </header>
  )
}
