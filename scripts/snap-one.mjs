import { chromium } from 'playwright-core'
const [, , out = '/tmp/half-dbg.png', scroll = '0'] = process.argv
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)
const p = Number(scroll)
if (p > 0) {
  await page.evaluate((pp) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * pp), p)
  await page.waitForTimeout(2500)
}
await page.screenshot({ path: out })
console.log('written', out)
await browser.close()
