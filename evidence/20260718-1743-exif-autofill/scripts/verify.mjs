// EXIF 自动填充自验收脚本
// 流程：启动本机 Chrome -> 打开 http://localhost:5173 -> 上传含 EXIF 的照片
//       -> 等待自动填充 -> 读取编辑面板字段值 -> 截图归档
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PHOTO = 'C:\\Users\\36007\\Downloads\\IMG_0853.jpeg'
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
  await page.screenshot({ path: `${SHOTS}/01-before-upload.png` })

  // 上传含 EXIF（GPS + 拍摄时间）的照片
  const input = await page.$('input[type=file]')
  await input.uploadFile(PHOTO)

  // 等待逆地理编码 + 颜色提取完成（地点字段出现非初始值）
  await page.waitForFunction(
    () => {
      const inputs = [...document.querySelectorAll('input')].filter((i) => i.type === 'text')
      return inputs.length >= 4 && inputs[0].value && inputs[0].value !== '杭州'
    },
    { timeout: 20000 },
  )
  await new Promise((r) => setTimeout(r, 1500))

  // 读取四个字段：地点 / 时间 / 编号 / 随机码
  const values = await page.evaluate(
    () => [...document.querySelectorAll('input')].filter((i) => i.type === 'text').map((el) => el.value),
  )
  console.log('FIELDS:', JSON.stringify(values))

  await page.screenshot({ path: `${SHOTS}/02-after-upload.png`, fullPage: true })
} finally {
  await browser.close()
}
