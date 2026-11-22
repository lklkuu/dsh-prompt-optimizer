# 更新记录

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.2] - 2026-11-22

### 修复

- **插件在 DSH 中无法启动**。报错「行 id 含特殊字符, 不支持写入补丁层」，
  插件能装上、但进不了配置树，随后连卸载也会失败。
  原因是 `cordis.patch.yml` 把行 `id` 写成了完整包名
  `@lklkuu/dsh-prompt-optimizer`；补丁层的行 `id` 必须是**简单标识符**，
  不接受 `@` 与 `/`。现在改为 `prompt-optimizer`。
- `name` 仍保留完整包名 `@lklkuu/dsh-prompt-optimizer`（DSH 靠它解析模块），
  两个字段的分工已在文件头注释里写清。

### 测试

- 新增第 4 层测试「补丁层」，4 条断言：行 id 必须是纯标识符（禁 `@`、`/`）、
  `name` 必须能解析到本包、scoped 包禁止把包名当 id、patch 至少插入一行。
- 已用 0.1.1 的原始 patch 内容回放验证：新测试确实失败（2 条），
  说明该 bug 不可能再静默发布。测试总数 15 → 19。

### 说明

- 前三层测试（纯函数 / host 接线 / 浏览器半模块）全绿也发现不了这个 bug，
  因为它们都不读补丁文件。这就是它被发出去的原因。

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
