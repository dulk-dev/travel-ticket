# 消除导出瞬间票根闪跳（离屏 900px 导出专用实例）

## 问题

上一版「固定 900px 导出」把宽度切换施加在可视票根上，导出瞬间票根会
闪跳到 900px 再恢复，观感差。

## 方案

可视票根不再参与导出。新增常驻离屏的导出专用实例（`position:fixed; left:-10000px`，
宽度 900px，非 display:none）：

- 它始终按 900px 设计宽度布局，ResizeObserver 烘焙值（字号/地点缩放/照片铺满尺寸）
  始终为 900px 状态，天然与窗口尺寸解耦，导出前无需任何宽度切换 → **零闪跳**。
- 导出时把用户在可视票根上的照片取景（缩放/平移）按铺满基准尺寸比例映射过去：
  `translate_export = translate_visible × (baseSize_export / baseSize_visible)`，
  缩放因子无量纲直接传递，保证导出构图与预览一致。
- 照片区比例跟随当前可见布局（桌面 65% / 移动 58%），保证形状一致。

## 改动

- `src/composables/usePhotoTransform.ts`：新增 `PhotoState`（变换 + 基准尺寸）。
- `src/components/TicketCard/PhotoArea.vue`：暴露 `getPhotoState` / `applyPhotoState`。
- `src/components/TicketCard/index.vue`：`prepareForExport(photoState?)` 重算 +
  取景映射 + nextTick；暴露 `getPhotoState`；移除 exportWidth/restoreAfterExport（死代码）。
- `src/views/HomeView.vue`：新增离屏导出实例（`exportCardRef`）；
  `downloadTicket` 固定以导出实例为目标，可视实例仅作取景来源。

## 验收（用户照片 YCnYPJmxlf.jpg，真实导出流程）

- 导出进行中读取可视票根宽度：830 视口恒为 415.3px、390 视口恒为 454px —— **无闪跳** ✓
- 注入 1.8x 缩放 + (-60, 30) 平移：导出构图与可视预览一致（对比
  `preview-830-viewport.png` / `export-830-viewport.jpg`）✓
- 830 / 390 视口导出均为 2700x1149；390 为移动端 58% 照片比例、非空 ✓
- 控制台无 error/warn；vue-tsc 仅 3 个 InfoArea 历史遗留报错。
