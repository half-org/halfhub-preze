import type { Lang } from './types'

/**
 * Data + rules for the AI automation-map wizard (CTA section).
 *
 * Principle: never ask "what do you want to automate" — ask about symptoms
 * and routine; the mapping to automations happens here. Today the mapping is
 * a curated rule set (symptom → automation, padded by industry defaults,
 * hours scaled by team size); the generator is a pure function so a real AI
 * backend can replace `buildPlan` later without touching the component.
 */

export type WizardOption = { id: string; cs: string; en: string }

export const INDUSTRIES: WizardOption[] = [
  { id: 'vyroba', cs: 'Výroba', en: 'Manufacturing' },
  { id: 'eshop', cs: 'E-shop', en: 'E-commerce' },
  { id: 'sluzby', cs: 'Služby', en: 'Services' },
  { id: 'stavebnictvi', cs: 'Stavebnictví', en: 'Construction' },
  { id: 'obchod', cs: 'Obchod', en: 'Sales & trade' },
  { id: 'jine', cs: 'Jiné', en: 'Other' },
]

/** `mult` scales the reclaimed-hours estimate with head-count. */
export const TEAM_SIZES: (WizardOption & { mult: number })[] = [
  { id: 't1', cs: '1–5 lidí', en: '1–5 people', mult: 1 },
  { id: 't2', cs: '6–20 lidí', en: '6–20 people', mult: 1.5 },
  { id: 't3', cs: '21–50 lidí', en: '21–50 people', mult: 2 },
  { id: 't4', cs: '50+ lidí', en: '50+ people', mult: 3 },
]

export const SYMPTOMS: WizardOption[] = [
  { id: 'data-copy', cs: 'Přepisování dat mezi systémy', en: 'Retyping data between systems' },
  { id: 'repeat-questions', cs: 'Odpovídání na stejné dotazy', en: 'Answering the same questions' },
  { id: 'quotes-invoices', cs: 'Tvorba nabídek a faktur', en: 'Writing quotes & invoices' },
  { id: 'reports', cs: 'Reporty pro vedení', en: 'Reports for management' },
  { id: 'shift-planning', cs: 'Plánování směn a kapacit', en: 'Planning shifts & capacity' },
  { id: 'orders-stock', cs: 'Objednávky a sklad', en: 'Orders & inventory' },
  { id: 'excel', cs: 'Ruční plnění Excelů', en: 'Filling in spreadsheets by hand' },
]

export const FREQUENCIES: WizardOption[] = [
  { id: 'monthly', cs: 'Ano, každý měsíc', en: 'Yes, every month' },
  { id: 'sometimes', cs: 'Občas se to protáhne', en: 'Sometimes it drags on' },
  { id: 'rarely', cs: 'Ne, máme to rychle', en: 'No, we close fast' },
]

export type Complexity = 'quick' | 'project'

export type Automation = {
  id: string
  complexity: Complexity
  /** Estimated hours/week reclaimed [low, high] for a 1–5 person team. */
  hours: [number, number]
  cs: { name: string; desc: string }
  en: { name: string; desc: string }
}

/** Catalog — keys match SYMPTOMS ids; extras are added by rules below. */
const CATALOG: Record<string, Automation> = {
  'data-copy': {
    id: 'data-copy', complexity: 'project', hours: [3, 6],
    cs: {
      name: 'Systémy si předávají data samy',
      desc: 'Objednávky, faktury a kontakty se mezi vašimi programy přenesou automaticky. Nikdo nic nepřepisuje a nevznikají překlepy.',
    },
    en: {
      name: 'Systems pass data between themselves',
      desc: 'Orders, invoices and contacts move between your programs automatically. Nobody retypes anything and typos disappear.',
    },
  },
  'repeat-questions': {
    id: 'repeat-questions', complexity: 'quick', hours: [2, 4],
    cs: {
      name: 'Asistent na opakované dotazy',
      desc: 'Na dotazy, které chodí pořád dokola, odpoví AI — z vašich podkladů a vaším tónem. Lidem zůstanou jen ty složité.',
    },
    en: {
      name: 'Assistant for repeat questions',
      desc: 'AI answers the questions that keep coming back — from your materials, in your tone. People only handle the hard ones.',
    },
  },
  'quotes-invoices': {
    id: 'quotes-invoices', complexity: 'quick', hours: [2, 4],
    cs: {
      name: 'Nabídky a faktury na pár kliků',
      desc: 'Z poptávky vznikne nabídka i faktura ze šablony sama. Vy ji jen zkontrolujete a odešlete.',
    },
    en: {
      name: 'Quotes & invoices in a few clicks',
      desc: 'An inquiry turns into a quote and an invoice from a template on its own. You just review and send.',
    },
  },
  reports: {
    id: 'reports', complexity: 'quick', hours: [2, 3],
    cs: {
      name: 'Report, který se sestaví sám',
      desc: 'Čísla se stáhnou z vašich systémů a přehled pro vedení přijde každé pondělí ráno hotový.',
    },
    en: {
      name: 'The report that builds itself',
      desc: 'Numbers pull from your systems and the management overview arrives ready every Monday morning.',
    },
  },
  'shift-planning': {
    id: 'shift-planning', complexity: 'project', hours: [1, 3],
    cs: {
      name: 'Plánování směn bez tabulek',
      desc: 'Aplikace ohlídá kapacity, dovolené i přesčasy a návrh směn připraví za vás. Změny vidí všichni hned.',
    },
    en: {
      name: 'Shift planning without spreadsheets',
      desc: 'An app watches capacity, holidays and overtime and drafts the schedule for you. Everyone sees changes instantly.',
    },
  },
  'orders-stock': {
    id: 'orders-stock', complexity: 'project', hours: [2, 5],
    cs: {
      name: 'Objednávky a sklad v jednom',
      desc: 'Objednávka sama odepíše zboží ze skladu a pohlídá, co dochází. Stav vidíte v reálném čase, ne až při inventuře.',
    },
    en: {
      name: 'Orders & inventory in one place',
      desc: 'An order deducts stock by itself and flags what is running low. You see reality live, not at the yearly count.',
    },
  },
  excel: {
    id: 'excel', complexity: 'quick', hours: [2, 4],
    cs: {
      name: 'Konec ručně plněných Excelů',
      desc: 'Data, která dnes někdo přepisuje do tabulek, se sbírají sama do jednoho přehledu. Vždy aktuální, bez přepisování.',
    },
    en: {
      name: 'The end of hand-filled spreadsheets',
      desc: 'Data someone retypes into sheets today collects itself into one overview. Always current, no copying.',
    },
  },
  'month-close': {
    id: 'month-close', complexity: 'quick', hours: [1, 3],
    cs: {
      name: 'Klidný konec měsíce',
      desc: 'Podklady pro účetní a měsíční přehledy se připraví samy v průběhu měsíce. Uzávěrka bez přesčasů.',
    },
    en: {
      name: 'A calm month-end',
      desc: 'Accounting documents and monthly summaries prepare themselves during the month. Closing without overtime.',
    },
  },
}

/** Fallback picks per industry — used to pad the map to at least 3 items. */
const INDUSTRY_DEFAULTS: Record<string, string[]> = {
  vyroba: ['orders-stock', 'reports', 'shift-planning'],
  eshop: ['repeat-questions', 'orders-stock', 'data-copy'],
  sluzby: ['quotes-invoices', 'repeat-questions', 'reports'],
  stavebnictvi: ['quotes-invoices', 'reports', 'data-copy'],
  obchod: ['data-copy', 'quotes-invoices', 'reports'],
  jine: ['reports', 'repeat-questions', 'data-copy'],
}

export type PlanItem = Automation & { scaled: [number, number] }

export type WizardAnswers = {
  industry: string
  team: string
  symptoms: string[]
  freq: string
  note: string
}

const MIN_ITEMS = 3
const MAX_ITEMS = 5

/**
 * Deterministic rule-based plan. Selected symptoms map 1:1 to catalog
 * automations; a slow month-end adds one more; industry defaults pad the
 * list to MIN_ITEMS. Hours scale with team size. Ordered by impact
 * (high estimate first, quick wins breaking ties) and capped at MAX_ITEMS.
 */
export function buildPlan(a: WizardAnswers): { items: PlanItem[]; total: [number, number] } {
  const mult = TEAM_SIZES.find((tSize) => tSize.id === a.team)?.mult ?? 1
  const ids: string[] = a.symptoms.filter((id) => CATALOG[id])
  if ((a.freq === 'monthly' || a.freq === 'sometimes') && !ids.includes('month-close')) {
    ids.push('month-close')
  }
  for (const id of INDUSTRY_DEFAULTS[a.industry] ?? INDUSTRY_DEFAULTS.jine) {
    if (ids.length >= MIN_ITEMS) break
    if (!ids.includes(id)) ids.push(id)
  }

  const items = ids
    .map((id) => {
      const auto = CATALOG[id]
      const scaled: [number, number] = [
        Math.max(1, Math.round(auto.hours[0] * mult)),
        Math.round(auto.hours[1] * mult),
      ]
      return { ...auto, scaled }
    })
    .sort(
      (x, y) =>
        y.scaled[1] - x.scaled[1] ||
        (x.complexity === 'quick' ? -1 : 1) - (y.complexity === 'quick' ? -1 : 1)
    )
    .slice(0, MAX_ITEMS)

  const total = items.reduce<[number, number]>(
    (acc, item) => [acc[0] + item.scaled[0], acc[1] + item.scaled[1]],
    [0, 0]
  )
  return { items, total }
}

/** Label lookup shared by the component and the mailto serializer. */
export function optionLabel(list: WizardOption[], id: string, lang: Lang): string {
  return list.find((o) => o.id === id)?.[lang] ?? ''
}
