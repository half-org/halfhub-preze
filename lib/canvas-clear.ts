'use client'

import { useEffect, useState } from 'react'

/**
 * DOM ↔ canvas layout contract for narrow (stacked) layouts.
 *
 * Sections that pair a text column with canvas meshes mark their sticky
 * viewport with `data-canvas-viewport="<id>"` and every content block that
 * meshes must not cover with `data-canvas-measure="<id>"`. Canvas scenes
 * read the measured extent (as fractions of the sticky viewport height) and
 * place meshes into the space the text actually leaves free — instead of
 * guessing world offsets that break the moment copy or font sizes change.
 */
export type Clearance = { top: number; bottom: number }

export function measureClearance(section: string): Clearance | null {
  const vp = document.querySelector(`[data-canvas-viewport="${section}"]`)
  if (!vp) return null
  const vpRect = vp.getBoundingClientRect()
  if (vpRect.height <= 0) return null
  let top = Infinity
  let bottom = -Infinity
  document.querySelectorAll(`[data-canvas-measure="${section}"]`).forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.height <= 0) return
    if (r.top < top) top = r.top
    if (r.bottom > bottom) bottom = r.bottom
  })
  if (top === Infinity) return null
  return {
    top: (top - vpRect.top) / vpRect.height,
    bottom: (bottom - vpRect.top) / vpRect.height,
  }
}

/**
 * Measured clearance, refreshed on resize (and once more after fonts/layout
 * settle). Returns null until measured or when the section isn't marked.
 */
export function useClearance(section: string, enabled: boolean): Clearance | null {
  const [clear, setClear] = useState<Clearance | null>(null)

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const update = () => setClear(measureClearance(section))
    const t1 = window.setTimeout(update, 60)
    const t2 = window.setTimeout(update, 800) // after web fonts swap in
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [section, enabled])

  return enabled ? clear : null
}
