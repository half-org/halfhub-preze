import { COPY, SERVICES } from './content'
import { SITE_URL } from './site'
import type { Lang } from './types'

/**
 * schema.org JSON-LD for AI/search crawlers — part of the site's own
 * GEO story ("this site has all of it"). Rendered by RootShell.
 */
export function jsonLd(lang: Lang): string {
  const c = COPY[lang]
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        name: 'HALF',
        url: SITE_URL,
        email: c.contact.email,
        description: c.meta.description,
        knowsAbout: SERVICES.map((s) => s[lang].name),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: lang === 'cs' ? SITE_URL : `${SITE_URL}/en`,
        name: c.meta.title,
        description: c.meta.description,
        inLanguage: lang === 'cs' ? 'cs-CZ' : 'en-US',
        publisher: { '@id': `${SITE_URL}/#org` },
      },
    ],
  })
}
