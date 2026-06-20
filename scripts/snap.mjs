// Dev verification: drive system Chrome, capture console + screenshots at
// several scroll positions. Usage: node scripts/snap.mjs [outPrefix]
import { chromium } from 'playwright-core'

const prefix = process.argv[2] ?? '/tmp/half'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleMsgs = []
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 300)}`))

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000) // loader exit + world fade-in

const stops = [
  ['hero', 0],
  ['services-1', 0.28],
  ['services-2', 0.42],
  ['about', 0.78],
  ['contact', 0.93],
]

for (const [name, p] of stops) {
  await page.evaluate((pp) => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollTo(0, max * pp)
  }, p)
  await page.waitForTimeout(2500) // lenis smoothing + transition settle
  await page.screenshot({ path: `${prefix}-${name}.png` })
}

console.log('--- console output ---')
for (const m of consoleMsgs) console.log(m)
console.log(`--- ${stops.length} screenshots written to ${prefix}-*.png ---`)
await browser.close()
