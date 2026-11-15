# 更新记录

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-11-15

### 修复

- 插件介绍页（详情页）此前总是显示英文 README，与界面语言无关。原因是包内没有声明
  `meta.detail`，DSH 只能回退到写死的 `README.md`；而 `README.zh.md` 不在它的候选名单里，
  永远不会被选中。
- 现在 `locale/en.json` 与 `locale/zh.json` 各自声明了 `meta`（`title` / `description` /
  `detail`），中文界面读 `docs/DETAIL.zh.md`，英文界面读 `docs/DETAIL.md`，日文等其它语言
  按 DSH 的语言回退链落到英文文档。

### 新增

- `docs/DETAIL.zh.md`（中文版详情文档），`docs/DETAIL.md` 改写为英文版，两份内容一一对应。
- `docs/preview.svg`（640×300，无文字、无脚本、无外部资源，明暗主题都可读），
  两张详情文档顶部各引用它一次。
- 插件列表里的名称与一句话说明改为随界面语言切换，不再显示裸包名。

## [0.1.0] - 2026-11-15

首个发布版本。

### 新增

- 对话框右侧新增「优化」按钮（`conversation.input.right` 槽位，`order: 12`），空草稿时禁用。
- 点击后用当前对话选中的模型改写草稿，结果直接写回输入框，并附「已优化 · 撤销」回退入口。
- 运行中可再次点击取消；150 秒超时自动中止并提示。
- 服务端路由 `POST /api/prompt-optimizer/optimize`，挂在 DSH 自己的 `/api` 认证挂载点上，
  做 405 / 415 / 400 输入守卫与统一错误信封。
- 中文与英文两套文案。
- 15 个离线测试，覆盖纯函数、host 接线、浏览器半模块加载与槽位注册。
- npm 包名 `@lklkuu/dsh-prompt-optimizer`（`dsh-prompt-optimizer` 已被他人占用），
  安装可用 `dsh plugin --profile desktop add @lklkuu/dsh-prompt-optimizer`。

### 说明

- 提示词采用 [linshenkx/prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的
  `user-optimize/user-prompt-basic`（v2.0.0）模板，逐字引用。
- 插件骨架与槽位用法参考
  [seven282/oss-prompt-optimizer](https://github.com/seven282/oss-prompt-optimizer)、
  [@max-null/dsh-draft-polish](https://www.npmjs.com/package/@max-null/dsh-draft-polish)。
- 不引入任何运行时依赖，不存凭据，不开独立端口。
