'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { SERVICES } from '@/lib/content'
import { serviceProgress } from '@/lib/services-progress'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import type { SceneProps } from '@/lib/types'
import { cardVert, cardFrag } from '@/shaders/card'

const VISIBLE_OFFSET = 3.2
const RAYCAST_MARGIN = 0.02 // normalized scroll padding around the section

/**
 * Services scene — 7 glassy procedural shader cards flowing through focus
 * as the user scrolls. Card positions derive from the shared
 * `serviceProgress` formula so canvas and DOM overlay always agree.
 * Hover is a manual raycast (R3F pointer events don't cross portals).
 */
export function ServicesScene({ scene, policy, range }: SceneProps) {
  const cfg = design.services
  const lowTier = policy.tier <= 1
  const spacing = policy.mobile ? cfg.spacing * 0.85 : cfg.spacing
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
            fragmentShader: cardFrag,
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
    [lowTier, waveAmp, cfg]
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
      u.uTime.value += d
      u.uActive.value = active
      u.uMouse.value.set(pointerState.sx, pointerState.sy)
      if (mesh.visible) visibleMeshes.push(mesh)
    }

    // manual raycast hover, every 2nd frame, only while the section is live
    frameCount.current++
    if (frameCount.current % 2 === 0) {
      const inSection =
        scrollState.progress > start - RAYCAST_MARGIN &&
        scrollState.progress < end + RAYCAST_MARGIN
      let hit: THREE.Object3D | null = null
      if (inSection && visibleMeshes.length > 0) {
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
    <group position={[policy.mobile ? 0.3 : 1.2, 0.1, 0]}>
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
