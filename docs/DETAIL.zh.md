![左边是一段随手写的草稿，输入框里有一颗星形的「优化」按钮，右边是整理好的提示词](preview.svg)

# dsh-prompt-optimizer

在 DeepSeek Harness 的对话框右侧加一个「优化」按钮：拿输入框里的草稿，交给当前选中的模型，按
[linshenkx/prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的「基础优化」
（`user-optimize/user-prompt-basic`，v2.0.0）模板改写，然后把结果写回输入框。

不安装 prompt-optimizer 本体，不依赖 Docker / Bun / 浏览器扩展，也不需要任何额外的 API Key ——
用的是你在 DSH 里已经选好的那个模型。

## 用法

1. 在输入框里写点东西（空的时候按钮是灰的）。
2. 点「优化」。按钮变成「优化中…」，再点一次可以取消。
3. 结果直接替换输入框内容，旁边出现「已优化 · 撤销」，点一下回到原文。

超过 150 秒没返回会自己取消并提示超时。

## 它做了什么

| 环节 | 实现 |
| --- | --- |
| 按钮位置 | `conversation.input.right` 槽位，`order: 12`（在图片提供方 10 与 Codex 配额 15 之间） |
| 读草稿 | 槽位标准 prop `useInput(s => s.draft)` |
| 调模型 | host 半 `POST /api/prompt-optimizer/optimize` → `ctx.get('llm').stream()` |
| 选模型 | `agentDefaultModel.currentSelection()`，即你当前对话选中的模型 |
| 写回 | `inputActions.setDraft(text)` + `persistDraft()` |

提示词就是 linshenkx/prompt-optimizer 的原文，唯一改动是把模板里的 Mustache
`{{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}` 换成本地 `JSON.stringify(draft)`
—— 效果一样，但不需要引入模板引擎。

这一路是**旁路调用**，不进会话记录，不消耗会话轮次，不改动任何会话文件。

## 配置

没有配置项。想做更激进的改写（分析型、结构化、面向输出格式等），改 `index.js` 里的
`SYSTEM_PROMPT` 与 `renderUserPrompt` 即可 —— 上游仓库有 144 个模板可选。

## 已知边界

- 只在**有浏览器界面**的 profile 生效（desktop / web）。headless、tui、sdk 下 host 半照常加载，
  但 `/api` 路由不注册，前端也拿不到按钮。
- 依赖宿主的 `llm`、`agentDefaultModel`、`connection` 三个服务；任何一项缺失时按钮不渲染或报错，
  不会静默失败。
- `inputActions.setDraft` 会整段替换草稿，光标位置不保留。

## 卸载

```bash
dsh plugin --profile desktop remove @lklkuu/dsh-prompt-optimizer
```

或在本机 profile 的插件管理里停用该条目。

## 许可

MIT。提示词模板来自 linshenkx/prompt-optimizer（AGPL-3.0），此处仅作提示词文本引用。
