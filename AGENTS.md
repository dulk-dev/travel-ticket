# Agent 协作注意事项

## 已知问题

- **Windows 下 git commit 含空格信息失败**：`git commit -m "xxx"` 会被解析为多个 pathspec 参数。解决方案：将提交信息写入 `.git/COMMIT_EDITMSG` 文件，然后执行 `git commit --file=.git/COMMIT_EDITMSG`。
