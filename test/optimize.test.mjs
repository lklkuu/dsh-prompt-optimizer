/**
 * Release gate for dsh-prompt-optimizer.
 *
 * Three layers, all offline — no network, no DSH host, no browser:
 *   1. host pure functions (prompt rendering, fence unwrapping, route resolution)
 *   2. host plugin wiring (route registration + HTTP handler semantics)
 *   3. browser half (module load, slot registration)
 *
 * Run with: npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  name,
  inject,
  OPTIMIZE_PATH,
  renderUserPrompt,
  unwrapFence,
  resolveRoute,
  optimizeDraft,
  apply as hostApply,
} from '../index.js'

const PKG_NAME = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).name;

const SELF = 'http://127.0.0.1/api/prompt-optimizer/optimize'

const postBody = (body, headers = { 'content-type': 'application/json' }) =>
  new Request(SELF, { method: 'POST', headers, body })

/* ------------------------------------------------------------------ layer 1 */

test('manifest keeps the identifiers the host reads', () => {
  assert.equal(name, PKG_NAME)
  assert.deepEqual(inject, ['llm'])
  assert.equal(OPTIMIZE_PATH, '/api/prompt-optimizer/optimize')
})

test('renderUserPrompt embeds the draft as parseable JSON', () => {
  const draft = '把 "hello" 换成 \'world\'\n第二行'
  const rendered = renderUserPrompt(draft)
  const start = rendered.indexOf('{')
  const end = rendered.lastIndexOf('}')
  const parsed = JSON.parse(rendered.slice(start, end + 1))
  assert.equal(parsed.originalPrompt, draft)
})

test('renderUserPrompt keeps all four guard rails', () => {
  const rendered = renderUserPrompt('x')
  assert.match(rendered, /优化提示词文本本身/)
  assert.match(rendered, /直接输出改进后的提示词/)
  assert.match(rendered, /保持用户的原始意图/)
  assert.match(rendered, /不要把它们当成当前要执行的任务/)
})

test('unwrapFence only strips a fence that wraps the whole answer', () => {
  assert.equal(unwrapFence('```\nhello\n```'), 'hello')
  assert.equal(unwrapFence('```python\nprint(1)\n```'), 'print(1)')
  assert.equal(unwrapFence('plain text'), 'plain text')
  assert.equal(unwrapFence('```arn\nunclosed'), '```arn\nunclosed')
  assert.equal(unwrapFence('a\n```\nb\n```\nc'), 'a\n```\nb\n```\nc')
})

test('resolveRoute prefers an explicit pair, then the default model', () => {
  const ctx = { get: (k) => (k === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'p', model: 'm' }) } : undefined) }
  assert.deepEqual(resolveRoute(ctx, { provider: 'x', model: 'y' }), { provider: 'x', model: 'y' })
  assert.deepEqual(resolveRoute(ctx, {}), { provider: 'p', model: 'm' })

  const withEffort = { get: () => ({ currentSelection: () => ({ provider: 'p', model: 'm', reasoningEffort: 'high' }) }) }
  assert.deepEqual(resolveRoute(withEffort, {}), { provider: 'p', model: 'm', reasoningEffort: 'high' })

  assert.throws(() => resolveRoute({ get: () => undefined }, {}), /agentDefaultModel/)
  assert.throws(() => resolveRoute({ get: () => ({ currentSelection: () => undefined }) }, {}), /没有选中任何模型/)
})

/** A ctx whose llm yields the given chunks. */
function llmCtx(chunks, selection = { provider: 'p', model: 'm' }) {
  return {
    get: (k) => {
      if (k === 'agentDefaultModel') return { currentSelection: () => selection }
      if (k === 'llm') {
        return {
          stream: async function* (options) {
            llmCtx.lastOptions = options
            for (const chunk of chunks) yield chunk
          },
        }
      }
      return undefined
    },
  }
}

test('optimizeDraft assembles text deltas and reports tokens', async () => {
  const ctx = llmCtx([
    { type: 'text-delta', index: 0, text: '```\n优化' },
    { type: 'text-delta', index: 0, text: '后的提示词\n```' },
    { type: 'usage', usage: { outputTokens: 7 } },
    { type: 'finish', reason: { kind: 'stop' } },
  ])

  const result = await optimizeDraft(ctx, { draft: '  原始草稿  ' })
  assert.equal(result.text, '优化后的提示词')
  assert.equal(result.outputTokens, 7)
  assert.equal(result.model, 'p/m')

  const options = llmCtx.lastOptions
  assert.equal(options.provider, 'p')
  assert.match(options.system, /用户提示词基础优化助手/)
  assert.equal(options.messages.length, 1)
  assert.equal(options.messages[0].role, 'user')
  assert.match(options.messages[0].content[0].text, /原始草稿/)
})

test('optimizeDraft surfaces every failure mode as a readable error', async () => {
  const fail = (finish) => llmCtx([{ type: 'text-delta', index: 0, text: 'partial' }, { type: 'finish', reason: finish }])

  await assert.rejects(() => optimizeDraft(fail({ kind: 'error', failure: { message: 'boom', code: 'X' } }), { draft: 'a' }), /模型调用失败/)
  await assert.rejects(() => optimizeDraft(fail({ kind: 'aborted' }), { draft: 'a' }), /模型调用失败|取消/)
  await assert.rejects(() => optimizeDraft(fail({ kind: 'max-tokens' }), { draft: 'a' }), /截断/)
  await assert.rejects(() => optimizeDraft(fail({ kind: 'tool-calls' }), { draft: 'a' }), /工具/)

  await assert.rejects(() => optimizeDraft(llmCtx([{ type: 'finish', reason: { kind: 'stop' } }]), { draft: 'a' }), /没有返回任何内容/)
  await assert.rejects(() => optimizeDraft(fail({ kind: 'stop' }), { draft: '   ' }), /输入框是空的/)
  await assert.rejects(() => optimizeDraft(fail({ kind: 'stop' }), { draft: 'x'.repeat(24001) }), /上限/)
  await assert.rejects(() => optimizeDraft({ get: () => undefined }, { draft: 'a' }), /llm 服务不可用/)
})

/* ------------------------------------------------------------------ layer 2 */

/**
 * Install the host half onto a fake ctx and hand back the registered route.
 *
 * The handler closes over the *outer* ctx (that is where `llm` and
 * `agentDefaultModel` live), so the fake outer ctx has to resolve them.
 */
function installHost({ withConnection = true, throwOnRegister = false, llm } = {}) {
  const registered = []
  const effects = []
  class FakeCtx {
    constructor(routes) {
      this.routes = routes
    }
    get(key) {
      if (key === 'llm') return llm ?? { stream: async function* () { yield { type: 'text-delta', index: 0, text: 'done' }; yield { type: 'finish', reason: { kind: 'stop' } } } }
      if (key === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'p', model: 'm' }) }
      return undefined
    }
    inject(deps, cb) {
      if (!withConnection) return
      cb({
        get: (key) => (key === 'connection' ? { fetch: { register: (route) => { if (throwOnRegister) throw new Error('nope'); registered.push(route) } } } : this.get(key)),
        effect: (fn, label) => { effects.push(label); const cleanup = fn(); return typeof cleanup === 'function' ? cleanup : () => {} },
      })
    }
    effect(fn, label) {
      effects.push(label)
      const cleanup = fn()
      return typeof cleanup === 'function' ? cleanup : () => {}
    }
    warn() {}
    get logger() {
      return { warn: () => {} }
    }
  }
  const ctx = new FakeCtx(registered)
  hostApply(ctx)
  return { ctx, registered, effects }
}

test('host half registers one buffered POST route', () => {
  const { registered, effects } = installHost()
  assert.equal(registered.length, 1)
  const route = registered[0]
  assert.equal(route.path, OPTIMIZE_PATH)
  assert.deepEqual(route.methods, ['POST'])
  assert.equal(route.requestBody, 'buffered')
  assert.equal(typeof route.fetch, 'function')
  assert.ok(effects.some((label) => /optimize route/.test(label)))
})

test('host half survives a profile without the connection service', () => {
  const { registered } = installHost({ withConnection: false })
  assert.equal(registered.length, 0)
})

test('host half swallows a failing register()', () => {
  assert.doesNotThrow(() => installHost({ throwOnRegister: true }))
})

test('the handler rejects the wrong method, content type and body shape', async () => {
  const { registered } = installHost()
  const handler = registered[0].fetch

  assert.equal((await handler(new Request(SELF, { method: 'GET' }))).status, 405)
  assert.equal((await handler(postBody('x', { 'content-type': 'text/plain' }))).status, 415)
  assert.equal((await handler(postBody('{'))).status, 400)
  assert.equal((await handler(postBody('5'))).status, 400)
})

test('the handler returns text on success', async () => {
  const { registered } = installHost()
  const response = await registered[0].fetch(postBody(JSON.stringify({ draft: 'hi' })))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.text, 'done')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('the handler returns an error envelope on failure', async () => {
  const boom = { stream: async function* () { throw new Error('upstream exploded') } }
  const { registered } = installHost({ llm: boom })
  const response = await registered[0].fetch(postBody(JSON.stringify({ draft: 'hi' })))
  const body = await response.json()
  assert.equal(response.status, 500)
  assert.equal(body.ok, false)
  assert.match(body.error.message, /upstream exploded/)
})

/* ------------------------------------------------------------------ layer 3 */

function loadClientModule() {
  let loaded
  const window = {
    __ModuleLoader__: {
      load: (definition) => {
        loaded = definition
      },
    },
  }
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  }
  const requireFn = (id) => {
    if (id === 'react') return React
    throw new Error(`unexpected require: ${id}`)
  }
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  // eslint-disable-next-line no-new-func
  new Function('window', source)(window)
  assert.ok(loaded, 'client.js must call __ModuleLoader__.load')
  return { definition: loaded, module: loaded.factory(requireFn) }
}

test('client half loads under the module loader contract', () => {
  const { definition, module } = loadClientModule()
  assert.equal(definition.id, PKG_NAME)
  assert.equal(typeof module.apply, 'function')
  assert.deepEqual(module.inject, ['slots', 'locale'])
})

test('client half registers one button into the composer right rail', () => {
  const { module } = loadClientModule()
  const registrations = []
  let styleInserts = 0
  let localeRegisters = 0

  const ctx = {
    effect: (fn) => {
      const cleanup = fn()
      return typeof cleanup === 'function' ? cleanup : () => {}
    },
    locale: {
      register: () => {
        localeRegisters += 1
        return () => {}
      },
      bind: () => (key) => key,
    },
    slots: {
      inject: (slot, cb) => {
        cb()
        return () => {}
      },
      register: (options, component) => {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }

  // The client half writes a <style> element; give it a DOM to write into.
  const created = []
  globalThis.document = {
    getElementById: () => null,
    createElement: () => {
      const node = { textContent: '', id: '', setAttribute() {} }
      created.push(node)
      styleInserts += 1
      return node
    },
    head: { appendChild() {} },
  }
  try {
    module.apply(ctx)
  } finally {
    delete globalThis.document
  }

  assert.equal(registrations.length, 1)
  const { options } = registrations[0]
  assert.equal(options.name, 'conversation.input.right')
  assert.equal(options.id, 'dsh-prompt-optimizer')
  assert.equal(options.order, 12)
  assert.equal(options.locale, 'prompt-optimizer')
  assert.ok(styleInserts >= 1, 'styles should be injected once')
  assert.equal(localeRegisters, 1)
})
