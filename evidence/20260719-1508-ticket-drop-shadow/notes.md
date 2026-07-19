# 整票阴影（ticket drop-shadow）

## 目的

为整个票根增加阴影效果，让票根更贴近实物（悬浮于页面背景之上的纸质票卡感）。

## 问题分析

票根本体此前已带 Tailwind `shadow-2xl`（box-shadow），但截图确认完全不可见：
票根通过 `mask-image: radial-gradient(...)` 在右侧切半圆缺口，mask 绘制区默认限于
border-box，落在外部的 box-shadow 被整体裁掉。

## 方案

- 移除票根本体的 `shadow-2xl`（无效样式）。
- 在倾斜包装层（tiltWrapper，无 mask）上加双层 `filter: drop-shadow(...)`：
  - 近层 `0 10px 16px rgba(0,0,0,0.30)`：接触阴影，小而实；
  - 远层 `0 28px 56px rgba(0,0,0,0.32)`：环境阴影，大而柔。
- drop-shadow 跟随票根 mask 后的真实轮廓投影（圆角 + 右侧缺口镂空均正确）。
- 导出目标是票根元素（ticketRef）而非包装层，导出图片保持纯净无阴影，不受影响。

## 改动文件

- `src/components/TicketCard/index.vue`

## 验收

- `screenshots/before-shadow.png`：修改前，票根无阴影，贴底扁平。
- `screenshots/after-shadow.png`：修改后，整票阴影出现，票根悬浮感明显；
  缺口处阴影沿镂空内弧弯曲，轮廓正确。
- `screenshots/hover-shadow.png`：hover 状态渲染正常。
- `screenshots/mobile-shadow.png`：移动端（390px）阴影正常，缺口轮廓正确。
- 控制台无 error/warn；`vue-tsc` 仅存在 InfoArea.vue 的 3 个历史遗留报错（HEAD 已有，与本次无关）。
