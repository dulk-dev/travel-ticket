# 打孔齿孔裁剪线（仿实物撕线）

## 目的

原裁剪线用 `repeating-linear-gradient` 点划虚线模拟，配合纸张纹理后风格冲突、不自然。
改为仿实物票根的**打孔齿孔**：仅纸张纹理开启时启用，无纹理保留扁平虚线。

## 实现

- `src/components/TicketCard/index.vue`
  - 新增 `pageBgColor` prop（孔洞填充色，与 HomeView 页面背景同源）
  - 新增 `bakePerforationTile()`：离屏 Canvas 烘焙 12x14 CSS px（3x 分辨率）齿孔 tile，
    内容 = 条带两侧轻压痕 + 页面背景色孔体 + 孔内下沿阴影 + 孔外上沿高光；
    按 `pageBgColor` 缓存。烘焙为位图，规避 html2canvas 径向渐变支持有限的问题（与 usePaperTexture 同一思路）
  - `tearLinePatternStyle` 分支：`paperType !== 'none'` 用齿孔 tile（repeat-y），否则保留原虚线
- `src/views/HomeView.vue`：桌面/移动两处 TicketCard 传入 `:page-bg-color="pageBgColor"`

## 自验收（Playwright 驱动浏览器）

| 截图 | 内容 | 结果 |
|---|---|---|
| 01-watercolor-perforation.png | 默认水彩纸（无照片）：齿孔清晰自然 | 通过 |
| 02-none-keeps-dashed.png | 无纹理：保留扁平虚线 | 通过 |
| 03-linen-perforation.png | 布纹纸齿孔 | 通过 |
| 04-cotton-perforation.png | 棉卡纸齿孔（首次截图与布纹重复，已重截确认） | 通过 |
| 05-pearl-perforation.png | 珠光纸齿孔 | 通过 |
| 06-parchment-perforation.png | 羊皮纸齿孔 | 通过 |
| 07-cotton-with-photo.png | 上传照片后（条带切换 infoTile）：齿孔对比正常 | 通过 |
| 08-exported-ticket.jpg | html2canvas 导出 3x：齿孔完整锐利，无丢失 | 通过 |

## 备注

- `npm run type-check` 报 3 个错误，均在 `src/components/TicketCard/InfoArea.vue`（94/95/154 行），
  为本次改动前已存在的问题（本次仅改 TicketCard/index.vue 与 HomeView.vue），未顺手修复。
- console 有 `ipwho.is` 连接失败，为 mock 数据地理位置探测在开发环境的既有行为，与本次无关。
