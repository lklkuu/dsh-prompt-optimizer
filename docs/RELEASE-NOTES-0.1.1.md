# dsh-prompt-optimizer 0.1.1

「优化」按钮的功能与 0.1.0 完全一致，这一版只修了一件事：**插件介绍页不再一律显示英文**。

## 修了什么

装好插件后点开它的介绍页，之前不管界面语言是什么，看到的都是英文 `README.md`。

原因不在本插件，而在 DSH 的查找顺序：详情页会先读 `locale/<语言>.json` 里的 `meta.detail`，
只有那里没声明时，才回退到包里的 README。而那个兜底名单是写死的
`README.md` / `readme.md` / `Readme.md` / `README.markdown` / `README` ——
`README.zh.md` 既不在名单里，也不匹配它的匹配规则，所以中文版永远轮不到。

这一版按 DSH 的约定，把文案和文档分开声明：

| 界面语言 | 读哪份文档 |
| --- | --- |
| 简体中文 | `docs/DETAIL.zh.md` |
| English | `docs/DETAIL.md` |
| 其它语言 | 按回退链落到 `docs/DETAIL.md` |

插件列表里显示的名称与一句话说明也一并跟着界面语言切换，不再显示裸包名。

## 顺带加的

- `docs/DETAIL.zh.md`：中文版详情文档（原有内容）。
- `docs/DETAIL.md`：改写为英文版，与中文版逐段对应。
- `docs/preview.svg`：640×300 示意图，不含文字、脚本与外部资源，明暗主题下都能看。
  两份详情文档顶部各引用它一次。

## 安装 / 升级

```bash
dsh plugin --profile desktop add @lklkuu/dsh-prompt-optimizer
```

也可以直接指向本 Release 里的 tarball：

```bash
dsh plugin --profile desktop add https://github.com/lklkuu/dsh-prompt-optimizer/releases/download/v0.1.1/dsh-prompt-optimizer.tgz
```

升级后刷新页面即可看到中文介绍页，不需要重启 DSH。

## 校验

- `npm test` → 15 tests / 15 pass / 0 fail
- `npm pack --dry-run` → 15 个文件，包体 18.0 kB，含 `docs/DETAIL.md`、`docs/DETAIL.zh.md`、
  `docs/preview.svg`、`locale/en.json`、`locale/zh.json`
- 用 DSH 自己的语言链规则离线复算：`zh-CN → zh-cn > zh > en → docs/DETAIL.zh.md`，
  `en-US → en-us > en → docs/DETAIL.md`，`ja-JP → ja-jp > ja > en → docs/DETAIL.md`

## 许可

本插件代码 MIT。改写用的提示词模板逐字取自
[linshenkx/prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) 的
`user-optimize/user-prompt-basic`（AGPL-3.0），本仓库不含该项目的代码。
