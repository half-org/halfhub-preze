'use client'

import { useCallback, useEffect, useRef } from 'react'
import { scramble, SCRAMBLE_FPS_MS } from '@/lib/scramble'

/**
 * Digit-scramble hover effect at 12fps (lib/scramble.ts).
 * Attach `ref` to the element whose textContent is the plain label and call
 * `start()` on pointerenter / focus. Writes textContent directly (no React
 * state) and always restores the original label at rest.
 */
export function useScramble<T extends HTMLElement>(text: string) {
  const ref = useRef<T | null>(null)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
    if (ref.current) ref.current.textContent = text
  }, [text])

  const start = useCallback(() => {
    if (timer.current !== null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let intensity = 1
    timer.current = window.setInterval(() => {
      if (!ref.current) return
      ref.current.textContent = scramble(text, intensity)
      intensity *= 0.78
      if (intensity < 0.08) stop()
    }, SCRAMBLE_FPS_MS)
  }, [text, stop])

  // restore + clear on unmount (or label change)
  useEffect(() => stop, [stop])

  return { ref, start, stop }
}
