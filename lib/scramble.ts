/**
 * Digit-scramble glitch (AT footer signature): replaces random characters
 * with digits 0–9. Run at ~12fps (83ms interval); `intensity` 0..1 — 1 while
 * animating in, easing to 0 at rest.
 */
export function scramble(text: string, intensity: number): string {
  if (intensity <= 0) return text
  let out = ''
  for (const c of text) {
    out +=
      c !== ' ' && Math.random() < intensity * 0.3
        ? String(Math.floor(Math.random() * 10))
        : c
  }
  return out
}

export const SCRAMBLE_FPS_MS = 83
