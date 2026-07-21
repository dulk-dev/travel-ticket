# 初始化页面背景色优化

## 问题

用户反馈初始化页面背景色不美观。根因：`src/views/HomeView.vue` 的 `pageBgColor`
由默认主题色 `#F5F0EB`（米白）按 `明度×0.5、饱和×0.65` 推导，得到
`hsl(30, 22%, 38%)` —— 中明度 + 中饱和的"泥浆棕"，视觉显脏。

## 修改

### 第一轮：深炭灰（后被打回）

`src/views/HomeView.vue` `pageBgColor` 计算参数调整：

- 明度：`Math.min(hsl.l * 0.5, 38)` → `Math.min(hsl.l * 0.28, 22)`
- 饱和：`hsl.s * 0.65` → `hsl.s * 0.4`

默认主题色下背景由泥浆棕变为深炭灰（约 `#3A3530`），与米白票根形成更强的明度对比。

### 第二轮：换登机牌蓝白默认色 + 修复默认值不生效

- `DEFAULT_COLOR` `#F5F0EB` → `#E9EEF3` 后用户反馈颜色无变化，定位到
  `useColorExtract.ts` 初始 `primary: '#F5F0EB'` 硬编码使 `DEFAULT_COLOR` 兜底失效，
  改为空串，默认色单点由 `DEFAULT_COLOR` 控制

### 最终方案：晴空蓝（用户确认）

用户反馈深炭灰太沉闷，要求"活泼但不刺眼、有旅途活力"：

- `DEFAULT_COLOR` → `#DCE9F5`（浅天空蓝纸面）
- `pageBgColor` 算法：明度 `Math.min(hsl.l * 0.5, 46)`，
  饱和 `clamp(hsl.s * 0.55, 22, 45)`（下限保活力、上限防刺眼）
- 初始背景推导为 `#517698` 晴空蓝，用户目视确认通过

## 验收

- CDP 浏览器访问 `http://localhost:5173` 截图验证（见 screenshots/）
- `before-muddy-brown.png`：修改前（用户提供）
- `after-deep-charcoal.png`：第一轮深炭灰方案（后被打回）
- 最终晴空蓝方案由用户自行目视确认（用户明确表示无需截图验证）
