'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import { loaderState } from '@/lib/loader-state'
import { useClearance } from '@/lib/canvas-clear'
import type { GPUPolicy, SceneProps } from '@/lib/types'
import { waveVert, waveFrag } from '@/shaders/wave'

const hero = design.hero

/** Thread/segment counts per GPU tier (particleTexSize doubles as the tier signal). */
function loomDensity(policy: GPUPolicy): { threads: number; segments: number } {
  if (policy.particleTexSize <= 128) return { threads: 42, segments: 110 }
  if (policy.particleTexSize <= 256) return { threads: 58, segments: 150 }
  return { threads: 72, segments: 190 }
}

/**
 * The hero "loom": a calm band of horizontal threads spanning the viewport.
 * The left side ripples with slow turbulence (the unformed idea) and eases
 * into perfectly straight, faintly teal lines on the right (the delivered
 * product) — chaos in → order out, without a single particle. One
 * LineSegments draw call; all motion in the vertex shader (shaders/wave.ts).
 * The pointer raises a gentle swell; scroll tilts and fades the band out.
 */
export function HeroScene({ scene, policy, range }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const flags = useRef({ stepped: false, pointerMoved: false })

  // portrait: lift the band into the free zone above the bottom-anchored copy
  const size = useThree((s) => s.size)
  const portrait = size.width / size.height < 1.05
  const clear = useClearance('home', portrait)
  // world height at this section's resting camera distance (z ≈ 8.8)
  const worldH = 2 * Math.tan((design.camera.fov * Math.PI) / 360) * 8.8
  const lift = portrait && clear ? (0.5 - (0.1 + clear.top) / 2) * worldH : 0

  // ---- static normalized geometry: x = 0..1 along thread, y = row 0..1
  const loom = useMemo(() => {
    const { threads, segments } = loomDensity(policy)
    const verts = new Float32Array(threads * segments * 2 * 3)
    let o = 0
    for (let l = 0; l < threads; l++) {
      const row = threads === 1 ? 0.5 : l / (threads - 1)
      for (let s = 0; s < segments; s++) {
        verts[o++] = s / segments
        verts[o++] = row
        verts[o++] = 0
        verts[o++] = (s + 1) / segments
        verts[o++] = row
        verts[o++] = 0
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3))

    const material = new THREE.ShaderMaterial({
      vertexShader: waveVert,
      fragmentShader: waveFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpanX: { value: 6 },
        uBandH: { value: 4 },
        uAmpChaos: { value: hero.ampChaos * (policy.mobile ? 0.8 : 1) },
        uAmpOrder: { value: hero.ampOrder },
        uNoiseFreq: { value: hero.noiseFreq },
        uSpeed: { value: hero.speed },
        uSeamBoost: { value: hero.seamBoost },
        uPointer: { value: new THREE.Vector3(0, 0, 1000) },
        uPointerRadius: { value: hero.pointerRadius },
        uPointerAmp: { value: hero.pointerAmp },
        uOpacity: { value: hero.opacity },
      },
    })
    return { geometry, material }
  }, [policy])

  useEffect(() => {
    return () => {
      loom.geometry.dispose()
      loom.material.dispose()
    }
  }, [loom])

  const pointerWorld = useMemo(() => new THREE.Vector3(), [])
  const rayDir = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const u = loom.material.uniforms

    const [start, end] = range
    const local = THREE.MathUtils.clamp(
      (scrollState.progress - start) / (end - start),
      0,
      1
    )

    const group = groupRef.current
    if (group) {
      // gentle recline for depth; scroll tips the band a touch further
      group.rotation.x = hero.tilt + local * 0.14
      group.position.y = lift + local * -0.5
    }

    // the band spans the visible viewport (with margin for the edge fade)
    const aspect = state.size.width / state.size.height
    u.uSpanX.value = (worldH * aspect) / 2 + 1.2
    u.uBandH.value = worldH * hero.bandHeight

    // fade out near the end of the hero section
    u.uOpacity.value = hero.opacity * (1 - THREE.MathUtils.smoothstep(local, 0.85, 1))

    // pointer → loom-local space (unproject through the z=0 plane); stays
    // parked far away until the pointer actually moves (touch devices)
    if (!flags.current.pointerMoved && (pointerState.x !== 0 || pointerState.y !== 0)) {
      flags.current.pointerMoved = true
    }
    if (flags.current.pointerMoved && group) {
      const cam = state.camera
      rayDir.set(pointerState.sx, pointerState.sy, 0.5).unproject(cam)
      rayDir.sub(cam.position).normalize()
      if (Math.abs(rayDir.z) > 1e-4) {
        const t = -cam.position.z / rayDir.z
        pointerWorld.copy(cam.position).addScaledVector(rayDir, t)
        group.updateWorldMatrix(true, false)
        group.worldToLocal(pointerWorld)
        pointerWorld.z = 0
        u.uPointer.value.copy(pointerWorld)
      }
    }

    // keep weaving only while the hero can be seen (budget for other scenes)
    const past = scrollState.progress > end + 0.06
    if (!past) u.uTime.value += dt

    if (!flags.current.stepped) {
      flags.current.stepped = true
      loaderState.set('hero') // geometry is synchronous — GPU-ready on frame 1
    }
  })

  return createPortal(
    <group ref={groupRef}>
      <lineSegments
        geometry={loom.geometry}
        material={loom.material}
        frustumCulled={false}
      />
    </group>,
    scene
  )
}
