# 票根照片编辑交互修复与 Git 提交规范优化

## 执行信息

- **任务类型**: 功能修复 + 规范优化
- **日期**: 2026-07-16
- **目标**: 修复上传图片后的缩放与拖动交互问题，并优化 AGENTS.md 中的 Git 提交流程规范

## 需求描述

用户反馈上传图片后存在两个核心交互问题：

1. **无法缩放**：在编辑区域滚动鼠标无法放大图片，只能看到固定大小的画面。
2. **难以对齐/无法拖动**：
   - 移动图片后没有贴边感，很难对齐到取景框边缘。
   - 上传宽高比很大的长图后，初始状态（scale 1）完全无法拖动，必须先滚轮放大局部才能移动，位置被锁定。

此外，用户指出此前 Git 提交流程过于冗余（反复 `git status`、用 `echo` 写 message 导致引号污染等），要求将精简后的理想流程写入 AGENTS.md。

## 分析思路

### 问题 1：缩放完全失效

- `PhotoArea.vue` 中的 `containerRef` **从未绑定到任何 DOM 元素**（`ref="containerRef"` 缺失）。
- `getBoundingClientRect()` 恒返回 `width: 0`，导致 `onWheel` 在 `if (!container.width) return` 处直接跳出。
- 滚轮监听错误地绑在 `window` 上，会劫持整页滚动。

### 问题 2：拖动无约束 + 长图锁定

- 位移约束使用图片 `naturalWidth/naturalHeight` 计算，但图片元素为 `object-cover + w-full h-full`，其变换盒尺寸实际等于容器尺寸。
- 当 `scale = 1` 时，`maxOffset = (容器 × 1 - 容器) / 2 = 0`，**没有任何可拖动空间**。
- 长图被 `object-cover` 裁掉的左右区域藏在元素盒内部，平移元素只会露白边，无法展示图片其他部分。
- 没有贴边/居中的磁吸反馈，对齐困难。

### 问题 3：Git 提交流程冗余

- 反复执行 `git status` 确认（其实一次就够）。
- 用 `echo` / `node -e` 写入 `.git/COMMIT_EDITMSG` 时，Node fallback 下内容被额外包裹双引号，破坏格式。
- 错误后触发 `git reset --soft HEAD~1` 补救，形成链式冗余。

## 解决方案

### 1. 修复缩放：绑定 containerRef + 区域化滚轮监听

- 在 `PhotoArea.vue` 根 div 上补回 `ref="containerRef"`，使 `getBoundingClientRect()` 能读到真实尺寸。
- 滚轮监听从 `window` 改绑到编辑区域（`containerRef.value?.addEventListener('wheel', ...)`），仅在存在图片时生效，避免劫持页面滚动。
- 拖拽 move/up 仍保留在 `window`，保证鼠标移出取景框时可持续拖拽。

### 2. 引入基准铺满尺寸 `baseSize`，解决长图锁定

- 图片 `@load` 时读取自然尺寸，按 `baseScale = max(容器宽/图宽, 容器高/图高)` 计算 `object-cover` 铺满后的实际渲染尺寸。
- `<img>` 不再使用 `object-cover`，而是直接以 `baseSize` 的 px 尺寸渲染（`position:absolute; inset:0; margin:auto`），居中放置。
- 长图此时实际宽度大于取景框，`scale 1` 即存在水平可拖动空间。
- 位移约束 `getMaxOffset` 改为基于 `baseSize × scale` 与取景框之差计算，仍保证不露白边。
- 附加 `ResizeObserver` 监听取景框尺寸变化，响应式布局下自动重算 `baseSize` 并重新约束位移。

### 3. 贴边磁吸，改善对齐体验

- 新增 `snap()` 函数：拖拽时距离铺边（±maxOffset）或居中（0）在 `SNAP_THRESHOLD = 12px` 内自动吸附。
- 拖拽过程（`onMouseMove`）启用磁吸，松手后图片自动对齐到边缘或中心，形成明显「贴边感」。

### 4. 优化 Git 提交规范

- 将分散在「已知问题」和「工作流规范」中的 Git 相关内容，合并为独立的「Git 提交规范」章节。
- 明确：
  - 提交范围：仅 `git add` 本次文件，一次 `git status` 确认。
  - Commit message：必须使用英文，**必须使用 `Write` 工具**写入 `.git/COMMIT_EDITMSG`（禁止 `echo`/`node -e`）。
  - 理想流程压缩为 3 步：`git add` → `git status` → `git commit --file=.git/COMMIT_EDITMSG`。

## 遇到的问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 缩放完全失效 | `containerRef` 未绑定 DOM，`getBoundingClientRect()` 返回 `width: 0` | 补回 `ref="containerRef"`，并基于真实尺寸计算缩放 |
| 长图在 scale 1 时无法拖动 | `object-cover + w-full h-full` 使变换盒等于容器尺寸，`maxOffset = 0` | 引入 `baseSize` 按 cover-fit 尺寸渲染图片，释放平移空间 |
| 拖动无贴边感 | 位移约束仅做硬钳制，无磁吸反馈 | 新增 12px 阈值磁吸，拖拽时自动吸附到边缘/居中 |
| 滚轮劫持页面滚动 | 监听绑在 `window` 上 | 改绑到编辑区域容器，仅在图片存在时拦截滚轮 |
| commit message 被引号包裹 | Node fallback 下 `echo` / `node -e` 解析异常 | 使用 `Write` 工具直接写入纯文本 |
| Git 提交流程冗余 | 反复确认、错误后链式补救 | 规范化为 3 步流程，写入 AGENTS.md |

## 文件变更

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `src/composables/usePhotoTransform.ts` | 修改 | 引入 `baseSize`/`setBaseSize`/`reclamp`，位移约束基于 cover-fit 尺寸，新增 12px 磁吸 |
| `src/components/TicketCard/PhotoArea.vue` | 修改 | 绑定 `containerRef`，改用 `baseSize` px 尺寸渲染图片，区域化滚轮监听，添加 `ResizeObserver` |
| `AGENTS.md` | 修改 | 新增「Git 提交规范」章节，精简提交流程，明确 `Write` 工具写 message |
| `evidence/20260716-1550-photo-zoom-snap/notes.md` | 新增 | 本次修复的执行记录与验证详情 |

## 验证结果

注入 3000×800 宽图（模拟用户长形照片），取景框 520×340：

| 验证项 | 结果 |
|--------|------|
| 渲染尺寸 | 1277×340（宽度 > 取景框，可水平拖动）|
| scale 1 可拖动 | 向右拖 60px → `tx = 60`（此前恒为 0）✓ |
| 不露白边 | 向左大幅拖 → 钳制到 `-maxOffsetX`（-378.29）✓ |
| 垂直锁定 | 向下拖 → `ty = 0`（高度恰好铺满）✓ |
| 滚轮缩放 | 向上滚 5 次 → `scale ≈ 1.61`，以光标为中心 ✓ |
| 贴边磁吸 | 拖到距边 8px → 吸附到边界 ✓ |
| 居中磁吸 | 拖到距中心 5px → 吸附到 0 ✓ |
| 可视截图 | 图片铺满取景框、上下严丝合缝、可展示非居中区域 ✓ |

## 状态

已完成
