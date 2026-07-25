# 小红书小工具 CSS 兼容性修复

## 问题现象

容器（PC 模拟器 / 真机 WebView）中票根完全空白，页面其他部分（表单、按钮、背景）正常。

## 根因分析

Tailwind CSS v4 构建产物包含以下旧版 WebView 不支持的语法：

| 语法 | 支持版本 | 影响 |
|---|---|---|
| `@layer` | Chrome 99+ | 整个样式表解析失败，所有样式丢失 |
| `@property` | Chrome 85+ | 部分动画/变换失效 |
| `oklch()` | Chrome 111+ | 颜色值无效，元素透明 |
| `color-mix()` | Chrome 111+ | 颜色值无效 |
| `:where()` | Chrome 88+ | 选择器失效 |

截图对比：
- `02-container-broken.png`：容器中票根空白（@layer 导致样式表整体失效）
- `01-dev-normal.png`：开发环境正常（Chrome 135 支持所有语法）

## 修复方案

postbuild 增加 `minitool-css-compat.mjs` 脚本，对构建产物 CSS 做兼容处理：

1. **剥离 `@layer`** — 保留内部样式内容，移除 layer wrapper
2. **剥离 `@property`** — 整块移除（旧浏览器不支持，且不影响布局）
3. **LightningCSS 转译** — `oklch` → hex/rgb，添加厂商前缀
4. **剥离 `@supports`** — 保留内部内容（主要是厂商前缀 fallback）
5. **替换 `:where(x)` → `x`** — 降低特异性但兼容旧浏览器
6. **移除 `color-mix()`** — 替换为 `currentColor` fallback

## 处理结果

```
@layer: false
@property: false
oklch: false
color-mix: false
:where: false
@supports: false
@media: true   # 保留，广泛支持
var(): true    # 保留，Chrome 49+ 支持
calc(): true   # 保留，Chrome 26+ 支持
flex: true     # 保留，已加 -webkit- 前缀
grid: true     # 保留，已加 -webkit- 前缀
```

## 产物

- **zip**: `travel-ticket-tool.zip`（570.8 KB）
- **CSS**: 43056 bytes（原 22401 bytes，膨胀因厂商前缀和 fallback）

## 遗留风险

1. **`:where()` 替换为直接选择器** — 特异性略升，但 Tailwind 的 `:where()` 主要用于 reset，影响可控
2. **`color-mix` 替换为 `currentColor`** — 占位符颜色略深，但功能正常
3. **容器实际 WebView 版本未知** — 若低于 Chrome 49（`var()` 支持），需进一步降级
