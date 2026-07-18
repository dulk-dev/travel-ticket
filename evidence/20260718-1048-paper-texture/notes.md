# 纸张纹理功能自验收记录

## 执行目的

为票根卡片引入纸张纹理（布纹纸、棉卡纸、水彩纸、珠光纸、羊皮纸 + 无纹理），技术路线为「真实灰度纹理图 + Canvas 运行时烘焙」：

- 灰度纹理 tile（512x512 可平铺）与主题色在离屏 Canvas 做正片叠底，烘焙成彩色纹理 data URL
- 底色区/信息区/裁剪线条带使用烘焙结果作为 background-image；照片区叠加低透明度灰度纹理层；珠光纸额外叠加整票对角渐变高光
- 烘焙产物为普通位图，保证 html2canvas 导出保真

## 纹理素材来源

- `watercolor.jpg` / `cotton.jpg`：Wikimedia Commons CC0 扫描图（`File:Papier aquarelle 100% coton, grain fin.png`、`File:Papier aquarelle en cellulose.png`），经中值滤波去杂质 + flat-field 亮度均衡 + 镜像平铺处理
- `parchment.jpg`：由水彩扫描图旋转 90° 后叠加程序化低频斑驳生成
- `linen.jpg`：程序化生成（3px 间距横线 + 24px 链线 + 细纤维噪声），对应布纹纸的规则的帘纹特征
- `pearl.jpg`：程序化细颗粒（珠光主要靠运行时 CSS 渐变高光呈现）

注：Commons 搜索命中率低且触发限流（429），布纹/羊皮改为程序化生成，后续如有授权素材可同文件名直接替换。

处理脚本：`scripts/`（fetch_textures.py / fetch_candidates.py / fetch_round2.py 为素材搜集过程稿，make_tiles.py 为最终 tile 生成脚本）

## 验收过程与结论（Playwright 驱动 Chrome，localhost:5173）

| 截图 | 验收点 | 结果 |
|---|---|---|
| 01-default-watercolor-no-photo.png | 默认水彩纸（无照片），底色区/信息区/裁剪线纹理 | 通过 |
| 02-watercolor-with-photo.png | 上传照片后主题色提取 + 照片区纹理覆盖层 | 通过 |
| 03-linen.png | 布纹纸：规则帘纹 | 通过 |
| 04-cotton.png | 棉卡纸：细腻纤维 | 通过 |
| 05-pearl.png | 珠光纸：细颗粒 + 对角渐变高光（整票含照片） | 通过 |
| 06-parchment.png | 羊皮纸：斑驳做旧 | 通过 |
| 07-none.png | 无纹理：恢复纯色 | 通过 |
| 08-color-rebake-check.png | 切换主题色后纹理按新颜色重新烘焙（蓝色 × 水彩纸） | 通过 |
| 09-exported-ticket.jpg | html2canvas 导出：信息区与照片区纹理均完整保留 | 通过 |
| 10-mobile-watercolor.png | 移动端布局：纸质面板在编辑区正常换行展示 | 通过 |

控制台无报错（仅 useColorExtract 既有日志）。

## 已知遗留（非本次改动引入）

- `npm run type-check` 在 `src/components/TicketCard/InfoArea.vue`（94、95、154 行）有 3 个历史遗留 TS 错误（noUncheckedIndexedAccess 相关），本次未改动该文件。
- html2canvas 不支持 mask-image，导出图中右侧半圆缺口不生效（既有行为）。
