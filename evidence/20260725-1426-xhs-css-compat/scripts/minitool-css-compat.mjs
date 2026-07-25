import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { transform, Features } = require('lightningcss')

const assetsDir = 'dist-minitool/assets'
const cssFile = readdirSync(assetsDir).find((f) => f.endsWith('.css'))
if (!cssFile) {
  console.error('[css-compat] no CSS file found')
  process.exit(1)
}

const cssPath = join(assetsDir, cssFile)
const css = readFileSync(cssPath, 'utf8')

/**
 * 小红书小工具容器（旧版 WebView）CSS 兼容处理
 * 1. 剥离 @layer wrapper（Tailwind v4 核心语法，旧浏览器不支持）
 * 2. 剥离 @property 规则（Tailwind v4 用于动画/变换，旧浏览器不支持）
 * 3. LightningCSS 转译 oklch / color-mix 为兼容格式
 */

// 步骤 1: 剥离 @layer —— 匹配 @layer xxx { ... } 并保留内部内容
// 也处理 @layer xxx;（空 layer 声明，无内容）
function stripLayer(input) {
  let result = input
  // 先处理空 layer 声明：@layer xxx;
  result = result.replace(/@layer\s+[\w-]+\s*;/g, '')
  // 再处理带内容的 layer：@layer xxx { ... }
  let changed = true
  while (changed) {
    changed = false
    const layerStart = result.search(/@layer\s+[\w-]+\s*\{/)
    if (layerStart === -1) break

    const openBrace = result.indexOf('{', layerStart)
    let depth = 1
    let closeBrace = openBrace + 1
    while (depth > 0 && closeBrace < result.length) {
      if (result[closeBrace] === '{') depth++
      else if (result[closeBrace] === '}') depth--
      closeBrace++
    }

    if (depth === 0) {
      const inner = result.slice(openBrace + 1, closeBrace - 1)
      result = result.slice(0, layerStart) + inner + result.slice(closeBrace)
      changed = true
    }
  }
  return result
}

// 步骤 2: 剥离 @property —— 匹配 @property xxx { ... } 并整块移除
function stripProperty(input) {
  let result = input
  let changed = true
  while (changed) {
    changed = false
    const propStart = result.search(/@property\s+[\w-]+\s*\{/)
    if (propStart === -1) break

    const openBrace = result.indexOf('{', propStart)
    let depth = 1
    let closeBrace = openBrace + 1
    while (depth > 0 && closeBrace < result.length) {
      if (result[closeBrace] === '{') depth++
      else if (result[closeBrace] === '}') depth--
      closeBrace++
    }

    if (depth === 0) {
      result = result.slice(0, propStart) + result.slice(closeBrace)
      changed = true
    }
  }
  return result
}

let processed = stripLayer(css)
processed = stripProperty(processed)

console.log('[css-compat] @layer stripped:', !processed.includes('@layer'))
console.log('[css-compat] @property stripped:', !processed.includes('@property'))

// 步骤 3: LightningCSS 转译颜色与厂商前缀
const result = transform({
  filename: cssFile,
  code: Buffer.from(processed),
  minify: true,
  targets: { chrome: 80 << 16 }, // Chrome 80 (2020)
  include: Features.Colors | Features.VendorPrefixes,
})

const output = result.code.toString()
console.log('[css-compat] oklch removed:', !output.includes('oklch'))
console.log('[css-compat] color-mix removed:', !output.includes('color-mix'))
console.log('[css-compat] size:', css.length, '->', output.length)

writeFileSync(cssPath, output, 'utf8')
console.log('[css-compat] written to', cssPath)
