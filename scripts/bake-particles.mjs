/**
 * Bake HΛLF logo particle home-positions into raw Float32 binaries.
 *
 * Reads lib/logo-polys.json (canonical wordmark polygons, 0..308 × 0..100,
 * y down) and, for each GPU-tier bin size (128², 256², 512²), samples
 * size*size points uniformly inside the polygon union via bounding-box
 * rejection sampling + ray-cast point-in-polygon tests.
 *
 * Layout per particle: RGBA Float32 little-endian = [x, y, z, seed]
 *   x = (px - w/2) / 100   → roughly -1.54 .. 1.54
 *   y = (h/2 - py) / 100   → -0.5 .. 0.5 (y up; bottom half is y < 0)
 *   z = (rand - 0.5) * 0.04
 *   seed = rand 0..1 (per-particle variation in the shaders)
 *
 * Output: public/assets/particles/logo-<SIZE>.bin
 * Run: node scripts/bake-particles.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const logo = JSON.parse(readFileSync(join(root, 'lib', 'logo-polys.json'), 'utf8'))

const SIZES = [128, 256, 512]
const Z_DEPTH = 0.04

/** Ray-casting point-in-polygon (matches lib/logo-geometry.ts). */
function pointInPoly(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function insideAny(px, py, polys) {
  for (const poly of polys) {
    if (pointInPoly(px, py, poly)) return true
  }
  return false
}

// Bounding box of the polygon union (sampling domain for rejection).
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
for (const poly of logo.polys) {
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
}
const bboxW = maxX - minX
const bboxH = maxY - minY
const halfW = logo.w / 2 // 154
const halfH = logo.h / 2 // 50

const outDir = join(root, 'public', 'assets', 'particles')
mkdirSync(outDir, { recursive: true })

for (const size of SIZES) {
  const count = size * size
  const buf = Buffer.alloc(count * 4 * 4) // RGBA Float32
  let written = 0
  let offset = 0
  let attempts = 0

  while (written < count) {
    attempts++
    const px = minX + Math.random() * bboxW
    const py = minY + Math.random() * bboxH
    if (!insideAny(px, py, logo.polys)) continue

    // logo grid (y down) → world (y up), centered
    buf.writeFloatLE((px - halfW) / 100, offset) // x
    buf.writeFloatLE((halfH - py) / 100, offset + 4) // y
    buf.writeFloatLE((Math.random() - 0.5) * Z_DEPTH, offset + 8) // z
    buf.writeFloatLE(Math.random(), offset + 12) // seed
    offset += 16
    written++
  }

  const file = join(outDir, `logo-${size}.bin`)
  writeFileSync(file, buf)
  const kb = (buf.length / 1024).toFixed(0)
  const acceptance = ((count / attempts) * 100).toFixed(1)
  console.log(`logo-${size}.bin  ${count} pts  ${kb} KB  (acceptance ${acceptance}%)`)
}
