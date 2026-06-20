/**
 * Milestone-gated loader state (AT pattern: gate on readiness events, not bytes).
 * Milestones: renderer created → hero scene GPU-ready → DOM UI mounted.
 * Displayed progress is capped at 90% until everything fires.
 */
export type Milestone = 'renderer' | 'hero' | 'ui'

const milestones: Record<Milestone, boolean> = {
  renderer: false,
  hero: false,
  ui: false,
}

const listeners = new Set<() => void>()

let snapshot = { target: 0, complete: false }

function recompute() {
  const done = Object.values(milestones).filter(Boolean).length
  const complete = done === 3
  snapshot = { target: done / 3, complete }
  if (complete) worldFade.target = 1
  listeners.forEach((fn) => fn())
}

export const loaderState = {
  set(m: Milestone) {
    if (milestones[m]) return
    milestones[m] = true
    recompute()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
  getSnapshot() {
    return snapshot
  },
  /** Server snapshot for useSyncExternalStore */
  getServerSnapshot() {
    return snapshot
  },
}

/**
 * Global world fade (composite `uVisible`). World lerps `value` toward `target`
 * each frame over ~design.composite.fadeInSeconds — masks late asset pop-in.
 */
export const worldFade = { value: 0, target: 0 }
