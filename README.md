# dsh-prompt-optimizer

**English** | [简体中文](./README.zh.md)

Adds an **Optimize** button to the DeepSeek Harness composer: it hands the current draft to **the model
you already selected**, rewrites it with the "basic optimization" prompt from
[prompt-optimizer](https://github.com/linshenkx/prompt-optimizer), and writes the result straight back
into the input box.

No prompt-optimizer runtime, no Docker, no Bun, no browser extension, and no extra API key — it uses the
model you have already picked inside DSH.

## Where it came from

The **core prompt** is quoted verbatim from
[`linshenkx/prompt-optimizer`](https://github.com/linshenkx/prompt-optimizer) (⭐ 41.5k), template
`user-optimize/user-prompt-basic` (v2.0.0). The **plugin skeleton and slot wiring** follow published DSH
plugins such as [`seven282/oss-prompt-optimizer`](https://github.com/seven282/oss-prompt-optimizer)
(⭐ 30, MIT) and [`@max-null/dsh-draft-polish`](https://www.npmjs.com/package/@max-null/dsh-draft-polish)
(MIT).

Code, tests, copy and icon are written for this repository. Upstream contributed prompt text and API
usage only — no code was copied.

## Install

```bash
dsh plugin --profile desktop add @lklkuu/dsh-prompt-optimizer
```

Or from the tarball attached to the latest Release:

```bash
dsh plugin --profile desktop add https://github.com/lklkuu/dsh-prompt-optimizer/releases/latest/download/dsh-prompt-optimizer.tgz
```

Restart DSH (or reload the page) so the client module loads.

## Usage

1. Type something into the composer — the button stays greyed out while the draft is empty.
2. Click **Optimize**. It turns into "Optimizing…"; click again to cancel.
3. The result replaces the draft and a "Optimized · Undo" affordance appears next to it — one click puts
   the original back.

Requests are canceled automatically after 150 seconds.

## How it works

| Step | Implementation |
| --- | --- |
| Button location | `conversation.input.right` slot, `order: 12` (between image provider 10 and Codex quota 15) |
| Read the draft | Standard slot prop `useInput(s => s.draft)` |
| Call the model | Host half `POST /api/prompt-optimizer/optimize` → `ctx.get('llm').stream()` |
| Pick the model | `agentDefaultModel.currentSelection()` — whatever the current conversation uses |
| Write back | `inputActions.setDraft(text)` + `persistDraft()` |

The call is **out of band**: it does not enter the transcript, does not consume a conversation turn and
does not touch session files. The route rides DSH's own authenticated `/api` mount, reusing the host's
same-origin/login fence — the plugin opens no port, stores no credential and talks to nothing but the
host.

The prompt is prompt-optimizer's original text. The only change: the Mustache
`{{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}` placeholder becomes a local
`JSON.stringify(draft)` — same effect, no template engine.

## Configuration

None. To try a more aggressive rewrite (analytical, structured, output-format oriented, …), edit
`SYSTEM_PROMPT` and `renderUserPrompt` in `index.js`; upstream ships 144 templates to choose from.

## Development

```bash
npm test
```

Three layers, fully offline — no installs, no network:

1. Pure functions: prompt rendering, code-fence stripping, model route resolution, six failure modes.
2. Host wiring: route registration, 405/415/400 guards, success and error envelopes.
3. Browser half: fake `window.__ModuleLoader__` / React loading the **real `client.js`**, asserting the
   module id, the `inject` declaration, and that the button really registers into
   `conversation.input.right`.

## Known limits

- Only works in profiles that **serve a browser UI** (desktop / web). Under headless, tui and sdk the
  host half still loads, but the `/api` route is not registered and the front end never gets the button.
- Depends on the host `llm`, `agentDefaultModel` and `connection` services. If any is missing the button
  is not rendered or the call errors out — it never fails silently.
- `inputActions.setDraft` replaces the whole draft, so the caret position is not preserved.
- 24000 characters per request, 150 second timeout.

## Uninstall

```bash
dsh plugin --profile desktop remove @lklkuu/dsh-prompt-optimizer
```

## License

MIT, see [LICENSE](LICENSE).

The prompt template text comes from linshenkx/prompt-optimizer (AGPL-3.0) and is quoted here as
**prompt text**, credited in the source comments and in this file. This repository contains none of its
program code.
