'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SECTION_RANGES } from '@/lib/sections'
import { resolveScroll } from '@/lib/sections'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import { worldFade } from '@/lib/loader-state'
import design from '@/lib/design-data.json'
import type { GPUPolicy, SceneId, SceneProps } from '@/lib/types'
import { HeroScene } from './scenes/HeroScene'
import { ServicesScene } from './scenes/ServicesScene'
import { ReferencesScene } from './scenes/ReferencesScene'
import { FieldScene } from './scenes/FieldScene'
import { compositeVert, compositeFrag } from '@/shaders/composite'

const COMPONENTS: Record<SceneId, React.ComponentType<SceneProps>> = {
  home: HeroScene,
  services: ServicesScene,
  references: ReferencesScene,
  aiready: FieldScene,
  about: FieldScene,
  cta: FieldScene,
  contact: FieldScene,
}

type CamKey = keyof typeof design.camera.paths

function smoothstep01(t: number) {
  return t * t * (3 - 2 * t)
}

/**
 * The spine: per-section THREE.Scenes rendered to two render targets,
 * camera rig along design-data paths, single fullscreen composite pass.
 * Runs at useFrame priority 1 → R3F auto-render is off; we render manually.
 */
export function World({ policy }: { policy: GPUPolicy }) {
  const scenes = useMemo(
    () =>
      SECTION_RANGES.map(() => {
        const s = new THREE.Scene()
        s.background = new THREE.Color(0x000000)
        return s
      }),
    []
  )

  const targets = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.WebGLRenderTarget(1, 1, {
            depthBuffer: true,
            stencilBuffer: false,
          })
      ),
    []
  )

  const camPos = useRef(new THREE.Vector3(...(design.camera.paths.home.from.pos as [number, number, number])))
  const camLook = useRef(new THREE.Vector3(...(design.camera.paths.home.from.look as [number, number, number])))
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpLook = useMemo(() => new THREE.Vector3(), [])
  const fromV = useMemo(() => new THREE.Vector3(), [])
  const toV = useMemo(() => new THREE.Vector3(), [])

  const uniforms = useMemo(
    () => ({
      tMap1: { value: targets[0].texture },
      tMap2: { value: targets[1].texture },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uVisible: { value: 0 },
      uAngle: { value: design.composite.angle },
      uContrast: { value: design.composite.contrast },
      uGrain: { value: design.composite.grain },
      uVignette: { value: design.composite.vignette },
      uDisplace: { value: design.composite.wipeDisplace },
    }),
    [targets]
  )

  const triGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    )
    return g
  }, [])

  // Imperative material: R3F clones a `uniforms` JSX prop, which would break
  // the per-frame mutations above (the live material would keep its own copy).
  const compositeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: compositeVert,
        fragmentShader: compositeFrag,
        uniforms,
        depthTest: false,
        depthWrite: false,
      }),
    [uniforms]
  )

  useEffect(() => {
    return () => {
      compositeMat.dispose()
      triGeo.dispose()
      targets.forEach((t) => t.dispose())
    }
  }, [compositeMat, triGeo, targets])

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20)
    const gl = state.gl
    const camera = state.camera as THREE.PerspectiveCamera

    // smoothed pointer (consumed by all scenes)
    pointerState.sx += (pointerState.x - pointerState.sx) * 0.07
    pointerState.sy += (pointerState.y - pointerState.sy) * 0.07
    if (!pointerState.down) {
      pointerState.dragX *= 0.95
      pointerState.dragY *= 0.95
    }

    // global world fade-in (masks late pop-in after the loader exits)
    worldFade.value = Math.min(
      worldFade.target,
      worldFade.value + d / design.composite.fadeInSeconds
    )

    const { index, local, transition } = resolveScroll(scrollState.progress)
    const id = SECTION_RANGES[index].id as CamKey
    const path = design.camera.paths[id]
    const t = smoothstep01(local)

    fromV.set(path.from.pos[0], path.from.pos[1], path.from.pos[2])
    toV.set(path.to.pos[0], path.to.pos[1], path.to.pos[2])
    tmpPos.lerpVectors(fromV, toV, t)
    fromV.set(path.from.look[0], path.from.look[1], path.from.look[2])
    toV.set(path.to.look[0], path.to.look[1], path.to.look[2])
    tmpLook.lerpVectors(fromV, toV, t)

    // pointer parallax + scroll-velocity wobble
    tmpPos.x += pointerState.sx * 0.35
    tmpPos.y += pointerState.sy * 0.2
    tmpPos.y += THREE.MathUtils.clamp(scrollState.velocity * 0.0004, -0.5, 0.5) * design.camera.wobble

    const k = 1 - Math.pow(0.001, d)
    camPos.current.lerp(tmpPos, k)
    camLook.current.lerp(tmpLook, k)
    camera.position.copy(camPos.current)
    camera.lookAt(camLook.current)

    // keep render targets matched to the drawing buffer
    const w = Math.floor(state.size.width * state.viewport.dpr)
    const h = Math.floor(state.size.height * state.viewport.dpr)
    for (const rt of targets) {
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h)
    }

    // render current (and, inside a transition, the next) section scene
    gl.setRenderTarget(targets[0])
    gl.render(scenes[index], camera)
    if (transition > 0 && index + 1 < scenes.length) {
      gl.setRenderTarget(targets[1])
      gl.render(scenes[index + 1], camera)
    }
    gl.setRenderTarget(null)

    uniforms.uProgress.value = transition
    uniforms.uVelocity.value = THREE.MathUtils.clamp(scrollState.velocity * 0.01, -1.5, 1.5)
    uniforms.uTime.value += d
    uniforms.uVisible.value = worldFade.value

    // composite pass (we own the render loop at priority 1)
    gl.render(state.scene, camera)

    if (process.env.NODE_ENV === 'development') {
      ;(window as unknown as Record<string, unknown>).__dbg = {
        fade: worldFade.value,
        progress: scrollState.progress,
        section: index,
        transition,
      }
    }
  }, 1)

  return (
    <>
      {SECTION_RANGES.map((s, i) => {
        const Comp = COMPONENTS[s.id]
        return (
          <Comp key={s.id} id={s.id} scene={scenes[i]} policy={policy} range={s.range} />
        )
      })}
      <mesh geometry={triGeo} material={compositeMat} frustumCulled={false} />
    </>
  )
}
