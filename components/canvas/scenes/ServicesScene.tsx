'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { SERVICES } from '@/lib/content'
import { serviceProgress } from '@/lib/services-progress'
import { SECTION_RANGES, resolveScroll } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import { loaderState } from '@/lib/loader-state'
import type { SceneProps } from '@/lib/types'
import { cardVert, cardFrag } from '@/shaders/card'

const VISIBLE_OFFSET = 3.2

/**
 * Services scene — 7 glassy procedural shader cards flowing through focus
 * as the user scrolls. Card positions derive from the shared
 * `serviceProgress` formula so canvas and DOM overlay always agree.
 * Hover is a manual raycast (R3F pointer events don't cross portals).
 */
export function ServicesScene({ id, scene, policy, range }: SceneProps) {
  const cfg = design.services
  const lowTier = policy.tier <= 1
  // full pictogram detail needs a strong mobile GPU — the default-tier (2)
  // phone gets the simplified variants, not just tier<=1
  const detail = policy.mobile ? policy.tier >= 3 : !lowTier
  const sectionIndex = useMemo(() => SECTION_RANGES.findIndex((r) => r.id === id), [id])
  // layout tracks the CSS breakpoint (760px), not the UA — see ReferencesScene
  const narrow = useThree((s) => s.size.width) <= 760
  const spacing = narrow ? cfg.spacing * 0.85 : cfg.spacing
  const waveAmp = policy.mobile ? 0.04 : 0.08

  const geometry = useMemo(() => {
    const segX = lowTier ? 24 : 48
    const segY = lowTier ? 16 : 32
    return new THREE.PlaneGeometry(cfg.cardW, cfg.cardH, segX, segY)
  }, [lowTier, cfg.cardW, cfg.cardH])

  const materials = useMemo(
    () =>
      SERVICES.map(
        (service, i) =>
          new THREE.ShaderMaterial({
            vertexShader: cardVert,
            // per-service pictogram variant, simplified on weak GPUs
            fragmentShader: cardFrag(i, detail),
            transparent: true,
            depthWrite: false,
            uniforms: {
              uTime: { value: 0 },
              uColor: { value: new THREE.Color(service.color) },
              uHover: { value: 0 },
              uActive: { value: 0 },
              uMouse: { value: new THREE.Vector2() },
              uSeed: { value: i * 7.31 },
              uAspect: { value: cfg.cardW / cfg.cardH },
              uFresnel: { value: cfg.fresnelPower },
              uScan: { value: lowTier ? 0 : 1 },
              uWaveAmp: { value: waveAmp },
            },
          })
      ),
    [lowTier, detail, waveAmp, cfg]
  )

  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const hoverTargets = useRef<number[]>(SERVICES.map(() => 0))
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointerNdc = useMemo(() => new THREE.Vector2(), [])
  const visibleMeshes = useMemo<THREE.Mesh[]>(() => [], [])
  const frameCount = useRef(0)
  const cursorOn = useRef(false)

  useEffect(() => {
    return () => {
      geometry.dispose()
      for (const m of materials) m.dispose()
      if (cursorOn.current) document.body.style.cursor = ''
      cursorOn.current = false
    }
  }, [geometry, materials])

  // warm all 7 pictogram programs once the loader exits — otherwise up to 4
  // of them compile synchronously on the first scroll into the section
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | null = null
    const warm = () => {
      if (!cancelled) gl.compileAsync(scene, camera).catch(() => {})
    }
    if (loaderState.getSnapshot().complete) {
      warm()
    } else {
      unsub = loaderState.subscribe(() => {
        if (loaderState.getSnapshot().complete) {
          unsub?.()
          unsub = null
          warm()
        }
      })
    }
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [gl, scene, camera, materials])

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20)
    const [start, end] = range
    const local = THREE.MathUtils.clamp(
      (scrollState.progress - start) / (end - start),
      0,
      1
    )
    // f is already smooth (Lenis) — no extra lerp on layout
    const { f } = serviceProgress(local)
    const wobble = THREE.MathUtils.clamp(scrollState.velocity * 0.0003, -0.2, 0.2)

    visibleMeshes.length = 0
    for (let i = 0; i < SERVICES.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const offset = i - f
      const active = Math.max(0, 1 - Math.abs(offset))
      mesh.visible = Math.abs(offset) < VISIBLE_OFFSET
      mesh.position.x = offset * spacing
      mesh.position.y = Math.sin(offset * 0.9) * 0.18 + wobble * (1 - active)
      mesh.position.z = -Math.abs(offset) * 0.7
      mesh.rotation.y = -offset * 0.14 * cfg.pathCurve

      const u = materials[i].uniforms
      // integrate time at a hover-boosted rate — smooth speed-up, no phase jump
      u.uTime.value += d * (1 + u.uHover.value * 0.4)
      u.uActive.value = active
      u.uMouse.value.set(pointerState.sx, pointerState.sy)
      if (mesh.visible) visibleMeshes.push(mesh)
    }

    // manual raycast hover, every 2nd frame — gated on exclusive section
    // ownership so services and references never fight over the cursor in
    // the shared wipe zone (past 50% of a wipe, ownership hands over)
    frameCount.current++
    if (frameCount.current % 2 === 0) {
      const rs = resolveScroll(scrollState.progress)
      const owns =
        (rs.index === sectionIndex && rs.transition <= 0.5) ||
        (rs.index === sectionIndex - 1 && rs.transition > 0.5)
      let hit: THREE.Object3D | null = null
      if (owns && visibleMeshes.length > 0) {
        for (const mesh of visibleMeshes) mesh.updateMatrixWorld()
        pointerNdc.set(pointerState.x, pointerState.y)
        raycaster.setFromCamera(pointerNdc, state.camera)
        const hits = raycaster.intersectObjects(visibleMeshes, false)
        hit = hits.length > 0 ? hits[0].object : null
      }
      let anyHover = false
      for (let i = 0; i < SERVICES.length; i++) {
        const isHit = hit !== null && meshRefs.current[i] === hit
        hoverTargets.current[i] = isHit ? 1 : 0
        if (isHit) anyHover = true
      }
      if (anyHover !== cursorOn.current) {
        cursorOn.current = anyHover
        document.body.style.cursor = anyHover ? 'pointer' : ''
      }
    }

    // hover uniforms always lerp (nothing snaps)
    for (let i = 0; i < SERVICES.length; i++) {
      const u = materials[i].uniforms.uHover
      u.value += (hoverTargets.current[i] - u.value) * cfg.hoverLerp
    }
  }, 0)

  return createPortal(
    // shifted right so the card chain clears the DOM text column on the left
    <group position={[narrow ? 0.3 : 1.2, narrow ? -0.9 : 0.1, 0]}>
      {SERVICES.map((service, i) => (
        <mesh
          key={service.id}
          ref={(m) => {
            meshRefs.current[i] = m
          }}
          geometry={geometry}
          material={materials[i]}
          frustumCulled={false}
        />
      ))}
    </group>,
    scene
  )
}
