import type { Lang, Reference, Service } from './types'

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

export const REFERENCES: Reference[] = [
  {
    id: 'jepostaveno', index: '01', color: '#88C819',
    url: 'https://www.jepostaveno.cz', domain: 'jepostaveno.cz',
    assets: { desktop: '/assets/refs/jepostaveno-desktop.jpg', mobile: '/assets/refs/jepostaveno-mobile.jpg' },
    cs: { name: 'Je Postaveno', tagline: 'Stavební portál s články, katalogem ověřených firem a poradnou.', points: ['Redakce, seriály & komunita', 'Katalog ověřených firem', 'AI asistent v poradně'] },
    en: { name: 'Je Postaveno', tagline: 'A construction portal with articles, a verified-company directory and an advisory section.', points: ['Editorial, series & community', 'Verified-company directory', 'AI assistant in the Q&A'] },
  },
  {
    id: 'izolacefuk', index: '02', color: '#84CC16',
    url: 'https://www.izolacefuk.cz', domain: 'izolacefuk.cz',
    assets: { desktop: '/assets/refs/izolacefuk-desktop.jpg', mobile: '/assets/refs/izolacefuk-mobile.jpg' },
    cs: { name: 'Izolace FUK', tagline: 'Prezentační web s galerií realizací a poptávkovým formulářem pro izolační firmu.', points: ['Galerie realizací', 'Poptávkový formulář', '4 000+ realizací · celá ČR'] },
    en: { name: 'Izolace FUK', tagline: 'A marketing site with a project gallery and lead-inquiry form for an insulation contractor.', points: ['Project gallery', 'Lead-inquiry form', '4,000+ projects nationwide'] },
  },
]

export const COPY = {
  cs: {
    meta: {
      title: 'HALF — Software studio | Weby, aplikace, AI',
      description: 'Stavíme weby, webové i mobilní aplikace, API, desktopové programy, AI integrace a automatizace. Weby připravené na AI vyhledávání. Druhá polovina vašeho nápadu.',
    },
    nav: { services: 'Služby', references: 'Reference', about: 'Studio', demo: 'Demo zdarma', contact: 'Kontakt', lang: 'EN', langHref: '/en' },
    hero: {
      kicker: 'Software studio',
      headline: 'Druhá polovina vašeho nápadu.',
      sub: 'Weby, aplikace a AI integrace. Od první konzultace po nasazení a provoz.',
      scrollHint: 'Scrollujte',
    },
    services: { kicker: 'Služby', heading: 'Co stavíme' },
    references: {
      kicker: 'Reference',
      heading: 'Co jsme postavili',
      visit: 'Navštívit web',
    },
    aiready: {
      kicker: 'Připraveno na AI',
      heading: 'Weby, kterým rozumí lidi i stroje.',
      body: 'Vyhledávání se stěhuje do AI asistentů. Weby stavíme tak, aby je ChatGPT, Perplexity i Google AI uměly přečíst, pochopit a citovat jako zdroj — a aby byly připravené na agenty, kteří je jednou budou procházet za vás.',
      geo: {
        label: 'GEO — AI vyhledávání',
        desc: 'Aby vás AI asistenti našli a doporučili.',
        points: ['Strukturovaná data schema.org', 'Obsah čitelný i bez JavaScriptu', 'Copy psané pro citace v AI odpovědích'],
      },
      a2a: {
        label: 'A2A — AI agenti',
        desc: 'Aby s vaším webem uměli pracovat i agenti.',
        points: ['llms.txt & otevřený přístup pro AI crawlery', 'Strojově čitelná struktura a API', 'Volitelně MCP rozhraní pro agenty'],
      },
      note: 'Tenhle web to všechno má. Zkuste se na HALF zeptat svojí AI.',
    },
    about: {
      kicker: 'Studio',
      heading: 'Polovina je váš nápad.',
      body: 'HALF je software studio. Stavíme digitální produkty end-to-end — návrh, vývoj, nasazení, provoz. Malý tým bez mezivrstev: mluvíte přímo s lidmi, kteří váš produkt píší. Polovina je váš nápad. My jsme ta druhá — kód, design a dotažení do konce.',
    },
    cta: {
      demo: {
        kicker: 'Než něco podepíšete',
        heading: 'Uvidíte to fungovat dřív, než nám uvěříte na slovo.',
        body: 'Postavíme vám klikací demo s testovacími daty — zdarma. Ne wireframe, ne prezentaci: produkt, který si osaháte. Bez faktury, bez závazku.',
        cta: 'Chci free demo',
        mailSubject: 'Free demo — mám nápad',
      },
      audit: {
        kicker: 'Automatizační audit',
        heading: 'Co vám žere čas?',
        prompt: 'CO DĚLÁTE KAŽDÝ DEN?',
        hint: 'Vyberte činnosti, které u vás pravidelně padají na lidi. Hned uvidíte, co z toho umí převzít software.',
        totalLabel: 'zpět každý týden',
        send: 'Odeslat audit',
        sendHint: 'Otevře e-mail s vaším výběrem jako podklad — nic se nikam neukládá.',
        empty: 'Zatím nic nevybráno — klikněte na činnost výše.',
        verdicts: { auto: 'Automatizovatelné', partial: 'Částečně automatizovatelné', fine: 'Tohle nechte na lidech' },
        mailSubject: 'Automatizační audit — můj výběr',
      },
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
      description: 'We build websites, web & mobile apps, APIs, desktop software, AI integrations and automation. Websites built for AI search. The other half of your idea.',
    },
    nav: { services: 'Services', references: 'Work', about: 'Studio', demo: 'Free demo', contact: 'Contact', lang: 'CS', langHref: '/' },
    hero: {
      kicker: 'Software studio',
      headline: 'The other half of your idea.',
      sub: 'Websites, apps and AI integration. From first call to production.',
      scrollHint: 'Scroll',
    },
    services: { kicker: 'Services', heading: 'What we build' },
    references: {
      kicker: 'Work',
      heading: 'What we built',
      visit: 'Visit site',
    },
    aiready: {
      kicker: 'Built for AI',
      heading: 'Websites that machines can read too.',
      body: 'Search is moving into AI assistants. We build websites that ChatGPT, Perplexity and Google AI can read, understand and cite as a source — ready for the agents that will one day browse them on your behalf.',
      geo: {
        label: 'GEO — AI search',
        desc: 'So AI assistants find and recommend you.',
        points: ['Structured data (schema.org)', 'Content readable without JavaScript', 'Copy written to be cited in AI answers'],
      },
      a2a: {
        label: 'A2A — AI agents',
        desc: 'So agents can work with your site too.',
        points: ['llms.txt & open access for AI crawlers', 'Machine-readable structure and APIs', 'Optional MCP endpoint for agents'],
      },
      note: 'This site has all of it. Try asking your AI about HALF.',
    },
    about: {
      kicker: 'Studio',
      heading: 'One half is your idea.',
      body: 'HALF is a software studio. We build digital products end-to-end — design, development, deployment, operations. A small team with no middle layers: you talk directly to the people writing your product. One half is your idea. We are the other — code, design, and follow-through.',
    },
    cta: {
      demo: {
        kicker: 'Before you sign anything',
        heading: "You'll see it working before you have to trust us.",
        body: "We'll build you a clickable demo with test data — for free. Not a wireframe, not a slide deck: a product you can click through yourself. No invoice, no commitment.",
        cta: 'I want a free demo',
        mailSubject: 'Free demo — I have an idea',
      },
      audit: {
        kicker: 'Automation audit',
        heading: 'What eats your time?',
        prompt: 'WHAT DO YOU DO EVERY DAY?',
        hint: 'Pick the chores that keep landing on people in your company. You’ll see instantly what software could take over.',
        totalLabel: 'back every week',
        send: 'Send the audit',
        sendHint: 'Opens an email with your selection as a brief — nothing is stored anywhere.',
        empty: 'Nothing selected yet — click a task above.',
        verdicts: { auto: 'Automatable', partial: 'Partially automatable', fine: 'Keep this human' },
        mailSubject: 'Automation audit — my selection',
      },
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
