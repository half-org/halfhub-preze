import { SERVICES } from './content'
import { SECTIONS } from './sections'

const PAD = 0.07 // head padding within the services section
// The sticky text viewport releases at (H-1)/H local. Complete the deck
// 0.4 viewport-heights earlier so the LAST card gets a settled, fully
// pinned reading window instead of focusing while its text scrolls away.
const H = SECTIONS.find((s) => s.id === 'services')!.height
const END = (H - 1.4) / H

/**
 * Single source of truth mapping local services-section progress (0..1)
 * to the active card. Used by BOTH the canvas ServicesScene and the DOM
 * overlay so they can never disagree.
 *
 * Returns: `f` continuous card position (0..n-1), `active` rounded index,
 * `t` progress within the active card (-0.5..0.5 from its center).
 */
export function serviceProgress(local: number): {
  f: number
  active: number
  t: number
} {
  const n = SERVICES.length
  const x = Math.min(Math.max((local - PAD) / (END - PAD), 0), 1)
  const f = x * (n - 1)
  const active = Math.min(Math.max(Math.round(f), 0), n - 1)
  return { f, active, t: f - active }
}
