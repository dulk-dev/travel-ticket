# 2026-07-12 移动端票根布局调整

## 执行目的

优化移动端视图下票根卡片及编辑面板的视觉布局：

1. 解决票根区域过宽导致左侧照片区太窄的问题
2. 微调「主题色预览」「候选色板」标签与下方内容的间距

## 关键改动

- `src/views/HomeView.vue`
  - 移动端票根外层容器：`max-w-md` → `max-w-lg`
  - 移动端照片区宽度：`photo-width="45%"` → `photo-width="58%"`
  - 「主题色预览」「候选色板」的内联布局：从 `space-y-2` 改为 `flex flex-col gap-1`

## 调试记录

- 最初尝试 `space-y-4`、`space-y-8` 未发现明显效果
- 根因：`<label>` 默认是 inline 元素，Tailwind v4 的 `space-y-*` 对 inline 子元素的 `margin-bottom` 不会产生实际垂直间距
- 解决方案：改用 `flex flex-col gap-*`，flex gap 对 inline 子元素同样生效

## 截图说明

- `20260712-1430-mobile-ticket-before.png`：调整前移动端票根整体效果
- `20260712-1430-mobile-ticket-after.png`：调整后移动端票根整体效果
- `20260712-1433-mobile-spacing-after.png`：间距调整过程中的中间状态截图
