'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { scrollState } from '@/lib/scroll'
import { pointerState } from '@/lib/pointer'
import { loaderState } from '@/lib/loader-state'
import type { SceneProps } from '@/lib/types'
import {
  simVert,
  simFrag,
  homeCopyFrag,
  pointsVert,
  pointsFrag,
} from '@/shaders/particles'

const hero = design.hero

/** Random box cloud roughly matching the wordmark extents (fetch fallback). */
function makeFallbackLogo(n: number): Float32Array {
  const data = new Float32Array(n * n * 4)
  for (let i = 0; i < n * n; i++) {
    data[i * 4 + 0] = (Math.random() - 0.5) * 3.1
    data[i * 4 + 1] = (Math.random() - 0.5) * 1.0
    data[i * 4 + 2] = (Math.random() - 0.5) * 0.04
    data[i * 4 + 3] = Math.random()
  }
  return data
}

function makeDataTexture(data: Float32Array, n: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/** Belt uniforms shared by the sim and points materials (see beltGLSL). */
function beltUniforms(mobile: boolean) {
  return {
    uPeriod: { value: hero.beltPeriod },
    uPhaseA: { value: hero.phaseA },
    uPhaseB: { value: hero.phaseB },
    // mobile keeps more residents so the wordmark stays dense at 128²
    uTravelRatio: { value: hero.travelRatio * (mobile ? 0.75 : 1) },
    uFieldW: { value: 1.7 },
    uEntryScatter: { value: hero.entryScatter },
    uLanes: { value: hero.laneCount },
    uLaneSpan: { value: hero.laneSpan },
  }
}

/**
 * The hero "production line": the HΛLF wordmark permanently assembled from
 * resident GPGPU particles, while traveler particles ride an endless belt —
 * turbulent dust in from the left, processed inside the wordmark, out to the
 * right as crisp data lanes. Chaos in → HALF → order out.
 *
 * Ping-pong float-texture sim at useFrame priority 0; World (priority 1)
 * renders to screen. Pointer repels particles (tactile); scroll rotates and
 * finally fades the system.
 */
export function HeroScene({ scene, policy, range }: SceneProps) {
  const N = policy.particleTexSize
  const effScale = hero.logoScale * (policy.mobile ? 0.78 : 1)

  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const readIdx = useRef(0)
  const dragRot = useRef(0)
  const flags = useRef({ needsInit: false, stepped: false, pointerMoved: false })

  // ---- GPGPU simulation resources (targets, fullscreen-tri scene, materials)
  const sim = useMemo(() => {
    const targets = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(N, N, {
          type: THREE.FloatType,
          format: THREE.RGBAFormat,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          depthBuffer: false,
          stencilBuffer: false,
          generateMipmaps: false,
        })
    )

    const triGeo = new THREE.BufferGeometry()
    triGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    )

    const simMat = new THREE.ShaderMaterial({
      vertexShader: simVert,
      fragmentShader: simFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...beltUniforms(policy.mobile),
        tPos: { value: null },
        tLogo: { value: null },
        uTime: { value: 0 },
        uDelta: { value: 1 / 60 },
        uNoiseFreq: { value: hero.noiseFreq },
        // design values premultiplied into per-frame magnitudes (60fps base)
        uNoiseAmp: { value: hero.noiseAmp * 0.02 * (policy.mobile ? 0.8 : 1) },
        uSplitDissolve: { value: hero.splitDissolve },
        uPointer: { value: new THREE.Vector3(0, 0, 1000) },
        uPointerRadius: { value: hero.pointerRadius / effScale },
        uPointerForce: { value: hero.pointerForce * 0.05 },
      },
    })

    const copyMat = new THREE.ShaderMaterial({
      vertexShader: simVert,
      fragmentShader: homeCopyFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: { ...beltUniforms(policy.mobile), tLogo: { value: null } },
    })

    const mesh = new THREE.Mesh(triGeo, simMat)
    mesh.frustumCulled = false
    const simScene = new THREE.Scene()
    simScene.add(mesh)
    const simCamera = new THREE.Camera()

    return { targets, triGeo, simMat, copyMat, mesh, simScene, simCamera }
  }, [N, effScale, policy.mobile])

  // ---- points mesh: one vertex per texel, position = (u, v, 0) sim lookup
  const points = useMemo(() => {
    const count = N * N
    const lookup = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      lookup[i * 3 + 0] = ((i % N) + 0.5) / N
      lookup[i * 3 + 1] = (Math.floor(i / N) + 0.5) / N
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(lookup, 3))

    const material = new THREE.ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...beltUniforms(policy.mobile),
        tPos: { value: null },
        tPrev: { value: null },
        tLogo: { value: null },
        uDPR: { value: 1 },
        uSize: { value: hero.particleSize },
        uTime: { value: 0 },
        uSimTime: { value: 0 },
        uPulseSpeed: { value: hero.pulseSpeed },
        uColorChaos: { value: new THREE.Color('#7C8A86') },
        uColor: { value: new THREE.Color('#45F0D8') },
        uColorLane: { value: new THREE.Color('#B9FFF2') },
        uColorHot: { value: new THREE.Color('#FFFFFF') },
        uOpacity: { value: 1 },
      },
    })
    return { geometry, material }
  }, [N, policy.mobile])

  // ---- load the baked wordmark positions (GPU-tier-sized bin)
  useEffect(() => {
    let disposed = false
    let tex: THREE.DataTexture | null = null

    const apply = (data: Float32Array) => {
      if (disposed) return
      tex?.dispose()
      tex = makeDataTexture(data, N)
      sim.simMat.uniforms.tLogo.value = tex
      sim.copyMat.uniforms.tLogo.value = tex
      points.material.uniforms.tLogo.value = tex
      flags.current.needsInit = true
    }

    fetch(`/assets/particles/logo-${N}.bin`, { signal: AbortSignal.timeout(10000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.arrayBuffer()
      })
      .then((buf) => {
        if (buf.byteLength !== N * N * 16) throw new Error('bad bin size')
        apply(new Float32Array(buf))
      })
      .catch(() => apply(makeFallbackLogo(N)))

    return () => {
      disposed = true
      tex?.dispose()
      sim.simMat.uniforms.tLogo.value = null
      sim.copyMat.uniforms.tLogo.value = null
      points.material.uniforms.tLogo.value = null
    }
  }, [N, sim, points])

  // ---- dispose GPU resources
  useEffect(() => {
    return () => {
      sim.targets.forEach((t) => t.dispose())
      sim.triGeo.dispose()
      sim.simMat.dispose()
      sim.copyMat.dispose()
      points.geometry.dispose()
      points.material.dispose()
    }
  }, [sim, points])

  const pointerWorld = useMemo(() => new THREE.Vector3(), [])
  const rayDir = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const gl = state.gl
    const su = sim.simMat.uniforms
    const pu = points.material.uniforms

    const [start, end] = range
    const local = THREE.MathUtils.clamp(
      (scrollState.progress - start) / (end - start),
      0,
      1
    )

    // group: scroll rotation + lerped pointer drag + fit-to-viewport scale
    // (the wordmark is 3.08 logo-units wide; never overflow narrow screens)
    const group = groupRef.current
    dragRot.current += (pointerState.dragX * 2.5 - dragRot.current) * 0.07
    const fit = Math.min(effScale, (state.viewport.width * 0.92) / 3.08)
    if (group) {
      group.rotation.y = local * hero.scrollRotate * 0.2 + dragRot.current
      group.scale.setScalar(fit)
    }
    su.uPointerRadius.value = hero.pointerRadius / fit

    // the belt spans the visible viewport in logo-local units
    const fieldW = ((state.viewport.width / 2) / fit) * 1.02
    su.uFieldW.value = fieldW
    pu.uFieldW.value = fieldW
    sim.copyMat.uniforms.uFieldW.value = fieldW

    // fade the particles out near the end of the hero section
    pu.uOpacity.value = 1 - THREE.MathUtils.smoothstep(local, 0.85, 1)
    if (pointsRef.current) pointsRef.current.visible = pu.uOpacity.value > 0.001

    // pointer → logo-local space (unproject through the z=0 plane); stays
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
        su.uPointer.value.copy(pointerWorld)
      }
    }

    if (!su.tLogo.value) return // wordmark positions still downloading

    // seed both targets from the wordmark texture once — the loader reveals
    // the assembled logo, then the travelers peel off ("the machine starts")
    if (flags.current.needsInit) {
      sim.mesh.material = sim.copyMat
      for (const target of sim.targets) {
        gl.setRenderTarget(target)
        gl.render(sim.simScene, sim.simCamera)
      }
      gl.setRenderTarget(null)
      sim.mesh.material = sim.simMat
      flags.current.needsInit = false
    }

    // pause the sim once well past the hero (budget for the other scenes),
    // but always complete the first step so the loader milestone fires
    const past = scrollState.progress > end + 0.06
    if (past && flags.current.stepped) return

    const read = sim.targets[readIdx.current]
    const write = sim.targets[1 - readIdx.current]

    su.uTime.value += dt
    su.uDelta.value = dt
    su.tPos.value = read.texture

    gl.setRenderTarget(write)
    gl.render(sim.simScene, sim.simCamera)
    gl.setRenderTarget(null)

    readIdx.current = 1 - readIdx.current
    pu.tPos.value = write.texture
    pu.tPrev.value = read.texture
    pu.uDPR.value = state.viewport.dpr
    pu.uTime.value = su.uTime.value
    pu.uSimTime.value = su.uTime.value // belt stages must match the sim exactly

    if (!flags.current.stepped) {
      flags.current.stepped = true
      loaderState.set('hero')
    }
  })

  return createPortal(
    <group ref={groupRef}>
      <points
        ref={pointsRef}
        geometry={points.geometry}
        material={points.material}
        frustumCulled={false}
      />
    </group>,
    scene
  )
}
