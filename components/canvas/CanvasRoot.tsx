'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { getGPUPolicy } from '@/lib/gpu-tier'
import { initScroll, initScrollFallback } from '@/lib/scroll'
import { initPointer } from '@/lib/pointer'
import { loaderState } from '@/lib/loader-state'
import type { GPUPolicy } from '@/lib/types'

const CanvasScene = dynamic(
  () => import('./CanvasScene').then((m) => m.CanvasScene),
  { ssr: false }
)

/**
 * Gate for the whole WebGL layer. On reduced-motion / no-WebGL / tier 0 the
 * three.js bundle is never imported and the DOM experience stands alone.
 */
export function CanvasRoot() {
  const [policy, setPolicy] = useState<GPUPolicy | null>(null)

  useEffect(() => {
    const p = getGPUPolicy()
    setPolicy(p)
    if (p.webglDisabled) {
      // No canvas: release loader milestones so the UI never waits on WebGL,
      // and keep scrollState live via native scroll (ServicesStage, nav fade)
      loaderState.set('renderer')
      loaderState.set('hero')
      initScrollFallback()
      return
    }
    initPointer()
    initScroll(p.mobile)
  }, [])

  if (!policy || policy.webglDisabled) return null

  return (
    <div className="canvas-layer" aria-hidden="true">
      <CanvasScene policy={policy} />
    </div>
  )
}
