# 智能问数原型项目约定

本项目是静态 HTML 高保真原型，包含管理端、业务端和移动端页面。所有修改优先复用现有目录、公共样式、公共脚本和同类页面写法，不重新设计一套视觉体系。

项目结构：
- `index.html`：入口页。
- `pages/admin/`：管理端页面。
- `pages/business/`：业务端页面。
- `pages/mobile/`：移动端页面。
- `assets/css/`：公共和模块样式，管理端优先看 `admin.css`，业务端优先看 `business.css`。
- `assets/js/`：公共交互和模块脚本，优先复用 `common.js` 及同类模块脚本。

原型修改规则：
- 先查找同类页面、公共菜单、公共按钮、弹窗、表格、表单和状态样式，再做增量修改。
- 不启动本地服务、不打开浏览器测试，除非用户明确要求。
- 功能按钮使用图标+文字；示例数据要贴合智能问数、数据源、分析主题、报告、看板、知识库等业务语境。
- 用户说“先分析”“先看看理解”时，不写文件；用户限定范围时，不扩展新功能。

提交和部署：
- 本项目有 `deploy-update.cmd` 和 `setup-codex-git-token.cmd`，用户要求“提交 git / 部署更新”时优先使用全局 `git-deploy-update` 技能和本项目脚本。
- 如果根目录 `.git` 无法写入，不要反复直接 `git add`，走 `.codex-submit-test/publish-worktree` 或 `deploy-update.cmd`。
- 不要把 GitHub token 写进聊天或提交内容；确认 `.codex-submit-test/` 等凭证目录不进入提交。

检查：
- 默认运行 `git diff --check`。
- 修改 JS 后做轻量语法检查；如果系统 `node` 不可用，使用 Codex bundled Node。
- 中文显示异常时先按 UTF-8 读取确认，不把终端错显当成页面乱码。
