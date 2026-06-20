import type { GPUPolicy } from './types'

const DESKTOP_TIERS: [RegExp, 0 | 1 | 2 | 3 | 4 | 5][] = [
  [/(rtx\s?[2-9]\d{3}|radeon rx [67]\d{3}|apple m\d+\s?(pro|max|ultra))/i, 5],
  [/(rtx|gtx 16|radeon rx|apple m\d+)/i, 4],
  [/(gtx|radeon|iris xe|arc)/i, 3],
  [/(iris|intel.*6\d{2}|uhd)/i, 2],
  [/(intel|hd graphics)/i, 1],
]

const MOBILE_TIERS: [RegExp, 0 | 1 | 2 | 3 | 4 | 5][] = [
  [/(apple a1[6-9]|apple a[2-9]\d|adreno 7[4-9]\d|immortalis)/i, 5],
  [/(apple a1[4-5]|adreno 7\d{2}|mali-g7)/i, 4],
  [/(apple a1[2-3]|adreno 6[4-9]\d|mali-g5)/i, 3],
  [/(apple a1[0-1]|adreno 6\d{2})/i, 2],
  [/(adreno 5|mali-t)/i, 1],
]

function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

let cached: GPUPolicy | null = null

export function getGPUPolicy(): GPUPolicy {
  if (cached) return cached
  const mobile = isMobileUA()

  const reduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches

  let tier: 0 | 1 | 2 | 3 | 4 | 5 = mobile ? 2 : 3 // unknown → middle tier
  let webglOK = false

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2')
      if (gl) {
        webglOK = true
        const ext = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = ext
          ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase()
          : ''
        const table = mobile ? MOBILE_TIERS : DESKTOP_TIERS
        for (const [re, t] of table) {
          if (re.test(renderer)) { tier = t; break }
        }
        // Safari masks the renderer ("apple gpu") — assume mid-high Apple silicon
        if (/apple gpu/.test(renderer)) tier = mobile ? 3 : 4
        const lose = gl.getExtension('WEBGL_lose_context')
        lose?.loseContext()
      }
    } catch {
      webglOK = false
    }
  }

  // ?gpu=N override for testing
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('gpu')
    if (q !== null) {
      const n = Number(q)
      if (n >= 0 && n <= 5) tier = n as 0 | 1 | 2 | 3 | 4 | 5
    }
  }

  cached = {
    webglDisabled: reduced || !webglOK || tier === 0,
    tier,
    mobile,
    dpr: Math.min(([0.8, 1, 1.25, 1.5, 2, 2] as const)[tier], typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1),
    fpsCap: tier <= 1 ? 30 : 60,
    // mobile caps at 256² (65k points) — 512² additive points at dpr 2 melts phones
    particleTexSize: (mobile
      ? ([128, 128, 256, 256, 256, 256] as const)
      : ([128, 128, 256, 256, 512, 512] as const))[tier],
    bloom: tier >= 3 && !mobile,
    heavyFX: tier >= 3,
  }
  return cached
}
