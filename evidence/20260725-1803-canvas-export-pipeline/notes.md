# 纯 Canvas 2D 导出管线实施记录

## 背景
小红书小工具容器中 html2canvas 导出存在严重兼容性问题（样式错乱、缺口缺失、切割线丢失），决定改用纯 Canvas 2D API 直接绘制票根。

## 实施内容

### 新增文件
- `src/composables/useCanvasExport.ts`：纯 Canvas 2D 导出管线
  - 票根轮廓：圆角矩形 + destination-out 打缺口（左右大圆孔、裁剪线上下小圆孔、边缘细小切口）
  - 照片区：支持用户缩放/平移变换，纸纹覆盖层
  - 信息区：文字（地点两行、日期、编号、随机码）+ 条形码（JsBarcode SVG 转 Image）
  - 切割线：打孔齿孔效果（孔体 + 纹理 + 阴影 + 高光）
  - 页面背景：布纹 + 颜色正片叠底

### 修改文件
- `src/composables/useTicketExport.ts`：重写为调用 useCanvasExport 的薄封装
- `src/views/HomeView.vue`：downloadTicket 改用新管线，移除离屏 DOM 克隆逻辑
- `package.json`：移除 html2canvas 依赖
- `AGENTS.md`：更新目录架构

### 关键设计决策
1. **绘制顺序**：先画所有内容（底色/纹理/照片/信息/文字/条形码/切割线），最后统一 destination-out 打缺口，避免缺口擦除已绘制内容
2. **SCALE=3**：导出分辨率 3 倍，保证清晰度
3. **坐标系统**：逻辑像素（CSS px）绘制，最后统一 scale，避免频繁坐标转换
4. **临时 canvas**：打缺口时先复制票根区域到临时 canvas，处理后再贴回主 canvas

## 验证结果
- 导出图片包含完整票根轮廓（圆角 + 缺口 + 切口）
- 打孔齿孔切割线位置正确（照片区 65% + 6px 偏移）
- 文字和条形码清晰可读
- 页面背景完整
- 构建产物体积从 570KB 降至 526KB（移除 html2canvas）

## 遗留问题
- 无（当前版本功能完整）
