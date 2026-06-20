/**
 * Normalized pointer state (-1..1, y up), read per-frame by canvas code.
 * `sx`/`sy` are smoothed copies — World lerps them each frame (factor ~0.07).
 */
export const pointerState = {
  x: 0,
  y: 0,
  sx: 0,
  sy: 0,
  down: false,
  /** accumulated drag delta while down, lerped toward 0 when released */
  dragX: 0,
  dragY: 0,
}

let inited = false

export function initPointer() {
  if (inited || typeof window === 'undefined') return
  inited = true
  let lastX = 0
  let lastY = 0
  window.addEventListener('pointermove', (e) => {
    pointerState.x = (e.clientX / window.innerWidth) * 2 - 1
    pointerState.y = -((e.clientY / window.innerHeight) * 2 - 1)
    if (pointerState.down) {
      pointerState.dragX += (e.clientX - lastX) / window.innerWidth
      pointerState.dragY += (e.clientY - lastY) / window.innerHeight
    }
    lastX = e.clientX
    lastY = e.clientY
  }, { passive: true })
  window.addEventListener('pointerdown', (e) => {
    pointerState.down = true
    lastX = e.clientX
    lastY = e.clientY
  }, { passive: true })
  window.addEventListener('pointerup', () => { pointerState.down = false }, { passive: true })
  window.addEventListener('pointercancel', () => { pointerState.down = false }, { passive: true })
}
