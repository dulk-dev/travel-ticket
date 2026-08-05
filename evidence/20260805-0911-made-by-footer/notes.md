# MadeByFooter 组件封装与接入

## 目的

参考 fawen.fun 底部「Made by xxx + 社媒图标」设计，封装为通用组件 `src/components/MadeByFooter/index.vue` 并接入 `HomeView.vue` 页面底部。

## 关键决策

- 品牌图标使用 `simple-icons`（官方 SVG path + 官方品牌色）：小红书 `#FF2442`、X `#000000`、GitHub `#181717`。
- simple-icons 全版本均未收录抖音（Remix Icon、MingCute、Arcticons 亦无），抖音与 TikTok 音符字形一致，借用 `siTiktok.path` 作为抖音占位图标。
- 无值平台（抖音）置灰 `#9ca3af` 且不可点击；是否显示由 `showEmpty` prop 控制（默认 `true`）。
- 渲染顺序：有值平台在前，无值平台稳定排序至队列尾部。
- 无值占位 icon 悬停时显示自定义 tooltip（`{平台} · 暂未开通`，深色气泡 + 向下小箭头，group-hover 纯 CSS 实现，无 JS）。
- `defineProps` 默认值不能引用局部变量（编译错误），因此 `DEFAULT_LINKS` 与 `SocialLink` 接口放在普通 `<script>` 模块作用域块中。

## 验证

- `npm run type-check`、`npm run build` 通过。
- CDP 浏览器验证桌面端与移动端（390x844）：页脚位于页面底部，小红书/ X / GitHub 为品牌色可点击链接，抖音置灰不可点。
- 截图见 `screenshots/`。
