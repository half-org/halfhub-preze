import { REFERENCES } from './content'

// Long head/tail padding — with only 2 projects each one gets a comfortable,
// slow focus window inside the references section.
const PAD = 0.16

/**
 * Single source of truth mapping local references-section progress (0..1)
 * to the active project. Used by BOTH the canvas ReferencesScene and the DOM
 * overlay so they can never disagree (mirror of lib/services-progress.ts).
 *
 * Returns: `f` continuous deck position (0..n-1), `active` rounded index,
 * `t` progress within the active project (-0.5..0.5 from its center).
 */
export function refsProgress(local: number): {
  f: number
  active: number
  t: number
} {
  const n = REFERENCES.length
  const x = Math.min(Math.max((local - PAD) / (1 - 2 * PAD), 0), 1)
  const f = x * (n - 1)
  const active = Math.min(Math.max(Math.round(f), 0), n - 1)
  return { f, active, t: f - active }
}
