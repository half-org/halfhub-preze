'use client'

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, createPortal } from '@react-three/fiber'
import design from '@/lib/design-data.json'
import { scrollState } from '@/lib/scroll'
import type { SceneProps } from '@/lib/types'

const vert = /* glsl */ `
uniform float uTime;
uniform float uDPR;
uniform float uScroll;
attribute float aSeed;
varying float vA;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.3 + aSeed * 6.2831) * 0.6;
  p.y += cos(uTime * 0.23 + aSeed * 12.566) * 0.5;
  p.y += uScroll * (1.0 + aSeed) * 1.4; // per-particle scroll parallax
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.016 * uDPR) * (900.0 / max(length(mv.xyz), 0.001)) * (0.5 + aSeed);
  vA = 0.2 + 0.8 * fract(aSeed * 7.31);
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
uniform vec3 uColor;
varying float vA;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = 1.0 - smoothstep(0.0, 0.5, length(c));
  gl_FragColor = vec4(uColor, 1.0) * d * vA;
}
`

/**
 * Cheap ambient particle field — used for the about and contact sections
 * with per-section color/density from design data.
 */
export function FieldScene({ id, scene, policy, range }: SceneProps) {
  const cfg =
    design.field[id as keyof typeof design.field] ?? design.field.contact
  const count = policy.tier <= 1 ? Math.floor(cfg.count / 2) : cfg.count

  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * cfg.spread * 2
      pos[i * 3 + 1] = (Math.random() - 0.5) * cfg.spread * 1.2
      pos[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread * 0.8 - 1.5
      seed[i] = Math.random()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uDPR: { value: 1 },
        uScroll: { value: 0 },
        uColor: { value: new THREE.Color(cfg.color) },
      },
    })
    return { geometry, material }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  const points = useRef<THREE.Points>(null!)

  useFrame((state, dt) => {
    material.uniforms.uTime.value += Math.min(dt, 1 / 20) * cfg.drift * 5
    material.uniforms.uDPR.value = state.viewport.dpr
    const [s, e] = range
    const local = THREE.MathUtils.clamp((scrollState.progress - s) / (e - s), 0, 1)
    material.uniforms.uScroll.value = (local - 0.5) * 2
  })

  return createPortal(
    <points ref={points} geometry={geometry} material={material} frustumCulled={false} />,
    scene
  )
}
