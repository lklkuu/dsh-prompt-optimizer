# dsh-prompt-optimizer

[English](./README.md) | **简体中文**

给 DeepSeek Harness 的对话框加一个「优化」按钮：把输入框里的草稿交给**你当前选中的模型**，按
[prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的「基础优化」模板改写，然后把
结果直接写回输入框。

不装 prompt-optimizer 本体，不需要 Docker、Bun、浏览器扩展，也不需要额外的 API Key —— 用的是你
在 DSH 里已经选好的那个模型。

## 它是怎么来的

这个插件的**核心提示词**来自 [`linshenkx/prompt-optimizer`](https://github.com/linshenkx/prompt-optimizer)
（⭐ 41.5k）的 `user-optimize/user-prompt-basic` 模板（v2.0.0），逐字引用；**插件骨架与槽位挂载
方式**参考了 [`seven282/oss-prompt-optimizer`](https://github.com/seven282/oss-prompt-optimizer)
（⭐ 30，MIT）、[`@max-null/dsh-draft-polish`](https://www.npmjs.com/package/@max-null/dsh-draft-polish)
（MIT）等已发布的 DSH 同类插件。

代码、测试、文案、图标均为本仓库自行编写。上游只贡献了提示词文本与接口用法，没有任何代码被复制。

## 安装

```bash
dsh plugin --profile desktop add @lklkuu/dsh-prompt-optimizer
```

或从 Release 里的 tarball 安装：

```bash
dsh plugin --profile desktop add https://github.com/lklkuu/dsh-prompt-optimizer/releases/latest/download/dsh-prompt-optimizer.tgz
```

安装后需要重启 DSH（或刷新页面）让客户端模块加载。

## 用法

1. 在输入框里写点东西（空的时候按钮是灰的）。
2. 点「优化」。按钮变成「优化中…」，再点一次可以取消。
3. 结果直接替换输入框内容，旁边出现「已优化 · 撤销」，点一下回到原文。

超过 150 秒没返回会自己取消并提示超时。

## 它是怎么工作的

| 环节 | 实现 |
| --- | --- |
| 按钮位置 | `conversation.input.right` 槽位，`order: 12`（在图片提供方 10 与 Codex 配额 15 之间） |
| 读草稿 | 槽位标准 prop `useInput(s => s.draft)` |
| 调模型 | host 半 `POST /api/prompt-optimizer/optimize` → `ctx.get('llm').stream()` |
| 选模型 | `agentDefaultModel.currentSelection()`，即你当前对话选中的模型 |
| 写回 | `inputActions.setDraft(text)` + `persistDraft()` |

这一路是**旁路调用**：不进会话记录，不消耗会话轮次，不改动任何会话文件。路由挂在 DSH 自己的
`/api` 认证挂载点上，用的是宿主已有的同源/登录栅栏，插件自己不开端口、不存凭据、不联网除宿主外
的任何地址。

提示词就是 prompt-optimizer 的原文，唯一改动是把模板里的 Mustache
`{{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}` 换成本地 `JSON.stringify(draft)` —— 效果
一样，但不需要引入模板引擎。

## 配置

没有配置项。想做更激进的改写（分析型、结构化、面向输出格式等），改 `index.js` 里的
`SYSTEM_PROMPT` 与 `renderUserPrompt` 即可 —— 上游仓库有 144 个模板可选。

## 开发

```bash
npm test
```

测试分三层，全部离线，不需要装依赖、不联网：

1. 纯函数：提示词渲染、代码块剥离、模型路由解析、六种失败模式。
2. host 半接线：路由注册、405/415/400 守卫、成功与错误信封。
3. 浏览器半：用假的 `window.__ModuleLoader__` / React 加载**真的 `client.js`**，验证模块 id、
   `inject` 声明、以及按钮确实注册进 `conversation.input.right`。

## 已知边界

- 只在**有浏览器界面**的 profile 生效（desktop / web）。headless、tui、sdk 下 host 半照常加载，
  但 `/api` 路由不注册，前端也拿不到按钮。
- 依赖宿主的 `llm`、`agentDefaultModel`、`connection` 三个服务；任何一项缺失时按钮不渲染或报错，
  不会静默失败。
- `inputActions.setDraft` 会整段替换草稿，光标位置不保留。
- 单次输入上限 24000 字符，超时 150 秒。

## 卸载

```bash
dsh plugin --profile desktop remove @lklkuu/dsh-prompt-optimizer
```

## 许可

MIT，见 [LICENSE](LICENSE)。

提示词模板文本来自 linshenkx/prompt-optimizer（AGPL-3.0），在本仓库中作为**提示词文本**引用，
并已在源码注释与本文件中标注来源；本仓库不包含其任何程序代码。
