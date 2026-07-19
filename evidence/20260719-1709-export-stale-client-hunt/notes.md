# 导出失真"未解决"排查（hunt）—— 陈旧客户端仍在运行旧代码

## 症状

用户 16:54 两次导出（BF06R5SO.jpg / (1).jpg，均为 1251x534）仍是旧症状：
"SINGA" 裁切、照片放大、文字超大。而我此前已在 MCP Chrome 中验证修复生效。

## 根因（一句话）

> 用户实际操作的是 **Edge 浏览器**（830px 窗口）里早已打开的应用标签页；该标签页在
> 修复发布时处于后台/冻结状态，错过了 Vite HMR 更新（HMR 是即发即弃的，断连期间
> 的更新不会重放，且服务器未重启时 vite 客户端重连后不会强制整页刷新），
> 因此 16:54 的导出仍在运行修复前的旧代码。

## 证据链

1. 修复代码已生效于 dev server：`curl localhost:5173/src/views/HomeView.vue`
   与 `TicketCard/index.vue` 均含 `prepareForExport`。
2. netstat：localhost:5173 上有 **msedge.exe（PID 31080）** 的 ESTABLISHED 连接 ——
   用户日常用的是 Edge，不是我的 MCP Chrome。
3. 视口不在场证明：MCP Chrome 当时固定在 1440px（其间导出均为 2400px 宽）；
   用户 16:54 导出为 1251px（417 CSS px ≈ 830 视口），只能来自其自己的 ~830px 窗口。
4. 同尺寸旁证：用户 15:22 的 X72GQPID 破版导出也是 1251px，同一窗口、同一旧代码。
5. 决定性强检：830 视口 + 用户真实照片（YCnYPJmxlf.jpg）+ 全新加载的修复代码，
   导出完全保真（`verified-export-830-fresh-code.jpg` vs `verified-preview-830.png`）。

## 结论

代码侧无需再改。用户侧操作：在 Edge 的应用标签页 **Ctrl+Shift+R 硬刷新** 后重新导出即可。
惯例建议：Agent 每次改完代码后，预览标签页需硬刷新一次（生产构建无此问题，
仅 dev 模式 HMR 客户端可能滞旧）。

## 回归防护

项目无测试基础设施（package.json 无测试脚本/runner），未添加自动化回归测试；
本次以真实导出产物作为验收（Runtime Evidence Ladder 第 5 级）。

## 举一反三（blast sweep）

`exportTicket` 全项目唯一入口（HomeView.downloadTicket），无其他绕过
`prepareForExport` 的导出路径。`grep -rn "exportTicket|getTicketElement|html2canvas" src`
已确认。
