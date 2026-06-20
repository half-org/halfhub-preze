import type { Metadata, Viewport } from 'next'
import { RootShell } from '@/components/RootShell'
import { COPY } from '@/lib/content'
import { SITE_URL, LANGUAGE_ALTERNATES } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: COPY.en.meta.title,
  description: COPY.en.meta.description,
  alternates: { canonical: '/en', languages: LANGUAGE_ALTERNATES },
  openGraph: {
    title: COPY.en.meta.title,
    description: COPY.en.meta.description,
    type: 'website',
    locale: 'en_US',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
