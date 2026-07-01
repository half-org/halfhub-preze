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
uniform float uVelocity;
uniform float uStream;
uniform float uSpread;
uniform vec3 uColor;
uniform vec3 uColor2;
attribute float aSeed;
varying float vA;
varying vec3 vColor;

void main() {
  vec3 p = position;
  float t = uTime;

  // layered trig wander — cheap curl-ish flow, no texture reads
  p.x += sin(t * 0.32 + aSeed * 6.2831 + p.y * 0.55) * 0.7
       + sin(t * 0.11 + p.z * 0.8) * 0.5;
  p.y += cos(t * 0.27 + aSeed * 12.566 + p.x * 0.42) * 0.55
       + cos(t * 0.09 + p.x * 0.6) * 0.4;

  // directional current along x, wrapped so the stream never runs out
  float speed = uStream * (0.35 + 0.65 * fract(aSeed * 5.13));
  p.x = mod(p.x + t * speed + uSpread, uSpread * 2.0) - uSpread;

  // per-particle scroll parallax + scroll-velocity kick
  p.y += uScroll * (1.0 + aSeed) * 1.6;
  p.x += uVelocity * (0.3 + aSeed) * 0.5;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // two populations from one buffer: dim dust + rare bright sparks
  float spark = step(0.84, fract(aSeed * 13.73));
  float base = mix(0.021, 0.075, spark);
  gl_PointSize = (base * uDPR) * (900.0 / max(length(mv.xyz), 0.001)) * (0.5 + aSeed);

  // depth fog so far particles melt into the void instead of popping
  float fog = smoothstep(15.0, 5.0, length(mv.xyz));
  vA = mix(0.32, 1.0, spark) * (0.3 + 0.7 * fract(aSeed * 7.31)) * fog;
  vA *= 1.0 + min(abs(uVelocity), 1.2) * 0.7;

  vColor = mix(uColor, uColor2, fract(aSeed * 3.17));
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
varying float vA;
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float l = length(c);
  float d = 1.0 - smoothstep(0.0, 0.5, l);
  // hot core reads as a glint on the spark population
  float core = 1.0 - smoothstep(0.0, 0.18, l);
  gl_FragColor = vec4(vColor + core * 0.35, 1.0) * (d * vA);
}
`

/**
 * Ambient particle field for the back half of the site (aiready, about, cta,
 * process, contact) — a duotone stream that drifts with time, rides the
 * scroll and flares with scroll velocity. Per-section color/density/stream
 * come from design data.
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
        uVelocity: { value: 0 },
        uStream: { value: cfg.stream },
        uSpread: { value: cfg.spread },
        uColor: { value: new THREE.Color(cfg.color) },
        uColor2: { value: new THREE.Color(cfg.color2) },
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
    material.uniforms.uVelocity.value = THREE.MathUtils.clamp(
      scrollState.velocity * 0.01,
      -1.5,
      1.5
    )
  })

  return createPortal(
    <points ref={points} geometry={geometry} material={material} frustumCulled={false} />,
    scene
  )
}
