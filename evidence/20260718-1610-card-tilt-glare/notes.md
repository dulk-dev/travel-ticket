# 票根卡片 hover 3D 倾斜 + 全息高光

## 目的

为票根卡片增加鼠标 hover 空间感效果（用户确认为「3D 倾斜 Tilt + 全息光泽 Glare」组合）。

## 实现

- 新增 `src/composables/useCardTilt.ts`：按指针相对卡片中心位置计算 `rotateX/rotateY`（最大 ±6°/±9°，`perspective(1000px)`），hover 中 0.1s 跟随、离开/按压 0.5s 回弹；高光为径向白光（跟随指针）+ 低透明度彩虹斜向光泽。仅 `(hover: hover) and (pointer: fine)` 设备启用。
- `src/components/TicketCard/index.vue`：新增倾斜包装层承载 transform，票根本体布局与导出元素（`ticketRef`）不变；高光层加 `data-html2canvas-ignore`，导出图片不含高光。按住拖拽照片时卡片自动压平，避免与照片拖动手势冲突。

## 验收（Playwright 驱动，localhost:5173）

| 用例 | 结果 |
| --- | --- |
| hover 中心 | 近乎水平（rotateY ≈ 0.04°） |
| hover 左侧 / 右侧 | rotateY ≈ -7.4° / +7.1°，方向正确（01-03） |
| hover 左上 / 右下 | rotateX/rotateY 组合正确（04、05） |
| 高光跟随 | 渐变中心与指针位置一致（73.5%, 28%）（06） |
| 拖拽照片 | 卡片压平（transform 为 identity） |
| 移出卡片 | 回弹水平 + 高光 opacity 归零 |
| 保存票根导出 | 导出图水平、无高光（08） |

## 截图

- `01-hover-center.png` ~ `05-hover-bottom-right.png`：各位置 hover 倾斜
- `06-hover-glare-follow.png`：高光跟随指针
- `07-glare-boosted.png`：高光增强后在照片区域的效果
- `08-export-no-glare.jpg`：导出图片（验证不含高光/倾斜）
