# 票根照片编辑交互修复 - 执行记录

## 执行目的

修复上传图片后的两个编辑交互问题：

1. **难以对齐**：移动图片后没有「贴边」的对齐反馈，很难把图片对齐到取景框边缘。
2. **无法缩放**：滚轮/缩放操作无法放大图片。

## 根因分析

- `PhotoArea.vue` 中的 `containerRef` **从未绑定到任何 DOM 元素**，导致 `getBoundingClientRect()` 恒返回 `width: 0`：
  - `onWheel` 因 `if (!container.width) return` 直接返回 → 缩放完全失效。
  - `constrainTranslation` 提前返回 → 拖拽无约束、无贴边反馈。
- 位移约束使用图片 `naturalWidth/naturalHeight` 计算，但图片元素为 `object-cover` 且 `w-full h-full`，其变换盒尺寸实际等于容器尺寸，几何计算错误。
- 滚轮监听绑定在 `window` 上，会劫持整页滚动，而非仅在编辑区域生效。

## 修复方案

`src/composables/usePhotoTransform.ts`：

- 位移约束改用容器尺寸计算：`maxOffset = 容器尺寸 * (scale - 1) / 2`，保证图片始终铺满取景框、不露白边。
- 新增磁吸 `snap()`：拖拽时距离铺边（±maxOffset）或居中（0）在 `SNAP_THRESHOLD = 12px` 内自动吸附，形成「贴边感」。
- `onWheel` 以取景框中心为基准换算鼠标坐标（`transformOrigin: center`），实现以光标为中心的缩放；`onWheel`/`onMouseMove` 不再依赖图片自然尺寸参数。

`src/components/TicketCard/PhotoArea.vue`：

- 将 `ref="containerRef"` 绑定到根 div（取景框），修复核心 bug。
- 滚轮监听改为绑定在编辑区域（container）而非 `window`，且仅在存在图片时缩放，避免劫持页面滚动。
- 拖拽 move/up 仍绑定 `window`，保证鼠标移出取景框时仍可持续拖拽。

## 验证方式与结论

通过 Chrome DevTools / Playwright 驱动浏览器，注入带网格 + 黄色边框的测试图片，模拟真实滚轮与拖拽。

- **初始加载（screenshots/ 记录的 before 状态）**：scale 1 时网格图铺满取景框，四边黄色边框与取景框严丝合缝。
- **缩放**：在编辑区域内向上滚轮 5 次 → `scale = 1.1^5 ≈ 1.6105`，位移保持居中；以光标为中心缩放生效。
- **不露白边（clamp）**：任意方向大幅拖拽 → 位移被精确限制到 `±maxOffset`（实测 tx=±200.61 / ty=±131.33，与理论值一致），图片始终铺满取景框。
- **贴边磁吸**：拖拽到距边界 8px（<12px 阈值）→ 位移吸附到边界（tx=200.61）。
- **居中磁吸**：拖拽到距中心 5px → 位移吸附到 0。

> 说明：本次两套浏览器 MCP 的截图输出目录均被沙箱限制在各自根目录，无法写入本 evidence 目录；缩放后极限拖拽状态的可视截图因工具超时未能落盘。故本次以「初始加载可视截图 + CDP 精确数值断言」共同完成验收，数值断言已覆盖缩放、不露白边、贴边/居中磁吸全部关键行为。

## 涉及文件

- `src/composables/usePhotoTransform.ts`
- `src/components/TicketCard/PhotoArea.vue`

---

## 补充修复：大尺寸图片在 scale 1 时无法拖动

### 问题

上传宽高比很大的长图后，图片在初始状态（scale 1）无法拖动，必须先滚轮放大局部才能移动，位置被固定。

### 根因

此前图片用 `object-cover + w-full h-full`，其变换盒尺寸恒等于取景框尺寸，导致 scale 1 时 `maxOffset = 0`，没有任何可拖动空间；长图被 `object-cover` 裁掉的左右区域藏在元素盒内部，平移元素只会露白边而非展示其他部分。

### 修复

- 引入「基准铺满尺寸」`baseSize`：按 `baseScale = max(容器宽/图宽, 容器高/图高)` 计算图片铺满取景框后的真实渲染尺寸，并以该 px 尺寸渲染 `<img>`（`position:absolute; inset:0; margin:auto` 居中，去掉 `object-cover`）。长图此时实际宽度大于取景框，`scale 1` 即存在水平可拖动空间。
- 位移约束 `getMaxOffset` 改为基于 `baseSize * scale` 与取景框之差计算，仍保证不露白边。
- 图片 `@load` 时读取自然尺寸并计算 `baseSize`；对取景框使用 `ResizeObserver`，尺寸变化时重算并 `reclamp()` 重新约束位移。

### 验证（CDP 数值断言 + 可视截图）

注入 3000×800 长图，取景框 520×340：

- 渲染尺寸 = 1277×340（宽度 > 取景框，高度恰好铺满）。
- **scale 1 可拖动**：向右拖 60px → `tx=60`（此前恒为 0）。
- **不露白边**：向左大幅拖拽 → 钳制到 `tx=-378.29 = -maxOffsetX`。
- **垂直锁定**：向下拖拽 → `ty=0`（高度恰好铺满，无纵向空间）。
- 可视截图确认：图片铺满取景框、上下边框严丝合缝、水平方向可展示非居中区域。
