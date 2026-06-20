/**
 * Canonical site origin for metadata (hreflang/canonical/OG/sitemap).
 * Set NEXT_PUBLIC_SITE_URL in the deploy environment; the localhost
 * fallback keeps dev/preview builds valid.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const LANGUAGE_ALTERNATES = {
  cs: '/',
  en: '/en',
  'x-default': '/',
}
