import type { Lang, Service } from './types'

export const SERVICES: Service[] = [
  {
    id: 'web', index: '01', color: '#45F0D8',
    cs: { name: 'Webové stránky', tagline: 'Prezentační weby, které si lidé zapamatují.', points: ['Next.js / Astro', 'WebGL & motion design', 'SEO od základu'] },
    en: { name: 'Websites', tagline: 'Websites people remember.', points: ['Next.js / Astro', 'WebGL & motion design', 'SEO by default'] },
  },
  {
    id: 'webapps', index: '02', color: '#4FC8F0',
    cs: { name: 'Webové aplikace', tagline: 'Od interních nástrojů po SaaS produkty.', points: ['React / Next.js', 'Realtime & dashboardy', 'Škálovatelná architektura'] },
    en: { name: 'Web apps', tagline: 'From internal tools to SaaS products.', points: ['React / Next.js', 'Realtime & dashboards', 'Architecture that scales'] },
  },
  {
    id: 'mobile', index: '03', color: '#6FA8FF',
    cs: { name: 'Mobilní aplikace', tagline: 'iOS i Android z jedné codebase.', points: ['React Native / Expo', 'Nativní výkon', 'App Store & Play release'] },
    en: { name: 'Mobile apps', tagline: 'iOS and Android from one codebase.', points: ['React Native / Expo', 'Native performance', 'App Store & Play release'] },
  },
  {
    id: 'api', index: '04', color: '#8F8AFF',
    cs: { name: 'API & integrace', tagline: 'Systémy, které spolu mluví.', points: ['REST / GraphQL', 'Platby, ERP, CRM', 'Dokumentace samozřejmostí'] },
    en: { name: 'APIs & integrations', tagline: 'Systems that talk to each other.', points: ['REST / GraphQL', 'Payments, ERP, CRM', 'Documented by default'] },
  },
  {
    id: 'desktop', index: '05', color: '#B07CFF',
    cs: { name: 'Desktopové aplikace', tagline: 'Nástroje pro Windows, macOS i Linux.', points: ['Electron / Tauri', 'Offline-first', 'Auto-update pipeline'] },
    en: { name: 'Desktop apps', tagline: 'Tools for Windows, macOS and Linux.', points: ['Electron / Tauri', 'Offline-first', 'Auto-update pipeline'] },
  },
  {
    id: 'ai', index: '06', color: '#E06CF0',
    cs: { name: 'AI integrace', tagline: 'LLM ve vašich procesech — užitečně, ne na efekt.', points: ['Claude / GPT integrace', 'RAG & vlastní data', 'Vyhodnotitelné výstupy'] },
    en: { name: 'AI integration', tagline: 'LLMs in your workflows — useful, not flashy.', points: ['Claude / GPT integration', 'RAG & your data', 'Measurable output'] },
  },
  {
    id: 'automation', index: '07', color: '#FF6FB3',
    cs: { name: 'Automatizace', tagline: 'Ruční práci uděláme jednou — kódem.', points: ['Workflow & skripty', 'Reporting & scraping', 'Úspora hodin týdně'] },
    en: { name: 'Automation', tagline: 'Manual work, done once — in code.', points: ['Workflows & scripts', 'Reporting & scraping', 'Hours saved weekly'] },
  },
]

export const COPY = {
  cs: {
    meta: {
      title: 'HALF — Software studio | Weby, aplikace, AI',
      description: 'Stavíme weby, webové i mobilní aplikace, API, desktopové programy, AI integrace a automatizace. Druhá polovina vašeho nápadu.',
    },
    nav: { services: 'Služby', about: 'Studio', contact: 'Kontakt', lang: 'EN', langHref: '/en' },
    hero: {
      kicker: 'Software studio',
      headline: 'Druhá polovina vašeho nápadu.',
      sub: 'Weby, aplikace a AI integrace. Od první konzultace po nasazení a provoz.',
      scrollHint: 'Scrollujte',
    },
    services: { kicker: 'Služby', heading: 'Co stavíme' },
    about: {
      kicker: 'Studio',
      heading: 'Polovina je váš nápad.',
      body: 'HALF je software studio. Stavíme digitální produkty end-to-end — návrh, vývoj, nasazení, provoz. Malý tým bez mezivrstev: mluvíte přímo s lidmi, kteří váš produkt píší. Polovina je váš nápad. My jsme ta druhá — kód, design a dotažení do konce.',
    },
    contact: {
      kicker: 'Kontakt',
      heading: 'Spojme se',
      body: 'Máte nápad nebo projekt? Napište nám — do 24 hodin se ozveme.',
      email: 'solutions.half@gmail.com',
      cta: 'Napsat e-mail',
    },
    footer: { line: '© 2026 HALF — software studio' },
  },
  en: {
    meta: {
      title: 'HALF — Software studio | Web, apps, AI',
      description: 'We build websites, web & mobile apps, APIs, desktop software, AI integrations and automation. The other half of your idea.',
    },
    nav: { services: 'Services', about: 'Studio', contact: 'Contact', lang: 'CS', langHref: '/' },
    hero: {
      kicker: 'Software studio',
      headline: 'The other half of your idea.',
      sub: 'Websites, apps and AI integration. From first call to production.',
      scrollHint: 'Scroll',
    },
    services: { kicker: 'Services', heading: 'What we build' },
    about: {
      kicker: 'Studio',
      heading: 'One half is your idea.',
      body: 'HALF is a software studio. We build digital products end-to-end — design, development, deployment, operations. A small team with no middle layers: you talk directly to the people writing your product. One half is your idea. We are the other — code, design, and follow-through.',
    },
    contact: {
      kicker: 'Contact',
      heading: "Let's talk",
      body: 'Got an idea or a project? Write to us — we reply within 24 hours.',
      email: 'solutions.half@gmail.com',
      cta: 'Send an email',
    },
    footer: { line: '© 2026 HALF — software studio' },
  },
} satisfies Record<Lang, unknown>
