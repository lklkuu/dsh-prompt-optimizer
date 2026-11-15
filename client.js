/**
 * 浏览器半：在输入框右侧加一个「优化」按钮。
 *
 * 形态照着 dsh-deja / dsh-codex-subscription 的 client 写：手写纯 JS，
 * 用 window.__ModuleLoader__.load 注册，不写 JSX、不需要构建步骤。
 *
 * 数据流：
 *   读草稿  props.useInput(s => s).draft
 *   发请求  fetch('api/prompt-optimizer/optimize', ...)   ← 相对路径，与 dsh 自己的 /api 调用一致
 *   写回去  props.inputActions.setDraft(text)
 */
window.__ModuleLoader__.load({
  id: 'dsh-prompt-optimizer',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
    const h = React.createElement;

    const NS = 'prompt-optimizer';
    const SLOT = 'conversation.input.right';
    const ENDPOINT = 'api/prompt-optimizer/optimize';
    const STYLE_ID = 'dsh-prompt-optimizer/style';

    const zh = {
      'btn.label': '优化',
      'btn.title': '用 prompt-optimizer 的「基础优化」改写这段提示词',
      'btn.running': '优化中…',
      'btn.cancel': '点击取消',
      'btn.empty': '输入框是空的，先写点东西再优化。',
      'btn.undo': '已优化 · 撤销',
      'btn.undoTitle': '恢复到优化前的原文',
      'err.http': '请求失败（HTTP {status}）',
      'err.network': '连不上本地服务：{message}',
      'err.unknown': '优化失败：{message}',
      'err.aborted': '已取消',
    };

    const en = {
      'btn.label': 'Optimize',
      'btn.title': 'Rewrite this prompt with prompt-optimizer basic-optimize',
      'btn.running': 'Optimizing…',
      'btn.cancel': 'Click to cancel',
      'btn.empty': 'The composer is empty — write something first.',
      'btn.undo': 'Optimized · Undo',
      'btn.undoTitle': 'Restore the original draft',
      'err.http': 'Request failed (HTTP {status})',
      'err.network': 'Cannot reach the local service: {message}',
      'err.unknown': 'Optimize failed: {message}',
      'err.aborted': 'Cancelled',
    };

    function installStyles() {
      if (typeof document === 'undefined') return () => {};
      if (document.getElementById(STYLE_ID)) return () => {};
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = [
        '.dsh-po-root{display:inline-flex;align-items:center;gap:2px;position:relative}',
        '.dsh-po-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
        'gap:4px;height:28px;padding:0 8px;border-radius:6px;border:1px solid transparent;',
        'background:transparent;color:var(--dsw-alias-label-secondary,currentColor);',
        'font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}',
        '.dsh-po-btn:hover:enabled{background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.14));',
        'color:var(--dsw-alias-label-primary,currentColor)}',
        '.dsh-po-btn:focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
        '.dsh-po-btn:disabled{opacity:.4;cursor:default}',
        '.dsh-po-btn-running{color:var(--dsw-alias-brand-primary,#4d6bfe)}',
        '.dsh-po-icon{display:block;flex:none}',
        '.dsh-po-spin{animation:dsh-po-spin 1s linear infinite}',
        '@keyframes dsh-po-spin{to{transform:rotate(360deg)}}',
        '.dsh-po-undo{border-color:var(--dsw-alias-border-l2,rgba(127,127,127,.3));',
        'color:var(--dsw-alias-label-secondary,currentColor);font-size:11px}',
        '.dsh-po-error{position:absolute;bottom:calc(100% + 6px);right:0;z-index:40;',
        'max-width:min(360px,60vw);padding:6px 9px;border-radius:7px;',
        'background:var(--dsw-alias-bg-layer-2,#26282e);color:var(--dsw-alias-state-error-primary,#ff6b6b);',
        'border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));',
        'font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;',
        'box-shadow:0 4px 14px rgba(0,0,0,.24)}',
        '@media (prefers-reduced-motion:reduce){.dsh-po-spin{animation:none}}',
      ].join('');
      document.head.appendChild(el);
      return () => {
        const node = document.getElementById(STYLE_ID);
        if (node) node.remove();
      };
    }

    function starIcon(spinning) {
      return h(
        'svg',
        {
          className: spinning ? 'dsh-po-icon dsh-po-spin' : 'dsh-po-icon',
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('polygon', {
          points: '12.00 2.96 14.25 9.87 21.51 9.87 15.63 14.14 17.88 21.05 12.00 16.78 6.12 21.05 8.37 14.14 2.49 9.87 9.75 9.87',
        }),
      );
    }

    function OptimizeButton(props) {
      const { useInput, inputActions } = props;
      const t = props.t;
      const draft = useInput ? useInput((s) => (s && typeof s.draft === 'string' ? s.draft : '')) : '';

      const [running, setRunning] = React.useState(false);
      const [error, setError] = React.useState('');
      const [undo, setUndo] = React.useState(null);
      const abortRef = React.useRef(null);
      const aliveRef = React.useRef(true);

      React.useEffect(() => {
        aliveRef.current = true;
        return () => {
          aliveRef.current = false;
          if (abortRef.current) abortRef.current.abort();
        };
      }, []);

      // 草稿被用户改动后，撤销点就不该再指回旧文，否则一点就吞掉新写的内容。
      React.useEffect(() => {
        if (undo && draft !== undo.optimized) setUndo(null);
      }, [draft, undo]);

      const canSetDraft = !!(inputActions && typeof inputActions.setDraft === 'function');

      if (!useInput || !canSetDraft) {
        // 宿主 composer 契约变了：按钮不渲染，别占着位置装死。
        return null;
      }

      const text = typeof draft === 'string' ? draft : '';
      const empty = text.trim().length === 0;
      const disabled = !running && (empty || !aliveRef.current);

      const fail = (message) => {
        if (!aliveRef.current) return;
        setError(message);
      };

      const onCancel = () => {
        if (abortRef.current) abortRef.current.abort();
      };

      const onOptimize = async () => {
        if (running) return;
        setError('');
        setUndo(null);
        setRunning(true);

        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 150000);

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ draft: text }),
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal,
          });

          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          if (!response.ok) {
            const detail = payload && typeof payload.error === 'string' ? payload.error : '';
            fail(t('err.http', { status: response.status }) + (detail ? '：' + detail : ''));
            return;
          }
          if (!payload || typeof payload.text !== 'string' || payload.text.trim() === '') {
            fail(t('err.unknown', { message: '服务没有返回文本' }));
            return;
          }

          if (!aliveRef.current) return;
          inputActions.setDraft(payload.text);
          if (typeof inputActions.persistDraft === 'function') inputActions.persistDraft();
          setUndo({ original: text, optimized: payload.text });
        } catch (err) {
          const name = err && err.name ? err.name : '';
          if (name === 'AbortError') {
            if (!timedOut) return; // 用户点了取消，安静收场
            fail(t('err.unknown', { message: '超时（150 秒）' }));
            return;
          }
          fail(t('err.network', { message: err && err.message ? err.message : String(err) }));
        } finally {
          clearTimeout(timer);
          if (abortRef.current === controller) abortRef.current = null;
          if (aliveRef.current) setRunning(false);
        }
      };

      const onUndo = () => {
        if (!undo) return;
        setUndo(null);
        inputActions.setDraft(undo.original);
        if (typeof inputActions.persistDraft === 'function') inputActions.persistDraft();
      };

      const label = running ? t('btn.running') : t('btn.label');
      const title = running ? t('btn.cancel') : empty ? t('btn.empty') : t('btn.title');

      return h(
        'div',
        { className: 'dsh-po-root' },
        h(
          'button',
          {
            type: 'button',
            className: running ? 'dsh-po-btn dsh-po-btn-running' : 'dsh-po-btn',
            title,
            'aria-label': label,
            'aria-busy': running ? 'true' : 'false',
            disabled,
            onClick: running ? onCancel : onOptimize,
          },
          starIcon(running),
          h('span', null, label),
        ),
        undo
          ? h(
              'button',
              {
                type: 'button',
                className: 'dsh-po-btn dsh-po-undo',
                title: t('btn.undoTitle'),
                onClick: onUndo,
              },
              t('btn.undo'),
            )
          : null,
        error
          ? h('div', { className: 'dsh-po-error', role: 'status', onClick: () => setError('') }, error)
          : null,
      );
    }

    function apply(ctx) {
      ctx.effect(installStyles, 'dsh-prompt-optimizer: styles');
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-prompt-optimizer: dictionaries',
      );

      const t = ctx.locale.bind(NS);

      ctx.slots.inject(SLOT, () => {
        try {
          return ctx.slots.register(
            {
              name: SLOT,
              id: 'dsh-prompt-optimizer',
              order: 12,
              locale: NS,
            },
            (props) => h(OptimizeButton, { ...props, t }),
          );
        } catch (err) {
          console.warn('[dsh-prompt-optimizer] slot registration failed:', err);
          return () => {};
        }
      });
    }

    module.exports = { inject: ['slots', 'locale'], apply };
    return module.exports;
  },
});
