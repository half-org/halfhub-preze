import { useId } from 'react'
import { LOGO_POLYS, LOGO_W, LOGO_H, polyToPath } from '@/lib/logo-geometry'

export type LogoMarkProps = {
  /** Rendered height in px (width follows the wordmark aspect ratio). */
  size?: number
  /** 'full' = solid wordmark; 'split' = brand motif (top solid / bottom outlined). */
  mode?: 'full' | 'split'
  className?: string
  /** Hide from assistive tech when used purely as decoration. */
  decorative?: boolean
}

/**
 * HΛLF wordmark as inline SVG, built from the shared logo polygons
 * (lib/logo-geometry.ts). Server-compatible; colors via `currentColor`.
 *
 * 'split' mode renders the brand motif: the mark is cut at mid-height —
 * top half solid fill, bottom half stroked outline ("half").
 */
export function LogoMark({
  size = 28,
  mode = 'split',
  className,
  decorative = false,
}: LogoMarkProps) {
  const id = useId()
  const topClipId = `${id}-top`
  const bottomClipId = `${id}-bottom`
  const width = (size * LOGO_W) / LOGO_H
  const halfH = LOGO_H / 2

  return (
    <svg
      viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
      width={width}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
    >
      {!decorative && <title>HALF</title>}
      {mode === 'full' ? (
        LOGO_POLYS.map((poly, i) => (
          <path key={i} d={polyToPath(poly)} fill="currentColor" />
        ))
      ) : (
        <>
          <defs>
            <clipPath id={topClipId}>
              <rect x={0} y={0} width={LOGO_W} height={halfH} />
            </clipPath>
            <clipPath id={bottomClipId}>
              <rect x={0} y={halfH} width={LOGO_W} height={halfH} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${topClipId})`}>
            {LOGO_POLYS.map((poly, i) => (
              <path key={i} d={polyToPath(poly)} fill="currentColor" />
            ))}
          </g>
          <g clipPath={`url(#${bottomClipId})`}>
            {LOGO_POLYS.map((poly, i) => (
              <path
                key={i}
                d={polyToPath(poly)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              />
            ))}
          </g>
        </>
      )}
    </svg>
  )
}
