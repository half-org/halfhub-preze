import type { SceneId } from './types'

/**
 * Single source of truth for the scroll world.
 * `height` = section height in viewport-heights (drives real DOM scroll height).
 * Normalized ranges are derived from these and shared by DOM and canvas.
 */
export const SECTIONS: { id: SceneId; height: number }[] = [
  { id: 'home', height: 2.2 },
  { id: 'services', height: 5.5 },
  { id: 'references', height: 2.6 },
  { id: 'aiready', height: 1.5 },
  { id: 'about', height: 1.6 },
  { id: 'cta', height: 3.2 },
  { id: 'contact', height: 1.6 },
]

export const TOTAL_VH = SECTIONS.reduce((s, x) => s + x.height, 0)

/**
 * Width of the shader-wipe transition zone between sections, in normalized
 * scroll. Every middle section's normalized height must exceed 2*TRANSITION_W
 * or its incoming wipe never resolves before the outgoing one starts
 * (shortest section today: aiready 1.5/18.2 ≈ 0.082 > 0.07).
 */
export const TRANSITION_W = 0.035

export type SectionRange = { id: SceneId; range: [number, number] }

export const SECTION_RANGES: SectionRange[] = (() => {
  let acc = 0
  return SECTIONS.map((s) => {
    const start = acc / TOTAL_VH
    acc += s.height
    return { id: s.id, range: [start, acc / TOTAL_VH] as [number, number] }
  })
})()

/**
 * Resolve global progress (0..1) into the current section, local progress within
 * it, and an optional transition into the next section (0..1 across the boundary).
 */
export function resolveScroll(progress: number): {
  index: number
  local: number
  transition: number // 0 = fully current, 1 = fully next
} {
  const p = Math.min(Math.max(progress, 0), 1)
  let index = SECTION_RANGES.length - 1
  for (let i = 0; i < SECTION_RANGES.length; i++) {
    if (p < SECTION_RANGES[i].range[1]) { index = i; break }
  }
  const [start, end] = SECTION_RANGES[index].range
  const local = end > start ? (p - start) / (end - start) : 0
  let transition = 0
  if (index < SECTION_RANGES.length - 1) {
    const boundary = end
    if (p > boundary - TRANSITION_W) {
      transition = (p - (boundary - TRANSITION_W)) / (2 * TRANSITION_W)
      transition = Math.min(Math.max(transition, 0), 1)
    }
  }
  // when inside the first half of the *next* section's transition zone
  if (index > 0) {
    const prevBoundary = SECTION_RANGES[index].range[0]
    if (p < prevBoundary + TRANSITION_W) {
      // we are just past a boundary: report previous section transitioning out
      const t = (p - (prevBoundary - TRANSITION_W)) / (2 * TRANSITION_W)
      return { index: index - 1, local: 1, transition: Math.min(Math.max(t, 0), 1) }
    }
  }
  return { index, local, transition }
}
