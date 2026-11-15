给 DeepSeek Harness 的对话框加一个「优化」按钮：把输入框里的草稿交给**你当前选中的模型**，按
[prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的「基础优化」模板改写，结果直接写回输入框。

## 来源

- **核心提示词**：逐字取自 [`linshenkx/prompt-optimizer`](https://github.com/linshenkx/prompt-optimizer)（⭐ 41.5k）的 `user-optimize/user-prompt-basic` 模板（v2.0.0）。
- **插件骨架与槽位用法**：参考 [`seven282/oss-prompt-optimizer`](https://github.com/seven282/oss-prompt-optimizer)（⭐ 30，MIT）、[`@max-null/dsh-draft-polish`](https://www.npmjs.com/package/@max-null/dsh-draft-polish)（MIT）。
- 代码、测试、文案、图标均为本仓库自写；上游只贡献提示词文本与接口用法，未复制任何代码。

## 安装

npm（推荐）：

```bash
dsh plugin --profile desktop add @lklkuu/dsh-prompt-optimizer
```

或直接用本页附件（版本无关的稳定链接）：

```bash
dsh plugin --profile desktop add https://github.com/lklkuu/dsh-prompt-optimizer/releases/latest/download/dsh-prompt-optimizer.tgz
```

安装后重启 DSH（或刷新页面）让客户端模块加载。

> 注意：npm 上的 `dsh-prompt-optimizer`（不带 scope）是**别人的同名包**，不是本插件。

## 用法

1. 输入框写点东西（空时按钮是灰的）。
2. 点「优化」→ 按钮变「优化中…」，再点一次可取消。
3. 结果替换草稿，旁边出现「已优化 · 撤销」，点一下回到原文。

150 秒无响应会自动取消并提示。

## 本版内容

- `conversation.input.right` 槽位按钮（`order: 12`），`useInput(s => s.draft)` 读草稿。
- `POST /api/prompt-optimizer/optimize` 挂在宿主 `/api` 认证挂载点，走 `ctx.get('llm').stream()`，模型来自 `agentDefaultModel.currentSelection()`。
- `inputActions.setDraft` + `persistDraft()` 写回，附带一键撤销。
- 中英双语；零运行时依赖；不存凭据、不开端口。
- 15 个离线测试（纯函数 / host 接线 / 浏览器半模块加载）。

## 已知边界

- 只在有浏览器界面的 profile 生效（desktop / web）。
- 依赖宿主 `llm`、`agentDefaultModel`、`connection` 三个服务。
- `setDraft` 整段替换，光标位置不保留。
- 单次输入上限 24000 字符，超时 150 秒。

## 附件

| 文件 | 说明 |
| --- | --- |
| `dsh-prompt-optimizer.tgz` | 版本无关，`latest/download/` 可直接引用 |
| `dsh-prompt-optimizer-0.1.0.tgz` | 钉住本版本，内容相同 |

SHA-256（`.tgz`，两者相同）：`14b8fdf5f0cd6fe3dc90baf06c28e626b4c73bb2732c2d1b4526f33fe22b5751`

与 npm 上 `@lklkuu/dsh-prompt-optimizer@0.1.0` 的 tarball 字节完全一致。

MIT License.
