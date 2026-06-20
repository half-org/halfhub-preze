import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })

// Mobile viewport
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
await m.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await m.waitForTimeout(6000)
await m.screenshot({ path: '/tmp/m-hero.png' })
await m.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.35))
await m.waitForTimeout(2500)
await m.screenshot({ path: '/tmp/m-services.png' })
await m.close()

// Reduced motion
const r = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await r.emulateMedia({ reducedMotion: 'reduce' })
await r.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await r.waitForTimeout(3000)
const hasCanvas = await r.evaluate(() => !!document.querySelector('canvas'))
const loaderGone = await r.evaluate(() => !document.querySelector('[role="status"]'))
console.log('reduced-motion: canvas =', hasCanvas, '| loader gone =', loaderGone)
await r.screenshot({ path: '/tmp/rm-hero.png' })
await browser.close()
console.log('done')
