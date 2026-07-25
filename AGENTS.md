# Agent 协作注意事项

## 启动规范

- **启动前检查现有进程**：在启动开发服务器前，优先使用 `curl` 或浏览器访问目标端口（如 `http://localhost:5173`）确认服务是否已运行。避免使用 `wmic`（Windows 25H2 已移除）或在 Node fallback 环境下执行复杂的 PowerShell 管道命令。若服务已运行，直接使用现有实例，禁止重复启动。

## 已知问题

- **Windows 下 git commit 含空格信息失败**：`git commit -m "xxx"` 会被解析为多个 pathspec 参数。解决方案：将提交信息写入 `.git/COMMIT_EDITMSG` 文件，然后执行 `git commit --file=.git/COMMIT_EDITMSG`。
- **Windows Node fallback 终端不支持中文 commit message**：在该环境下，无论使用 `git commit -m` 还是 `.git/COMMIT_EDITMSG` 方式，中文内容均会因编码问题导致乱码。因此，**所有 commit message 必须使用英文**，例如 `feat(ui): adjust ticket editor panel layout`。
- **html2canvas 1.4.1 的三大限制（导出相关代码必须规避）**：
  1. **不支持 `mask-image`**：票根轮廓缺口靠导出后处理 `applyTicketMask`（`HomeView.vue`）在 canvas 上补打，不要依赖 CSS mask 导出。
  2. **不支持 `filter: drop-shadow`**：CSS 滤镜阴影不会出现在导出图中（项目已决定导出不带投影）。
  3. **不支持 oklch 颜色**：Tailwind v4 的色值类（如 `text-gray-400`）编译为 oklch，会导致导出直接抛错。导出子树（票根 + 画框）内的颜色必须用 hex 任意值（如 `text-[#99a1af]`）。
  4. **渲染完成后 ctx 残留 `scale + translate` 变换**：对导出 canvas 做后处理绘制前，必须先 `ctx.setTransform(1, 0, 0, 1, 0, 0)` 归位。

## 项目目录架构

```
travel-ticket/
├── .agents/
│   └── skills/
│       └── minitool-zip-builder/    # 小红书小工具构建 skill（官方 1.3.1）
│           ├── SKILL.md
│           └── references/
│               ├── zip-artifact-spec.md
│               ├── device-capabilities.md
│               └── cross-platform-h5.md
├── .vscode/                          # VS Code 配置
│   └── settings.json
├── docs/
│   └── conversation-notes/           # 会话阶段记录与执行记录
│       ├── index.md
│       └── YYYYMMDD-HHMM-*.md
├── evidence/                         # Agent 执行证据归档（每次执行独立子文件夹）
├── public/                           # 静态资源（不经过构建）
│   └── favicon.ico
├── scripts/                          # 构建脚本
│   ├── minitool-postbuild.mjs        # 小工具 postbuild 清理（crossorigin / .ico / .map）
│   ├── minitool-zip.mjs              # 小工具 zip 打包
│   └── minitool-scan.mjs             # 小工具违规 API 扫描
├── src/
│   ├── assets/                       # 样式与静态资源
│   │   ├── textures/                 # 纸张纹理 tile（512x512 灰度可平铺）
│   │   │   ├── watercolor.jpg        # 水彩纸（CC0 扫描图处理）
│   │   │   ├── cotton.jpg            # 棉卡纸（CC0 扫描图处理）
│   │   │   ├── linen.jpg             # 布纹纸（程序化生成）
│   │   │   ├── pearl.jpg             # 珠光纸（程序化生成）
│   │   │   └── parchment.jpg         # 羊皮纸（扫描图 + 程序化斑驳）
│   │   ├── base.css
│   │   └── main.css
│   ├── components/                   # Vue 组件
│   │   ├── Barcode/                  # 条形码组件
│   │   ├── ColorPalette/             # 色板选择组件
│   │   ├── InfoEditor/               # 票根信息编辑组件
│   │   ├── PaperTexturePanel/        # 纸质选择面板（5 种纸 + 无纹理）
│   │   ├── ThemeColorPanel/          # 主题色面板（含预览 + 色板）
│   │   ├── TicketCard/               # 票根卡片
│   │   │   ├── InfoArea.vue
│   │   │   └── PhotoArea.vue
│   │   └── UploadButton/             # 上传按钮
│   ├── composables/                  # 组合式函数
│   │   ├── useCanvasExport.ts        # 纯 Canvas 2D 票根导出（替代 html2canvas）
│   │   ├── useCardTilt.ts            # 卡片 hover 3D 倾斜 + 全息高光
│   │   ├── useColorExtract.ts        # 图片主色提取
│   │   ├── useImageUpload.ts         # 图片上传处理（EXIF 仅日期，无网络请求）
│   │   ├── useMockData.ts            # Mock 数据生成（无网络请求，默认城市写死）
│   │   ├── usePaperTexture.ts        # 纸张纹理：纹理加载 + 主题色烘焙管线
│   │   ├── usePhotoTransform.ts      # 照片变换处理
│   │   └── useTicketExport.ts        # 票根导出（封装 useCanvasExport + a[download]）
│   ├── views/                        # 页面视图
│   │   └── HomeView.vue              # 首页（票根生成器）
│   ├── App.vue                       # 根组件
│   └── main.ts                       # 入口文件
├── artifacts/                        # 构建产物或临时输出
├── dist/                             # 生产构建输出（主版本）
├── dist-minitool/                    # 小工具构建输出（中间产物）
├── AGENTS.md                         # 本文件：Agent 协作规范
├── README.md
├── env.d.ts
├── index.html
├── package.json
├── vite.config.ts                    # 主版本 Vite 配置
├── vite.config.minitool.ts           # 小工具专用 Vite 配置
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

## 证据归档规范

`evidence/` 目录用于结构化归档 Agent 每次执行任务的证据材料，确保执行过程可追溯、可验证。

### 目录结构

```
evidence/
└── YYYYMMDD-HHMM-主题/              # 每次执行的独立证据文件夹
    ├── screenshots/                  # 本次执行产生的截图
    ├── scripts/                      # 本次执行产生的脚本（如测试脚本、数据生成脚本等）
    └── notes.md                      # 可选：本次执行的简要说明
```

### 命名规则

- 每次执行创建独立的子文件夹，命名格式为 `YYYYMMDD-HHMM-主题`
- 时间戳为执行开始时的本地时间，精确到分钟
- `主题` 应简洁概括本次执行的核心内容，与 `docs/conversation-notes/` 文档命名语义保持一致

### 内容规范

- **screenshots/**：存放本次执行过程中产生的所有截图，如 UI 验证截图、错误现场截图、对比截图等
- **scripts/**：存放本次执行过程中 Agent 生成的临时脚本，如 Playwright 测试脚本、数据迁移脚本等。项目本身的常驻测试脚本不应放入此处
- **notes.md**：由 Agent 自行判断是否需要留存。当执行涉及复杂操作、多步骤验证或需要额外说明时，建议编写简要说明，记录执行目的、关键步骤和结论

### 自我验收规范

每次完成一个功能或重大修改后，Agent 必须通过自运行进行自我验收，确保交付质量符合预期。

**验收方式**：

1. **CDP 浏览器模拟**：通过 Chrome DevTools Protocol（CDP）或 Playwright 等工具驱动浏览器，模拟真实用户的操作流程（如页面加载、点击、输入、滚动、交互等），验证功能在浏览器环境中的实际表现
2. **截图视觉对比**：在关键操作节点截取页面截图，与预期效果进行 1:1 的视觉对比，确认 UI 渲染、布局、样式、交互状态等符合设计预期

**验收要求**：

- 验收过程产生的截图和脚本应归入本次执行的 `evidence/YYYYMMDD-HHMM-主题/screenshots/` 和 `scripts/` 目录
- 若验收发现问题，应记录问题详情并修复后重新验收，直至通过
- 自我验收不替代代码审查，但确保交付前功能已可运行、视觉已可验证

## 工作流规范

- **目录结构变更同步更新 AGENTS.md**：任何涉及目录或文件结构变化的修改（新增/删除/移动目录或文件），在修改完成后必须同步更新本文件「项目目录架构」章节，确保架构文档与实际代码库保持一致。
- **Git 提交范围限定为本次对话内容**：执行 `git commit` 时，只将本次对话所涉及的文件变更纳入提交，不得自动提交其他历史遗留的未暂存变更。提交前通过 `git status` 确认暂存区内容，确保提交范围精准对应本次对话的修改意图。
- **Evidence 随代码变更一并提交**：每次执行产生的 `evidence/YYYYMMDD-HHMM-主题/` 证据材料（截图、脚本、notes.md 等）应在对应代码 commit 时一并纳入暂存区并提交，确保执行过程与代码变更可对应追溯。若单次执行涉及多次代码迭代，可在最终 commit 时统一归档并提交本次 evidence。

## Git 提交规范

### 提交范围

1. 仅将本次对话涉及的文件加入暂存区：`git add <本次文件>`。
2. 提交前通过一次 `git status` 确认暂存区范围。
3. 若暂存区误包含非本次文件，移除：`git restore --staged <非本次文件>`。

### Commit Message 规范

- **所有 commit message 必须使用英文**。
- 遵循 Conventional Commits 格式，例如 `feat(ui): adjust ticket editor panel layout`。
- 必须使用 `Write` 工具将 commit message 以纯文本写入 `.git/COMMIT_EDITMSG`，然后执行 `git commit --file=.git/COMMIT_EDITMSG`。

### 理想提交流程（3 步）

```
git add <本次文件>                          # 仅暂存本次对话修改的文件
git status                                  # 确认一次暂存区范围
git commit --file=.git/COMMIT_EDITMSG      # 完成提交（message 通过 Write 工具写入）
```
