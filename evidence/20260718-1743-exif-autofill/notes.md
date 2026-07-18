# EXIF 自动填充自验收

## 目的

验证上传含 EXIF 信息（GPS 坐标 + 拍摄时间）的照片时，票根信息自动填充。

## 实现

- `src/composables/useImageUpload.ts`：接入 `exifr` 解析 EXIF；取 `DateTimeOriginal`（兜底 `CreateDate`/`DateTime`/文件名日期）；GPS 坐标经 Nominatim 逆地理编码为地名（失败则保持原地点）。
- `src/views/HomeView.vue`：上传成功后用 EXIF 填充 `date`、`location`，并同步 `code`（YYMMDD）；合并 handleUpload/handleDrop 重复逻辑为 `applyUploadResult`。

## 验收过程

- 脚本：`scripts/verify.mjs`（puppeteer-core 驱动本机 Chrome，headless）
- 测试照片：`C:\Users\36007\Downloads\IMG_0853.jpeg`（iPhone 17 Pro Max，EXIF 时间 2026:04:12 18:13:28，GPS 30.5887°N, 104.0471°E）

## 结果

上传后字段自动填充为：

- 地点：`武侯区`
- 时间：`2026-04-12`
- 编号：`260412`（随日期同步）
- 票根同步显示 WU HOU / 2026-04 / NO.20260412

截图：`01-before-upload.png`（上传前）、`02-after-upload.png`（上传后全页）。

## 追加：默认状态 IP 定位修复

原因：原 `useMockData.getDefaultLocation` 使用的 ipapi.co 免费接口已失效（返回付费提示而非 JSON），默认地点恒为兜底值「北京市」。

修复：改用 `https://ipwho.is/?lang=zh-CN`（免费、HTTPS、中文地名），并加 5s 超时；失败仍兜底「北京市」。日期逻辑不变，默认即为当天。

验收：`scripts/verify-default.mjs` 加载首页不上传照片，结果为 地点=`Singapore`（本机出口 IP 为新加坡）、时间=`2026-07-18`（当天）、编号=`260718`，截图 `03-default-ip-location.png`。

## 追加：国内外地名语言规则

需求：国外地名用英文，国内用中文。同时应用于两处：

- `useMockData.getDefaultLocation`（IP 定位）：先请求英文结果，`country_code === 'CN'` 时再请求 `?lang=zh-CN`。
- `useImageUpload.reverseGeocode`（EXIF GPS 逆地理）：先请求 `accept-language=en`，`country_code === 'cn'` 时再请求 `accept-language=zh`。两次请求共用一个 6s 超时。

复验：默认状态（新加坡 IP）地点填充 `Singapore`，票根显示 SINGAPORE（截图 `03-default-ip-location.png`）；上传 IMG_0853.jpeg（成都 GPS）地点仍填充 `武侯区`（截图 `02-after-upload.png`）。

## 备注：地点粒度

Nominatim 对该坐标返回的 address 为 `suburb=石羊街道, city=武侯区, state=四川省`（OSM 未将"成都市"作为标准 address 组件返回），因此填充到区县级 `武侯区`。若需城市级（成都市）粒度，需另行处理（如解析 display_name 或换用国内逆地理服务）。
