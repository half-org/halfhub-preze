import type { Lang } from '@/lib/types'
import { spaceGrotesk, jetbrainsMono } from '@/lib/fonts'
import { jsonLd } from '@/lib/schema'
import { CanvasRoot } from '@/components/canvas/CanvasRoot'
import '@/app/globals.css'

export function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(lang) }}
        />
        <noscript>
          <style>{`[data-loader]{display:none}`}</style>
        </noscript>
        <CanvasRoot />
        <div className="dom-layer">{children}</div>
      </body>
    </html>
  )
}
