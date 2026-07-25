# 小红书小工具返工执行记录

## 执行目的

按官方 minitool-zip-builder skill 1.3.1 全量返工 xhs-tool 分支，修复上次 commit（9fab1cc）中未处理的容器违规能力，建立独立构建/打包/扫描管线，产出合规 zip。

## 关键变更

### 1. 官方 skill 覆盖
- 用官方 1.3.1 zip 覆盖 `.agents/skills/minitool-zip-builder/`
- 关键差异：安全区必须用 `var(--safe-area-inset-*, env(...))` 组合（PC 模拟器注入 CSS 变量而非真实 env）

### 2. 源码违规修复
- `useMockData.ts`：移除 `fetch('https://ipwho.is/...')` IP 定位，默认城市固定「北京市」
- `useImageUpload.ts`：移除 `fetch('https://nominatim.openstreetmap.org/...')` GPS 逆地理编码，EXIF 仅保留日期提取
- 删除未使用的脚手架组件（HelloWorld / TheWelcome / WelcomeItem / icons / logo.svg），含大量 `target="_blank"` 外链

### 3. 构建管线
- `vite.config.minitool.ts`：独立配置（无 vueDevTools、`base: './'`、关闭 sourcemap、关闭 modulePreload polyfill）
- `scripts/minitool-postbuild.mjs`：清理 crossorigin 属性 + 删除 .ico / .map
- `scripts/minitool-zip.mjs`：用 archiver ZipArchive 打包 dist-minitool 目录内容（index.html 在 zip 根）
- `scripts/minitool-scan.mjs`：自动扫描产物中的违规 API 模式

### 4. 跨端适配
- `main.css` body 增加：`-webkit-touch-callout: none`、`-webkit-tap-highlight-color: transparent`、`user-select: none`、`touch-action: manipulation`、安全区 padding（`var(--safe-area-inset-*, env(...))` 组合）

## 扫描结果（minitool-scan.mjs）

| 模式 | 状态 | 说明 |
|---|---|---|
| createElement(a) + .download= | HIT（保留） | useTicketExport.downloadImage，按用户决策保留待 PC 模拟器实测 |
| XMLHttpRequest | HIT（无法移除） | html2canvas 内部图片加载（特性检测 + 本地图片 XHR），非联网请求 |
| fetch( | PASS | 已通过 modulePreload.polyfill: false 移除 Vite 预加载 polyfill |
| 其余 20+ 违规模式 | PASS | 全部通过 |

## 产物

- **zip**: `travel-ticket-tool.zip`（557.1 KB，远低于 2MB 建议值）
- **结构**: index.html 在根目录 + assets/（1 CSS + 1 JS + 5 张纸质纹理 jpg）
- **文件类型**: 仅 html / css / js / jpg，全部合规

## 浏览器自验收

- 初始加载正常，默认数据（北京市/日期/编号/随机码）正确渲染
- 导出功能正常（开发环境 Chrome 可下载）
- 截图见 `screenshots/01-initial-load.png`、`02-export-clicked.png`

## 遗留风险

1. **a[download] 在 PC 模拟器/真机是否被拦截** —— 需实际上传 zip 到小红书容器验证。若被拦截，需改为「导出后全屏预览 + 引导截图」方案
2. **html2canvas XMLHttpRequest** —— 容器 CSP 若严格禁止 XHR（包括本地），导出功能会失败。需实测确认
