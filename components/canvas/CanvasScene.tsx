'use client'

import { Canvas, advance } from '@react-three/fiber'
import { useEffect } from 'react'
import { World } from './World'
import { loaderState } from '@/lib/loader-state'
import design from '@/lib/design-data.json'
import type { GPUPolicy } from '@/lib/types'

/**
 * Drives the frameloop manually: respects the tier fps cap and pauses
 * entirely while the tab is hidden.
 */
function Driver({ fpsCap }: { fpsCap: number }) {
  useEffect(() => {
    let raf = 0
    let last = 0
    const interval = fpsCap > 0 ? 1000 / fpsCap : 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      if (interval && t - last < interval - 1) return
      last = t
      advance(t)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fpsCap])
  return null
}

export function CanvasScene({ policy }: { policy: GPUPolicy }) {
  return (
    <Canvas
      frameloop="never"
      dpr={policy.dpr}
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        alpha: false,
      }}
      camera={{
        fov: design.camera.fov,
        near: 0.1,
        far: 100,
        position: design.camera.paths.home.from.pos as [number, number, number],
      }}
      eventSource={document.body}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        loaderState.set('renderer')
      }}
    >
      <Driver fpsCap={policy.fpsCap} />
      <World policy={policy} />
    </Canvas>
  )
}
