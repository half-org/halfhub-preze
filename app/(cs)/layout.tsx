import type { Metadata, Viewport } from 'next'
import { RootShell } from '@/components/RootShell'
import { COPY } from '@/lib/content'
import { SITE_URL, LANGUAGE_ALTERNATES } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: COPY.cs.meta.title,
  description: COPY.cs.meta.description,
  alternates: { canonical: '/', languages: LANGUAGE_ALTERNATES },
  openGraph: {
    title: COPY.cs.meta.title,
    description: COPY.cs.meta.description,
    type: 'website',
    locale: 'cs_CZ',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function CsLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="cs">{children}</RootShell>
}
