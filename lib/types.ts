import type * as THREE from 'three'

export type Lang = 'cs' | 'en'

export type SceneId = 'home' | 'services' | 'about' | 'contact'

export type GPUPolicy = {
  webglDisabled: boolean
  tier: 0 | 1 | 2 | 3 | 4 | 5
  mobile: boolean
  dpr: number
  fpsCap: 30 | 60 | 0 // 0 = uncapped
  particleTexSize: 128 | 256 | 512
  bloom: boolean
  heavyFX: boolean
}

/**
 * Contract for every canvas scene component.
 * The component must render its content via R3F `createPortal(..., scene)`.
 * `range` is the section's normalized [start, end] within global scroll progress;
 * scenes read `scrollState` directly in useFrame for per-frame values.
 */
export type SceneProps = {
  id: SceneId
  scene: THREE.Scene
  policy: GPUPolicy
  range: [number, number]
}

export type Service = {
  id: string
  index: string // '01'..'07'
  color: string // per-service accent hex
  cs: { name: string; tagline: string; points: string[] }
  en: { name: string; tagline: string; points: string[] }
}
