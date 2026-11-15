# 更新记录

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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

### 说明

- 提示词采用 [linshenkx/prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的
  `user-optimize/user-prompt-basic`（v2.0.0）模板，逐字引用。
- 插件骨架与槽位用法参考
  [seven282/oss-prompt-optimizer](https://github.com/seven282/oss-prompt-optimizer)、
  [@max-null/dsh-draft-polish](https://www.npmjs.com/package/@max-null/dsh-draft-polish)。
- 不引入任何运行时依赖，不存凭据，不开独立端口。
