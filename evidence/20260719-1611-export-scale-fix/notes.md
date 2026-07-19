# 导出图片内容放大失真修复（export scale fix）

## 问题

用户导出的票根图片中，照片与右侧文案被整体放大、溢出裁切（"SINGAPORE" 裁成 "SINGA"），
与页面预览不符。见 `screenshots/user-report-broken-export.jpg`（1251x534）。

## 根因分析

票根的字号（baseFontSize）、地点缩放（locationScale）、照片铺满尺寸（baseSize）
都是 ResizeObserver 异步烘焙到内联样式的值。html2canvas 导出时直接克隆 DOM 快照：

- **烘焙值滞后**：若烘焙值停留在更宽布局时的状态（如窗口从宽变窄后未及时更新），
  快照会把「宽布局的大字号/大图」套进「窄布局的小票根」，产生整体放大溢出。
  实验证实：手动把 800px 布局的烘焙值注入 416px 票根，导出走样与用户图片完全一致
  （`repro-stale-export-broken.jpg` vs `user-report-broken-export.jpg`）。
- **隐藏实例误导出**：桌面/移动两个 TicketCard 实例始终同时挂载，`downloadTicket`
  无条件优先取桌面实例。移动端视口下桌面实例 display:none，烘焙值全部失效
  （字号回退 10px、照片尺寸残留旧值），且 html2canvas 对 display:none 目标产出
  0 字节空白文件（实测复现）。

## 修复

- `HomeView.vue` `downloadTicket`：按 `offsetWidth > 0` 选当前可见实例；
  导出前 `await cardRef.prepareForExport()`。
- `TicketCard/index.vue`：新增 `prepareForExport()`，同步调用两个子组件的
  `recompute()` 并 `await nextTick()`，保证快照前烘焙值与当前布局一致。
- `InfoArea.vue` / `PhotoArea.vue`：暴露 `recompute()`（重算字号+地点缩放 /
  重算照片铺满尺寸）。

## 验收（CDP 真实导出流程）

- 陈旧状态自愈：830px 视口注入陈旧烘焙值（预览即走样，见
  `repro-stale-preview-broken.png`），导出后完全恢复正常
  （`fixed-export-830-healed.jpg`）✓
- 移动端视口（<768px）：导出可见的移动实例，非空且与预览一致
  （`fixed-export-mobile.jpg` / `fixed-preview-mobile.png`）✓
- 桌面回归：1440px 视口 + 照片 1.6x 缩放平移，导出与预览 1:1
  （`fixed-export-desktop-panzoom.jpg` / `fixed-preview-desktop-panzoom.png`）✓
- 控制台无 error/warn；vue-tsc 仅 3 个 InfoArea.vue 历史遗留报错（HEAD 已有）。

## 备注（未处理，超出本次范围）

- 移动端窄宽度下地点文字贴合信息区边缘（updateLocationScale 的 Canvas 测量与实际
  渲染宽度有轻微误差），预览与导出一致，属既有排版问题。
- 导出图不含右侧半圆缺口与整票阴影（html2canvas 不支持 mask-image / filter），
  为已知导出限制。
