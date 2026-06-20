import Lenis from 'lenis'

/**
 * Per-frame scroll state, read directly inside useFrame (no React state).
 * `progress` 0..1 over the whole document; `velocity` from Lenis (px/frame-ish).
 */
export const scrollState = {
  progress: 0,
  velocity: 0,
  px: 0,
}

let lenis: Lenis | null = null

export function initScroll(mobile: boolean): Lenis {
  if (lenis) return lenis
  lenis = new Lenis({ lerp: mobile ? 0.5 : 0.1 })
  lenis.on('scroll', (e: { scroll: number; limit: number; velocity: number }) => {
    scrollState.px = e.scroll
    scrollState.velocity = e.velocity
    scrollState.progress = e.limit > 0 ? e.scroll / e.limit : 0
  })
  const raf = (t: number) => {
    lenis?.raf(t)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)
  return lenis
}

export function getLenis(): Lenis | null {
  return lenis
}

let fallbackInited = false

/**
 * Native-scroll fallback for the reduced-motion / no-WebGL path: keeps
 * scrollState.progress live (ServicesStage, nav fade) without Lenis.
 * Velocity stays 0 so wobble effects remain off.
 */
export function initScrollFallback() {
  if (lenis || fallbackInited || typeof window === 'undefined') return
  fallbackInited = true
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    scrollState.px = window.scrollY
    scrollState.progress = max > 0 ? window.scrollY / max : 0
  }
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  update()
}

/** Scroll to a section anchor and move keyboard focus with it (WCAG 2.4.3). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
  if (lenis) {
    lenis.scrollTo(el, { duration: 1.4 })
  } else {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }
}
