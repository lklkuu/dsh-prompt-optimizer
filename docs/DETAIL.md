![A loose draft on the left, a star-shaped Optimize button in the composer, and a structured prompt on the right](preview.svg)

# dsh-prompt-optimizer

Adds an **Optimize** button to the right of the DeepSeek Harness composer: it takes the draft
you have typed, hands it to the model currently selected in the conversation, rewrites it with the
"basic optimize" template from
[linshenkx/prompt-optimizer](https://github.com/linshenkx/prompt-optimizer)
(`user-optimize/user-prompt-basic`, v2.0.0), and writes the result straight back into the composer.

It does not install prompt-optimizer itself, and it needs no Docker, Bun, browser extension, or
extra API key — it uses the model you already have selected in DSH.

## Usage

1. Type something into the composer (the button is greyed out while it is empty).
2. Click **Optimize**. The button turns into "Optimizing…"; click it again to cancel.
3. The result replaces the composer content, and an "Optimized · Undo" chip appears next to it —
   one click restores the original text.

If no answer comes back within 150 seconds the request cancels itself and reports a timeout.

## What it does

| Step | Implementation |
| --- | --- |
| Button placement | `conversation.input.right` slot, `order: 12` (between the image-provider pill at 10 and the Codex quota at 15) |
| Read the draft | The slot's standard prop `useInput(s => s.draft)` |
| Call the model | Host half `POST /api/prompt-optimizer/optimize` → `ctx.get('llm').stream()` |
| Pick the model | `agentDefaultModel.currentSelection()`, i.e. the model selected for this conversation |
| Write back | `inputActions.setDraft(text)` + `persistDraft()` |

The prompt is the linshenkx/prompt-optimizer text verbatim; the only change is replacing the
Mustache placeholder `{{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}` with a local
`JSON.stringify(draft)` — same effect, without pulling in a template engine.

The call runs **out of band**: it is not appended to the session transcript, does not consume a
conversation turn, and does not touch any session file.

## Configuration

There are no settings. To try a more aggressive rewrite (analytical, structured, output-format
oriented, …), edit `SYSTEM_PROMPT` and `renderUserPrompt` in `index.js` — the upstream repository
ships 144 templates to choose from.

## Known limits

- Only works in a profile **with a browser UI** (desktop / web). Under headless, tui and sdk the
  host half still loads, but the `/api` route is never registered and the front end has no button.
- Depends on the host's `llm`, `agentDefaultModel` and `connection` services; if one is missing the
  button is not rendered or an error is reported — it never fails silently.
- `inputActions.setDraft` replaces the whole draft, so the caret position is not preserved.

## Uninstall

```bash
dsh plugin --profile desktop remove @lklkuu/dsh-prompt-optimizer
```

Or disable the entry in the plugin manager of your local profile.

## License

MIT. The prompt template comes from linshenkx/prompt-optimizer (AGPL-3.0); only the prompt text is
quoted here.
