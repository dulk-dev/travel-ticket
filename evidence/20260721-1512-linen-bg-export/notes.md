# 布纹背景板 + 4:3 导出画框

## 需求

1. 页面背景板从纯色改为布纹纸（linen）材质，票根本体纸质（水彩纸）不变
2. 导出票根时保留一定间距的背景板，整体为 4:3（适合自媒体信息流）
3. 导出保留票根投影，增强实物感

## 实现

- `usePaperTexture.ts`：导出 `bakeTile`（颜色 × 灰度纹理正片叠底烘焙，带缓存）与 `loadTextureImage`，页面背景板与票根共用同一烘焙管线
- `HomeView.vue`：页面根 div 背景改为 `pageBgColor` + linen 烘焙 tile 平铺；新增离屏 4:3 导出画框（票根 900px + 左右 96px 边距 → 1092×819，上下边距约 218px），导出目标从票根本体改为画框
- `TicketCard/index.vue`：
  - 新增 `exportShadow` prop：html2canvas 不支持 `drop-shadow` 滤镜，导出实例改用 mask 轮廓 + canvas 阴影烘焙的位图投影（双层：接触阴影 + 环境阴影）
  - 打孔齿孔孔体从纯色改为页面背景色 × 布纹采样，与布纹背景板观感一体
  - mask 缓存同时保留 canvas 与 data URL，新增 `getMaskCanvas()` 暴露
- `useTicketExport.ts`：`exportTicket` 新增 `postProcess` 回调；catch 增加 `console.error`

## 排障记录（重要）

1. **空态导出报错 oklch**：UploadButton 的 `border-gray-400` 等 Tailwind v4 色值编译为 oklch，html2canvas 无法解析。已改为 hex 任意值（`#99a1af` / `#6a7280`）。导出子树内禁用 Tailwind 色值类。
2. **导出撕口缺失/错位**：html2canvas 1.4.1 完全不支持 `mask-image`，票根轮廓缺口在导出中丢失；新增的烘焙投影（带缺口轮廓）与无缺口纸面错位，形成"左侧浅色凸起、右侧撕口消失"的错觉。修复：导出后处理 `applyTicketMask`——mask 取反后 `destination-out` 补打缺口，再 `destination-over` 回填布纹背景（jpg 无透明通道）。
3. **后处理一度完全无效**：html2canvas 渲染完成后会在 ctx 上残留 `scale + translate` 变换，后处理绘制全部落在画布外。必须 `setTransform(1,0,0,1,0,0)` 归位后再按设备像素绘制。
4. **缺口回填为纯色而非布纹**：两次 `destination-over` 填充只有第一次生效（填充后缺口不再透明）；且布纹 tile 按 CSS px 设计，pattern 需 `setTransform(scale(3))` 匹配设备像素；另修复了主题色连续变化时旧 tile 图片 onload 竞态覆盖新 tile 的问题。
5. **左侧"双重撕口"**：导出投影的剪影直接用锐利 mask 生成，细小切口在投影边缘复刻出一条轮廓清晰的第二缺口列。修复分两步：
   - 投影源剪影先 `ctx.filter` 轻度模糊（6 CSS px）再生成投影——真实软投影不会还原锐利细边。
   - **剪影不落地、只取阴影**：直接画剪影再擦除时，模糊剪影的外溢边缘无法被锐利 mask 擦净，会在票缘外残留一条近黑描边（用户二次报告的"双重撕口"真凶）。最终方案：剪影画在画布外、用 `shadowOffsetX` 把投影移回画布（canvas 经典 shadow-only 技巧），剪影像素从不落在画布上，无需擦除步骤。
6. **导出投影"垫板感"**：初版投影参数直接对齐页面 drop-shadow（0.30/0.32 透明度、四边对称晕圈），在静态导出图上四边均匀的暗影看起来像"票根下垫了一张深色卡纸"，缺口处的投影暗带尤其明显。按用户方案最终定稿：
   - **剪影收缩**：投影源剪影 `blur(10 CSS px)` 模糊侵蚀（等效向内收缩），缺口轮廓在剪影中彻底消失，撕口位置看不到任何"垫板"边缘；模糊后 alpha 回落，用 1.5 倍增益补回强度。
   - **阴影放大**：双层投影 0.32/0.32 透明度、blur 24/70、offsetY 16/40，阴影清晰透出但完全柔和，无撕口轮廓。
7. **缺口内外投影断层（亮斑撕口）**：剪影收缩后缺口打孔回填的是纯背景，缺口外背景却被投影压暗，缺口看起来像一圈亮斑（用户箭头指出）。曾修复：打孔回填后把投影位图按缺口 mask 裁剪盖回缺口，白底高对比验证连续。
8. **最终决定：导出去掉投影**：多轮调参后实物投影在静态导出图上始终不理想（垫板感/断层/强度难以平衡），用户决定导出无阴影。已移除全部投影烘焙代码（`exportShadow` prop、`bakeExportShadow`、shadow-only 位图、缺口投影补回步骤），页面预览的 `drop-shadow` 不受影响（html2canvas 本就不导出 filter）。

## 验收

- `01-page-linen-bg.png`：页面布纹背景板（空态）
- `02-export-empty-state.jpg`：空态导出（暴露撕口问题的版本，留作对照）
- `03-export-with-photo.jpg`：用户报告的带照片导出问题版本（留作对照）
- `04-export-photo-mask-fixed.jpg`：后处理未生效版本（对照）
- `06-export-final.jpg`：撕口修复后的导出（对照）✅
- `07-page-final.jpg`：最终页面预览
- `08-export-double-notch.jpg`：用户报告的"双重撕口"问题版本（对照）
- `09-export-shadow-softened.jpg`：剪影模糊化后的导出（对照，仍有残留描边）
- `10-export-user-latest.jpg`：用户二次报告"双重撕口"的版本（对照）
- `11-export-shadow-only.jpg`：shadow-only 修复版（对照，投影偏强有"垫板感"）
- `12-export-user-mat-feel.jpg`：用户报告的"垫板感"版本（对照）
- `13-export-shadow-lighter.jpg`：投影减弱版（对照，用户仍不满意）
- `14-export-shadow-eroded.jpg`：剪影收缩初版（对照，投影过弱）
- `15-export-shadow-tuned.jpg`：调参中间版（对照）
- `16-export-final-photo.jpg`：剪影收缩 + 阴影放大版（对照，缺口亮斑）
- `17-export-user-notches-dark.jpg`：用户报告的缺口明暗断层版本（对照）
- `18-export-notch-shadow.jpg`：缺口补回投影后的导出（深色背景）
- `19-export-white-bg.jpg`：白底高对比验证（对照）
- `20-export-no-shadow.jpg`：最终导出（无投影，干净摆拍感）✅
- 像素级校验：左侧大缺口 paper 起点 dev-x=357（理论 357），右侧终点 2918（理论 2919）；缺口内填充色与画框背景布纹一致

## 备注

- `scripts/test-photo.jpg`：验收用测试照片（PIL 生成）
- 仓库中 13 个 type-check 报错（InfoArea.vue / usePhotoTransform.ts）为历史遗留，与本次改动无关；本次涉及文件零新增报错
