// 默认状态（未上传照片）验收：地点应来自访问者 IP，日期为当天
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SHOTS = `${BASE}/screenshots`
mkdirSync(SHOTS, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--window-size=1440,900'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 })

  // 等待 IP 定位结果写入（初始值为「杭州」，加载完成后应被替换）
  await page.waitForFunction(
    () => {
      const inputs = [...document.querySelectorAll('input')].filter((i) => i.type === 'text')
      return inputs.length >= 4 && inputs[0].value && inputs[0].value !== '杭州'
    },
    { timeout: 15000 },
  )

  const values = await page.evaluate(
    () => [...document.querySelectorAll('input')].filter((i) => i.type === 'text').map((el) => el.value),
  )
  const today = new Date()
  const expectDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  console.log('FIELDS:', JSON.stringify(values.slice(0, 4)))
  console.log('EXPECT_DATE:', expectDate, '| MATCH:', values[1] === expectDate)

  await page.screenshot({ path: `${SHOTS}/03-default-ip-location.png`, fullPage: true })
} finally {
  await browser.close()
}
