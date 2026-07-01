// Capture reference-site screenshots as WebGL-texture-ready JPEGs.
// Usage: node scripts/capture-refs.mjs
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = new URL('../public/assets/refs/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const SITES = [
  { slug: 'jepostaveno', url: 'https://www.jepostaveno.cz' },
  { slug: 'izolacefuk', url: 'https://www.izolacefuk.cz' },
]

// desktop 1600x1000 (16:10, texture-friendly), mobile 780x1688 (390x844 @2x)
const SHOTS = [
  { kind: 'desktop', viewport: { width: 1600, height: 1000 }, dpr: 1 },
  { kind: 'mobile', viewport: { width: 390, height: 844 }, dpr: 2 },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })

for (const site of SITES) {
  for (const shot of SHOTS) {
    const page = await browser.newPage({
      viewport: shot.viewport,
      deviceScaleFactor: shot.dpr,
      isMobile: shot.kind === 'mobile',
      hasTouch: shot.kind === 'mobile',
    })
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2500)
    // best-effort CookieYes dismissal (both sites use it)
    for (const sel of ['.cky-btn-accept', '.cky-btn-reject', '[data-cky-tag="accept-button"]']) {
      const btn = page.locator(sel).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(800)
        break
      }
    }
    const path = `${OUT}${site.slug}-${shot.kind}.jpg`
    await page.screenshot({ path, type: 'jpeg', quality: 82 })
    console.log('wrote', path)
    await page.close()
  }
}

await browser.close()
console.log('done')
