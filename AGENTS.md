# Agent 协作注意事项

## 启动规范

- **启动前检查现有进程**：在启动开发服务器前，优先使用 `curl` 或浏览器访问目标端口（如 `http://localhost:5173`）确认服务是否已运行。避免使用 `wmic`（Windows 25H2 已移除）或在 Node fallback 环境下执行复杂的 PowerShell 管道命令。若服务已运行，直接使用现有实例，禁止重复启动。

## 已知问题

- **Windows 下 git commit 含空格信息失败**：`git commit -m "xxx"` 会被解析为多个 pathspec 参数。解决方案：将提交信息写入 `.git/COMMIT_EDITMSG` 文件，然后执行 `git commit --file=.git/COMMIT_EDITMSG`。

## 项目目录架构

```
travel-ticket/
├── .agents/
│   └── skills/
│       └── conversation-summary/     # Agent Skill 文件
│           ├── SKILL.md
│           └── reference.md
├── .vscode/                          # VS Code 配置
│   └── settings.json
├── docs/
│   └── conversation-notes/           # 会话阶段记录与执行记录
│       ├── index.md
│       └── YYYYMMDD-HHMM-*.md
├── public/                           # 静态资源（不经过构建）
│   └── favicon.ico
├── screenshots/                      # 截图存档
├── src/
│   ├── assets/                       # 样式与静态资源
│   │   ├── base.css
│   │   ├── logo.svg
│   │   └── main.css
│   ├── components/                   # Vue 组件
│   │   ├── Barcode/                  # 条形码组件
│   │   ├── ColorPalette/             # 色板选择组件
│   │   ├── InfoEditor/               # 票根信息编辑组件
│   │   ├── ThemeColorPanel/          # 主题色面板（含预览 + 色板）
│   │   ├── TicketCard/               # 票根卡片
│   │   │   ├── InfoArea.vue
│   │   │   └── PhotoArea.vue
│   │   ├── UploadButton/             # 上传按钮
│   │   ├── icons/                    # 图标组件
│   │   ├── HelloWorld.vue
│   │   ├── TheWelcome.vue
│   │   └── WelcomeItem.vue
│   ├── composables/                  # 组合式函数
│   │   ├── useColorExtract.ts        # 图片主色提取
│   │   ├── useImageUpload.ts         # 图片上传处理
│   │   ├── useMockData.ts            # Mock 数据生成
│   │   ├── usePhotoTransform.ts      # 照片变换处理
│   │   └── useTicketExport.ts        # 票根导出
│   ├── views/                        # 页面视图
│   │   └── HomeView.vue              # 首页（票根生成器）
│   ├── App.vue                       # 根组件
│   └── main.ts                       # 入口文件
├── artifacts/                        # 构建产物或临时输出
├── dist/                             # 生产构建输出
├── AGENTS.md                         # 本文件：Agent 协作规范
├── README.md
├── env.d.ts
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

## 工作流规范

- **目录结构变更同步更新 AGENTS.md**：任何涉及目录或文件结构变化的修改（新增/删除/移动目录或文件），在修改完成后必须同步更新本文件「项目目录架构」章节，确保架构文档与实际代码库保持一致。
- **Git 提交范围限定为本次对话内容**：执行 `git commit` 时，只将本次对话所涉及的文件变更纳入提交，不得自动提交其他历史遗留的未暂存变更。提交前通过 `git status` 确认暂存区内容，确保提交范围精准对应本次对话的修改意图。
