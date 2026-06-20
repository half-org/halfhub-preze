import { SERVICES } from './content'

const PAD = 0.07 // head/tail padding within the services section

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
  const x = Math.min(Math.max((local - PAD) / (1 - 2 * PAD), 0), 1)
  const f = x * (n - 1)
  const active = Math.min(Math.max(Math.round(f), 0), n - 1)
  return { f, active, t: f - active }
}
