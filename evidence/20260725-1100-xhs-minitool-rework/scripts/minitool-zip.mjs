import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { createWriteStream } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { ZipArchive } = require('archiver')

const SRC = 'dist-minitool'
const OUT = 'travel-ticket-tool.zip'

// 小红书小工具打包：压缩 dist-minitool 目录「内容」（index.html 在 zip 根目录）
// 禁止：node_modules / .git / .DS_Store / *.map / 构建配置
const FORBIDDEN = /node_modules|\.git|\.DS_Store|\.map$|vite\.config|webpack\.config/i

async function* walk(dir) {
  const entries = await readdir(dir)
  for (const name of entries) {
    const p = join(dir, name)
    const s = await stat(p)
    if (FORBIDDEN.test(name)) continue
    if (s.isDirectory()) yield* walk(p)
    else yield p
  }
}

async function pack() {
  const output = createWriteStream(OUT)
  const archive = new ZipArchive({ zlib: { level: 9 } })

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve)
    archive.on('error', reject)
  })

  archive.pipe(output)

  let count = 0
  for await (const file of walk(SRC)) {
    const rel = relative(SRC, file).replaceAll('\\', '/')
    archive.file(file, { name: rel })
    count++
  }

  await archive.finalize()
  await done
  console.log(`[zip] packed ${count} files -> ${OUT} (${(await stat(OUT)).size} bytes)`)
}

pack().catch((err) => {
  console.error('[zip] failed:', err)
  process.exit(1)
})
