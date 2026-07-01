import type { AuditTask } from './types'

/**
 * Curated task list for the terminal automation audit (CTA section).
 * `serviceId` maps to SERVICES[].id in lib/content.ts for the accent color.
 * `hours` = estimated hours/week reclaimed [low, high]; 'fine' verdicts stay [0, 0].
 */
export const AUDIT_TASKS: AuditTask[] = [
  {
    id: 'invoicing', serviceId: 'automation', verdict: 'auto', hours: [2, 4],
    cs: 'Fakturace a upomínky', en: 'Invoicing & payment reminders',
  },
  {
    id: 'order-entry', serviceId: 'automation', verdict: 'auto', hours: [3, 6],
    cs: 'Přepisování objednávek z e-mailů', en: 'Retyping orders from e-mails',
  },
  {
    id: 'data-copy', serviceId: 'api', verdict: 'auto', hours: [2, 5],
    cs: 'Kopírování dat mezi dvěma systémy', en: 'Copying data between two systems',
  },
  {
    id: 'excel-reports', serviceId: 'automation', verdict: 'auto', hours: [2, 4],
    cs: 'Sestavování týdenních reportů v Excelu', en: 'Building weekly Excel reports',
  },
  {
    id: 'repeat-questions', serviceId: 'ai', verdict: 'partial', hours: [2, 4],
    cs: 'Odpovídání na stále stejné dotazy', en: 'Answering the same questions again',
  },
  {
    id: 'shift-planning', serviceId: 'webapps', verdict: 'partial', hours: [1, 3],
    cs: 'Plánování směn a kapacit', en: 'Planning shifts & capacity',
  },
  {
    id: 'inventory', serviceId: 'webapps', verdict: 'partial', hours: [2, 4],
    cs: 'Vedení skladové evidence', en: 'Keeping inventory records',
  },
  {
    id: 'crm-entry', serviceId: 'api', verdict: 'auto', hours: [1, 3],
    cs: 'Ruční zadávání dat do CRM', en: 'Typing data into the CRM by hand',
  },
  {
    id: 'accounting-prep', serviceId: 'automation', verdict: 'auto', hours: [1, 2],
    cs: 'Příprava podkladů pro účetní', en: 'Preparing documents for the accountant',
  },
  {
    id: 'social-posting', serviceId: 'automation', verdict: 'partial', hours: [1, 3],
    cs: 'Publikování na sociální sítě', en: 'Publishing to social media',
  },
  {
    id: 'price-watch', serviceId: 'automation', verdict: 'auto', hours: [1, 2],
    cs: 'Hlídání cen konkurence', en: 'Watching competitor prices',
  },
  {
    id: 'payment-matching', serviceId: 'api', verdict: 'auto', hours: [1, 2],
    cs: 'Párování plateb s fakturami', en: 'Matching payments to invoices',
  },
  {
    id: 'client-onboarding', serviceId: 'webapps', verdict: 'partial', hours: [1, 3],
    cs: 'Onboarding nových klientů', en: 'Onboarding new clients',
  },
  {
    id: 'contract-templates', serviceId: 'automation', verdict: 'auto', hours: [1, 2],
    cs: 'Generování smluv ze šablon', en: 'Generating contracts from templates',
  },
  {
    id: 'client-meetings', serviceId: 'web', verdict: 'fine', hours: [0, 0],
    cs: 'Osobní schůzky s klienty', en: 'Meeting clients in person',
  },
  {
    id: 'brand-strategy', serviceId: 'web', verdict: 'fine', hours: [0, 0],
    cs: 'Rozhodování o značce a strategii', en: 'Deciding brand & strategy',
  },
]
