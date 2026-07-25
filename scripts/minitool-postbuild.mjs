import { readFile, writeFile, readdir, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = 'dist-minitool'

// 小红书小工具 postbuild 清理
// 1. 移除 crossorigin 属性（容器 CSP 下跨域属性无意义且可能触发拦截）
// 2. 删除 .ico favicon（容器不支持 .ico，且 index.html 不引用）
// 3. 删除 .map 文件（sourcemap 已关，双保险）
async function clean() {
  // 处理 index.html：移除 crossorigin
  const htmlPath = join(DIST, 'index.html')
  let html = await readFile(htmlPath, 'utf-8')
  const before = html
  html = html.replace(/\s+crossorigin(="[^"]*")?/g, '')
  if (html !== before) {
    await writeFile(htmlPath, html, 'utf-8')
    console.log('[postbuild] removed crossorigin from index.html')
  }

  // 递归清理 .ico / .map
  const walk = async (dir) => {
    const entries = await readdir(dir)
    for (const name of entries) {
      const p = join(dir, name)
      const s = await stat(p)
      if (s.isDirectory()) {
        await walk(p)
      } else if (name.endsWith('.ico') || name.endsWith('.map')) {
        await unlink(p)
        console.log(`[postbuild] removed ${p}`)
      }
    }
  }
  await walk(DIST)
  console.log('[postbuild] done')
}

clean().catch((err) => {
  console.error('[postbuild] failed:', err)
  process.exit(1)
})
