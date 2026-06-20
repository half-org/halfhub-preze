import { chromium } from 'playwright-core'
const url = process.argv[2] ?? 'http://192.168.0.172:3000/'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1150, height: 982 } })
const msgs = []
page.on('console', (m) => { if (m.type() !== 'log') msgs.push(`[${m.type()}] ${m.text().slice(0, 400)}`) })
page.on('pageerror', (e) => msgs.push(`[PAGEERROR] ${String(e).slice(0, 600)}`))
page.on('requestfailed', (r) => msgs.push(`[REQFAIL] ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(8000)
await page.screenshot({ path: '/tmp/ip-test.png' })
console.log('--- console/errors ---')
msgs.forEach((m) => console.log(m))
console.log('--- state ---')
console.log(JSON.stringify(await page.evaluate(() => ({
  loaderVisible: !!document.querySelector('[data-loader]'),
  canvas: !!document.querySelector('canvas'),
  secureContext: window.isSecureContext,
}))))
await browser.close()
