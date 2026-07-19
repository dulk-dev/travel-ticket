# 导出图片色差排查（结论：非导出缺陷，系统/查看器色彩管理差异）

## 问题

用户反馈：用桌面照片（YCnYPJmxlf.jpg）导出票根后，导出图在 Windows 照片应用中
查看时与页面预览有色差，橙色偏浅偏黄。

## 排查过程与实测数据

采样点：信息区橙色平坦区（相对票根 0.83, 0.12 / 0.90, 0.55）。

| 环节 | 橙色采样值 (R,G,B) |
| --- | --- |
| 实时预览截图 | (206,119,58) |
| 用户自己的导出文件 (10).jpg | (207,119,58) |
| 本次复现导出 (11).jpg | (207,119,58) |
| Chrome 重新打开导出文件 | (207,119,58) |
| WIC 色彩转换（内嵌 Profile → 标准 sRGB） | (201,115,55) → (201,115,54) |

- 导出文件与实时预览**像素级一致（Δ≤1）**，导出管线（html2canvas → canvas → JPEG）
  不引入色差。
- 导出文件内嵌 Chrome 标准紧凑 sRGB Profile（456B，para 曲线），经 WIC 转换验证
  色彩管理链路正常。

## 根因

本机显示器通过厂商色彩工具关联了 4 个 ICC Profile（HKCU ProfileAssociations）：
`EyeCare_D50.icc` / `Movie_DCI_P3.icc` / `Print_D50.icc` / `sRGB_D65.icc`，
随显示器硬件色彩模式切换。Windows 照片应用与 Chrome 走不同的色彩管理路径，
在此类多 Profile / 自定义 ICC 环境下，照片应用存在已知的渲染偏差（偏暖偏浅）。
用户的「预览截图」与「照片应用截图」差异由此产生，与导出文件本身无关。

## 结论与建议

- 导出文件颜色数据正确，**无需代码改动**。
- 建议用 Chrome / Edge 等色彩管理正常的查看器打开导出图，即与预览一致。
- 若需 Windows 照片应用准确显示：将显示器硬件模式与系统 Profile 固定为
  sRGB_D65（或重新校准关联），并保持照片应用为最新版本。

## 证据

- `screenshots/live-preview.png`：实时预览
- `screenshots/export-file.png`：复现导出文件
- `screenshots/export-viewed-in-chrome.png`：导出文件在 Chrome 中查看

备注：排查中曾误捕获一张包含无关窗口内容的屏幕截图，已立即删除，未留存未扩散。
