'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { REFERENCES } from '@/lib/content'
import { refsProgress } from '@/lib/refs-progress'
import { SECTION_RANGES, resolveScroll } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import { loaderState } from '@/lib/loader-state'
import type { SceneProps } from '@/lib/types'
import { screenVert, screenFrag } from '@/shaders/screen'

const VISIBLE_OFFSET = 2.4
const MOBILE_ASPECT = 780 / 1688 // phone screenshot w/h
// design mobileScale (0.34 of cardW) reads oversized against the desktop
// plane at aspect 780:1688 — eased down here so the chip lands at the
// intended ~0.9 * cardH (tuning constants live in this file by design).
const PHONE_TUNE = 0.78
const LOAD_FADE = 0.05 // uLoaded lerp factor — screenshots fade in, never pop

/**
 * References scene — real client-site screenshots held in HALF glass panels,
 * flowing through focus as the user scrolls. Each project is a group with a
 * desktop plane + a smaller phone plane overlapping its bottom-right corner.
 * Positions derive from the shared `refsProgress` formula so canvas and DOM
 * overlay always agree. Hover is a manual raycast (R3F pointer events don't
 * cross portals); clicking a hovered panel opens the live site. Textures load
 * lazily after the loader completes and fail soft to a procedural placeholder.
 */
export function ReferencesScene({ id, scene, policy, range }: SceneProps) {
  const cfg = design.references
  const lowTier = policy.tier <= 1
  const sectionIndex = useMemo(() => SECTION_RANGES.findIndex((r) => r.id === id), [id])
  // layout must track the CSS breakpoint (760px), not the UA — a narrow
  // desktop window gets the stacked DOM layout and needs the same placement
  const narrow = useThree((s) => s.size.width) <= 760
  const spacing = narrow ? cfg.spacing * 0.85 : cfg.spacing
  const waveAmp = policy.mobile ? 0.03 : 0.05
  const gl = useThree((s) => s.gl)

  const phoneW = cfg.cardW * cfg.mobileScale * PHONE_TUNE
  const phoneH = phoneW / MOBILE_ASPECT // ≈ cardH * 0.9
  const phoneX = cfg.cardW * 0.5 - phoneW * 0.28
  const phoneY = -cfg.cardH * 0.5 + phoneH * 0.3

  const desktopGeo = useMemo(() => {
    const segX = lowTier ? 24 : 40
    const segY = lowTier ? 16 : 26
    return new THREE.PlaneGeometry(cfg.cardW, cfg.cardH, segX, segY)
  }, [lowTier, cfg.cardW, cfg.cardH])

  const phoneGeo = useMemo(
    () => new THREE.PlaneGeometry(phoneW, phoneH, lowTier ? 8 : 12, lowTier ? 14 : 22),
    [lowTier, phoneW, phoneH]
  )

  // flat material list: [i*2] = desktop plane, [i*2+1] = phone plane
  const materials = useMemo(
    () =>
      REFERENCES.flatMap((ref, i) =>
        [cfg.cardW / cfg.cardH, MOBILE_ASPECT].map(
          (aspect, j) =>
            new THREE.ShaderMaterial({
              vertexShader: screenVert,
              fragmentShader: screenFrag,
              transparent: true,
              depthWrite: false,
              uniforms: {
                uMap: { value: null },
                uLoaded: { value: 0 },
                uColor: { value: new THREE.Color(ref.color) },
                uTime: { value: 0 },
                uHover: { value: 0 },
                uActive: { value: 0 },
                uAspect: { value: aspect },
                uVignette: { value: cfg.vignette },
                uScan: { value: lowTier ? 0 : 1 },
                uWaveAmp: { value: j === 1 ? waveAmp * 0.6 : waveAmp },
                uSeed: { value: i * 7.31 + j * 3.17 },
              },
            })
        )
      ),
    [lowTier, waveAmp, cfg]
  )

  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]) // flat, matches materials
  const hoverTargets = useRef<number[]>(REFERENCES.map(() => 0))
  const loadedTargets = useRef<number[]>(REFERENCES.flatMap(() => [0, 0]))
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointerNdc = useMemo(() => new THREE.Vector2(), [])
  const visibleMeshes = useMemo<THREE.Mesh[]>(() => [], [])
  const frameCount = useRef(0)
  const hoverIndex = useRef(-1)

  // click-to-open is a mouse affordance only — on touch, pointerState goes
  // stale after a scroll gesture and would turn arbitrary taps into opens;
  // touch users have the real DOM visit link instead
  const finePointer = useMemo(
    () =>
      typeof matchMedia !== 'undefined' &&
      matchMedia('(hover: hover) and (pointer: fine)').matches,
    []
  )

  const camera = useThree((s) => s.camera)

  // click-through: window listener attached only while a panel is hovered.
  // The hover raycast runs on the *smoothed* pointer every 2nd frame, so the
  // click is re-verified with a fresh raycast at the event's own coordinates —
  // a stale hover state must never open a site the user didn't click.
  const onClick = useMemo(
    () => (e: MouseEvent) => {
      // ignore clicks that land on real DOM interactive elements above the canvas
      const el = e.target as HTMLElement | null
      if (el && typeof el.closest === 'function' && el.closest('a, button, input, textarea')) return
      if (hoverIndex.current < 0 || visibleMeshes.length === 0) return
      const rect = gl.domElement.getBoundingClientRect()
      pointerNdc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.setFromCamera(pointerNdc, camera)
      const hits = raycaster.intersectObjects(visibleMeshes, false)
      if (hits.length === 0) return
      const flat = meshRefs.current.indexOf(hits[0].object as THREE.Mesh)
      if (flat >= 0) window.open(REFERENCES[Math.floor(flat / 2)].url, '_blank', 'noopener')
    },
    [gl, camera, pointerNdc, raycaster, visibleMeshes]
  )

  useEffect(() => {
    return () => {
      desktopGeo.dispose()
      phoneGeo.dispose()
      for (const m of materials) m.dispose()
      window.removeEventListener('click', onClick)
      if (hoverIndex.current >= 0) document.body.style.cursor = ''
      hoverIndex.current = -1
    }
  }, [desktopGeo, phoneGeo, materials, onClick])

  // Lazy screenshot textures — start only after the loader completes so they
  // never compete with the hero; on error the placeholder simply stays.
  useEffect(() => {
    let disposed = false
    let unsub: (() => void) | null = null
    const textures: THREE.Texture[] = []

    const load = () => {
      if (disposed) return
      // warm the shader programs off the scroll path — otherwise the shell +
      // placeholder programs compile on the first transition frame mid-wipe
      gl.compileAsync(scene, camera).catch(() => {})
      const loader = new THREE.TextureLoader()
      const aniso = Math.min(4, gl.capabilities.getMaxAnisotropy())
      REFERENCES.forEach((ref, i) => {
        const jobs: [string, number][] = [
          [ref.assets.desktop, i * 2],
          [ref.assets.mobile, i * 2 + 1],
        ]
        for (const [url, mi] of jobs) {
          loader.load(
            url,
            (tex) => {
              if (disposed) {
                tex.dispose()
                return
              }
              tex.colorSpace = THREE.SRGBColorSpace
              tex.anisotropy = aniso
              // upload to the GPU now (idle, post-loader) instead of lazily
              // on the first frame the plane renders — that frame is mid-wipe
              gl.initTexture(tex)
              textures.push(tex)
              materials[mi].uniforms.uMap.value = tex
              loadedTargets.current[mi] = 1
            },
            undefined,
            () => {
              /* fail-soft: uLoaded stays 0, procedural placeholder renders */
            }
          )
        }
      })
    }

    if (loaderState.getSnapshot().complete) {
      load()
    } else {
      unsub = loaderState.subscribe(() => {
        if (loaderState.getSnapshot().complete) {
          unsub?.()
          unsub = null
          load()
        }
      })
    }

    return () => {
      disposed = true
      unsub?.()
      for (const t of textures) t.dispose()
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
    const { f } = refsProgress(local)
    const wobble = THREE.MathUtils.clamp(scrollState.velocity * 0.0003, -0.2, 0.2)

    visibleMeshes.length = 0
    for (let i = 0; i < REFERENCES.length; i++) {
      const group = groupRefs.current[i]
      if (!group) continue
      const offset = i - f
      const active = Math.max(0, 1 - Math.abs(offset))
      group.visible = Math.abs(offset) < VISIBLE_OFFSET
      group.position.x = offset * spacing
      group.position.y = Math.sin(offset * 0.8) * 0.14 + wobble * (1 - active)
      group.position.z = -Math.abs(offset) * 1.5
      // unfocused swing + pointer tilt on the focused group (design tilt max)
      group.rotation.y = -offset * 0.22 + pointerState.sx * cfg.tilt * active
      group.rotation.x = pointerState.sy * cfg.tilt * 0.6 * active

      for (let j = 0; j < 2; j++) {
        const u = materials[i * 2 + j].uniforms
        u.uTime.value += d
        u.uActive.value = active
        u.uLoaded.value += (loadedTargets.current[i * 2 + j] - u.uLoaded.value) * LOAD_FADE
        const mesh = meshRefs.current[i * 2 + j]
        if (group.visible && mesh) visibleMeshes.push(mesh)
      }
    }

    // manual raycast hover, every 2nd frame — mouse-only (touch pointer state
    // goes stale after scroll gestures) and gated on exclusive section
    // ownership so this scene never fights services over cursor/clicks in the
    // shared wipe zone (past 50% of a wipe, ownership hands over)
    frameCount.current++
    if (frameCount.current % 2 === 0) {
      const rs = resolveScroll(scrollState.progress)
      const owns =
        finePointer &&
        ((rs.index === sectionIndex && rs.transition <= 0.5) ||
          (rs.index === sectionIndex - 1 && rs.transition > 0.5))
      let hitIndex = -1
      if (owns && visibleMeshes.length > 0) {
        for (const g of groupRefs.current) g?.updateMatrixWorld(true)
        pointerNdc.set(pointerState.x, pointerState.y)
        raycaster.setFromCamera(pointerNdc, state.camera)
        const hits = raycaster.intersectObjects(visibleMeshes, false)
        if (hits.length > 0) {
          const flat = meshRefs.current.indexOf(hits[0].object as THREE.Mesh)
          if (flat >= 0) hitIndex = Math.floor(flat / 2)
        }
      }
      for (let i = 0; i < REFERENCES.length; i++) {
        hoverTargets.current[i] = i === hitIndex ? 1 : 0
      }
      if (hitIndex !== hoverIndex.current) {
        if (hitIndex >= 0 && hoverIndex.current < 0) window.addEventListener('click', onClick)
        if (hitIndex < 0 && hoverIndex.current >= 0) window.removeEventListener('click', onClick)
        hoverIndex.current = hitIndex
        document.body.style.cursor = hitIndex >= 0 ? 'pointer' : ''
      }
    }

    // hover uniforms always lerp (nothing snaps); both planes of a project move together
    for (let i = 0; i < REFERENCES.length; i++) {
      for (let j = 0; j < 2; j++) {
        const u = materials[i * 2 + j].uniforms.uHover
        u.value += (hoverTargets.current[i] - u.value) * cfg.hoverLerp
      }
    }
  }, 0)

  return createPortal(
    // wide: shifted right so the panels clear the DOM text column on the
    // left; narrow: dropped into the lower third below the stacked text
    <group
      position={[narrow ? 0 : 1.6, narrow ? -1.35 : -0.05, 0]}
      scale={narrow ? 0.62 : 1}
    >
      {REFERENCES.map((ref, i) => (
        <group
          key={ref.id}
          ref={(g) => {
            groupRefs.current[i] = g
          }}
        >
          <mesh
            ref={(m) => {
              meshRefs.current[i * 2] = m
            }}
            geometry={desktopGeo}
            material={materials[i * 2]}
            frustumCulled={false}
          />
          <mesh
            ref={(m) => {
              meshRefs.current[i * 2 + 1] = m
            }}
            geometry={phoneGeo}
            material={materials[i * 2 + 1]}
            position={[phoneX, phoneY, 0.12]}
            rotation={[0, -0.16, -0.05]}
            frustumCulled={false}
          />
        </group>
      ))}
    </group>,
    scene
  )
}
