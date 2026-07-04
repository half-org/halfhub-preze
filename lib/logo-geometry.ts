/**
 * HΛLF wordmark as raw polygons on a 0..308 × 0..100 grid (y grows down).
 * Canonical data lives in lib/logo-polys.json. Used by the SVG LogoMark
 * (nav + loader).
 *
 * Brand motif: the logo is split horizontally at y=50 — top half solid,
 * bottom half outlined/dissolving ("half").
 */
import logoData from './logo-polys.json'

export type Poly = [number, number][]

export const LOGO_W: number = logoData.w
export const LOGO_H: number = logoData.h

export const LOGO_POLYS: Poly[] = logoData.polys as Poly[]

export function polyToPath(poly: Poly): string {
  return `M${poly.map(([x, y]) => `${x},${y}`).join('L')}Z`
}

export function pointInPoly(px: number, py: number, poly: Poly): boolean {
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
