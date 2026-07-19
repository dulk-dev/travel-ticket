# 导出与窗口尺寸解耦（固定 900px 设计宽度导出）

## 问题

用户观察：浏览器窗口大小会影响导出效果（怀疑百分比/固定值混用）。

实测确认（陈旧值已修复的前提下）：

| 导出条件 | 票根宽 | 条形码占票高 | 分辨率 |
| --- | --- | --- | --- |
| 830px 视口 | 417px | **24.5%** | 1251px |
| 1440px 视口 | 800px | 14.5% | 2400px |

根因：票根是响应式布局（`width:100%`），而条形码固定 `h-12`（48px）、
裁剪线固定 12px —— 固定 px 元素不随票根缩放，窄窗口导出比例失真且分辨率漂移。
文字（字号=票高 6%）是纯比例缩放，不受影响（7.3% vs 7.3%）。

## 修复

导出时强制 900px 设计宽度，与窗口尺寸完全解耦：

- `src/components/TicketCard/index.vue`：新增 `exportWidth` 响应式值接入
  `ticketBaseStyle.width`；`prepareForExport()` 先切 900px → 等布局 → 同步重算
  烘焙值（字号/地点缩放/照片铺满尺寸）→ 等 Vue 刷 DOM；新增
  `restoreAfterExport()` 恢复响应式宽度并回算。
- `src/views/HomeView.vue`：`downloadTicket` 用 try/finally 包裹导出，
  无论成败都恢复布局。

## 验收（真实导出流程，用户照片 YCnYPJmxlf.jpg）

- 830px 视口导出：2700x1149（900px），SINGAPORE 完整、条形码占比 12.6% ✓
- 390px 视口导出：2700x1149，移动端 58% 照片比例正确、非空 ✓
- 1440px 视口导出：2700x1149 ✓
- **830 与 1440 两次导出逐像素对比：平均绝对差 (1.1, 1.0, 1.0)，JPEG 噪声级** ——
  窗口尺寸对导出无影响 ✓
- 导出后预览恢复响应式（票根回到 414px，字号回算 11px）✓
- vue-tsc 仅 3 个 InfoArea 历史遗留报错，无新增。

## 证据

- `screenshots/export-830-viewport.jpg` / `export-390-viewport.jpg` / `export-1440-viewport.jpg`
- `screenshots/preview-830-responsive.png`：导出后预览已恢复响应式
