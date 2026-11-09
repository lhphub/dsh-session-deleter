window.__ModuleLoader__.load({
  id: 'dsh-session-deleter',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'sessionDeleter'
    const ICON_KEY = 'sessionDeleter.delete'

    const zh = {
      'menu.delete': '删除会话',
      'delete.title': '删除会话？',
      'delete.close': '关闭',
      'delete.checking': '正在检查会话…',
      'delete.desc': '「{title}」将被永久删除。',
      'delete.warning': '此操作无法撤销。',
      'delete.irreversible': '会话日志、投影缓存与工作区记账将一并清理。',
      'delete.running': '该会话正在运行，删除前会先停止其工作。',
      'delete.archived': '该会话处于归档状态，其归档登记也会被清理。',
      'delete.pinned': '该会话处于置顶状态，其置顶登记也会被清理。',
      'delete.cascade': '该会话包含 {n} 个子代理会话，将一并删除。',
      'delete.size': '占用空间：{size}',
      'delete.pending': '正在删除…',
      'delete.action': '永久删除',
      'delete.cancel': '取消',
      'delete.success': '已删除会话「{title}」',
      'delete.deferred': '已删除；归档登记将在会话关闭或下次启动时收尾。',
      'delete.failureLabel': '删除会话来恢复',
      'delete.error': '删除失败：{message}',
    }
    const en = {
      'menu.delete': 'Delete session',
      'delete.title': 'Delete session?',
      'delete.close': 'Close',
      'delete.checking': 'Checking the session…',
      'delete.desc': '"{title}" will be permanently deleted.',
      'delete.warning': 'This cannot be undone.',
      'delete.irreversible': 'Its session log, projection cache, and workspace accounting are removed as well.',
      'delete.running': 'The session is running; its work is stopped before deletion.',
      'delete.archived': 'The session is archived; its archive registration is cleaned too.',
      'delete.pinned': 'The session is pinned; its pin registration is cleaned too.',
      'delete.cascade': '{n} subagent session(s) belong to this session and are deleted too.',
      'delete.size': 'Space used: {size}',
      'delete.pending': 'Deleting…',
      'delete.action': 'Delete permanently',
      'delete.cancel': 'Cancel',
      'delete.success': 'Deleted session "{title}"',
      'delete.deferred': 'Deleted; archive registrations finalize when the session closes or on the next launch.',
      'delete.failureLabel': 'Retry session deletion',
      'delete.error': 'Deletion failed: {message}',
    }

    const STYLE = [
      '.dsd-root{pointer-events:auto;position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:max(24px,var(--dsh-frame-overlay-top,24px)) 24px}',
      '.dsd-mask{position:absolute;inset:var(--dsh-frame-chrome-top,0px) 0 0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.28));backdrop-filter:var(--dsw-mask-blur,blur(4px))}',
      '.dsd-dialog{box-sizing:border-box;position:relative;z-index:1;display:flex;flex-direction:column;width:min(440px,100%);max-height:calc(100dvh - 48px);padding:0 0 24px;overflow:hidden;border:0;border-radius:var(--dsw-radius-panel,16px);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-overlay));box-shadow:var(--dsw-elevation-prominent,0 16px 48px rgba(0,0,0,.28));color:var(--dsw-alias-label-primary)}',
      '.dsd-dialog:focus{outline:none}',
      '.dsd-content{display:flex;flex-direction:column;width:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain}',
      '.dsd-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:22px 14px 12px 24px}',
      '.dsd-title{margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.dsd-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:var(--dsw-radius-sm,6px);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}',
      '.dsd-close:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsd-close:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsd-description{margin:0;padding:0 24px;font-size:14px;line-height:22px;font-weight:400;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
      '.dsd-body{display:flex;flex-direction:column;gap:12px;margin-top:16px;padding:0 24px}',
      '.dsd-warning{display:flex;align-items:flex-start;gap:10px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}',
      '.dsd-warning-icon{flex:none;margin-top:2px;color:var(--dsw-alias-state-error-primary)}',
      '.dsd-detail{margin:0;padding:0;list-style:none;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;display:flex;flex-direction:column;gap:6px}',
      '.dsd-detail li{display:flex;align-items:flex-start;gap:8px}',
      '.dsd-bullet{flex:none;width:4px;height:4px;margin-top:8px;border-radius:50%;background:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.dsd-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px}',
      '.dsd-pending{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.dsd-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:20px;padding:0 24px}',
      '.dsd-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:36px;border:none;border-radius:var(--dsw-radius-md,8px);cursor:pointer;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);background:transparent;padding:0 14px}',
      '.dsd-button:disabled{cursor:not-allowed;opacity:.4}',
      '.dsd-button:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsd-outline{box-shadow:inset 0 0 0 var(--dsh-hairline-width,.5px) var(--dsh-button-outline-color,var(--dsw-alias-border-l3))}',
      '.dsd-outline:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsd-cancel{min-width:72px}',
      '.dsd-confirm{min-width:136px;color:var(--dsw-alias-state-error-primary)}',
    ].join('')

    function messageOf(error) {
      if (error instanceof Error) return error.message
      return String(error)
    }

    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return undefined
      const units = ['B', 'KB', 'MB', 'GB']
      let value = bytes
      let unit = 0
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit += 1
      }
      const digits = unit === 0 ? 0 : value >= 10 ? 0 : 1
      return `${value.toFixed(digits)} ${units[unit]}`
    }

    function TrashIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M3 4.5h10M6.5 4.5V3.2a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.3M4.55 4.5l.58 8a.9.9 0 0 0 .9.83h4.94a.9.9 0 0 0 .9-.83l.58-8',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
        h('path', {
          d: 'M6.4 7.2v4.2M9.6 7.2v4.2',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.2,
          'stroke-linecap': 'round',
        }),
      )
    }

    function CloseIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M4 4l8 8M12 4l-8 8',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.2,
          'stroke-linecap': 'round',
        }),
      )
    }

    function WarningIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M8 2.6 14.1 13H1.9L8 2.6Z',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.2,
          'stroke-linejoin': 'round',
        }),
        h('path', {
          d: 'M8 6.2v3.4M8 11.5v.01',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.2,
          'stroke-linecap': 'round',
        }),
      )
    }

    return {
      inject: ['slots', 'contextMenus', 'locale', 'sessions', 'workspaces'],
      apply(ctx) {
        //#region host calls
        async function callHost(endpoint, payload) {
          const response = await fetch('api/session-deleter', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint, payload }),
          })
          if (!response.ok) throw new Error(`transport failure: HTTP ${response.status}`)
          const result = await response.json()
          if (result === null || typeof result !== 'object') throw new Error('invalid host response')
          if (result.ok !== true) {
            const failure = result.error !== null && typeof result.error === 'object' ? result.error : {}
            const error = new Error(typeof failure.message === 'string' ? failure.message : 'Host rejected the request.')
            error.code = typeof failure.code === 'string' ? failure.code : 'session-deleter/failed'
            throw error
          }
          return result.value
        }

        async function refreshSessionList() {
          try {
            const sessions = ctx.sessions
            if (sessions !== undefined && typeof sessions.refresh === 'function') await sessions.refresh()
          } catch (error) {
            console.warn('[session-deleter] session list refresh failed:', error)
          }
        }

        function notify(text, success) {
          try {
            ctx.contextMenus.notify(text, success)
          } catch (error) {
            console.warn('[session-deleter] notify failed:', error)
          }
        }

        //#endregion
        //#region delete dialog state
        let dialogState = null
        const dialogListeners = new Set()

        function emit() {
          for (const listener of [...dialogListeners]) {
            try {
              listener()
            } catch (error) {
              console.warn('[session-deleter] dialog listener failed:', error)
            }
          }
        }

        const dialogStore = {
          getSnapshot: () => dialogState,
          subscribe: (listener) => {
            dialogListeners.add(listener)
            return () => {
              dialogListeners.delete(listener)
            }
          },
        }

        function updateDialog(patch) {
          const current = dialogStore.getSnapshot()
          if (current === null) return
          dialogState = { ...current, ...patch }
          emit()
        }

        function closeDialog() {
          dialogState = null
          emit()
        }

        async function loadPlan() {
          const current = dialogStore.getSnapshot()
          if (current === null || current.phase !== 'loading') return
          try {
            const plan = await callHost('plan', { sessionId: current.sessionId })
            updateDialog({ plan, phase: 'ready' })
          } catch (error) {
            updateDialog({ phase: 'failed', error: messageOf(error) })
          }
        }

        function openDialog(request) {
          dialogState = {
            open: true,
            sessionId: request.sessionId,
            displayTitle: request.displayTitle ?? '',
            phase: 'loading',
            plan: null,
            error: null,
          }
          emit()
          void loadPlan()
        }

        async function confirmDelete() {
          const current = dialogStore.getSnapshot()
          if (current === null || current.open !== true || current.phase === 'deleting' || current.phase === 'loading') return
          updateDialog({ phase: 'deleting', error: null })
          try {
            const result = await callHost('delete', { sessionId: current.sessionId })
            await refreshSessionList()
            const title = current.plan?.displayTitle || current.displayTitle || current.sessionId
            notify(t('delete.success', { title }), true)
            if (Array.isArray(result?.deferred) && result.deferred.length > 0) notify(t('delete.deferred'), true)
            closeDialog()
          } catch (error) {
            updateDialog({ phase: 'failed', error: messageOf(error) })
          }
        }

        //#endregion
        //#region delete dialog component
        function ConfirmDialog() {
          const request = React.useSyncExternalStore(dialogStore.subscribe, dialogStore.getSnapshot)
          const closeRef = React.useRef(null)
          const previousFocus = React.useRef(null)
          const open = request !== null && request.open === true
          const phase = request === null ? 'idle' : request.phase
          const busy = phase === 'deleting'

          React.useEffect(() => {
            if (!open) return undefined
            previousFocus.current = document.activeElement
            const target = closeRef.current
            if (target !== null && typeof target.focus === 'function') target.focus({ preventScroll: true })
            return () => {
              const previous = previousFocus.current
              if (previous !== null && typeof previous.focus === 'function') previous.focus({ preventScroll: true })
            }
          }, [open])

          React.useEffect(() => {
            if (!open) return undefined
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return
              const current = dialogStore.getSnapshot()
              if (current !== null && current.phase === 'deleting') return
              event.stopPropagation()
              closeDialog()
            }
            window.addEventListener('keydown', onKeyDown, true)
            return () => window.removeEventListener('keydown', onKeyDown, true)
          }, [open])

          if (!open) return null

          const plan = request.plan
          const title = plan?.displayTitle || request.displayTitle || request.sessionId
          const details = []
          if (plan !== null) {
            if (plan.live === true) details.push(t('delete.running'))
            if (plan.archived === true) details.push(t('delete.archived'))
            if (plan.pinned === true) details.push(t('delete.pinned'))
            if (plan.descendantCount > 0) details.push(t('delete.cascade', { n: String(plan.descendantCount) }))
            const size = formatBytes(plan.sizeBytes)
            if (size !== undefined) details.push(t('delete.size', { size }))
          }

          const body = []
          body.push(
            h(
              'div',
              { key: 'warning', className: 'dsd-warning' },
              h('span', { className: 'dsd-warning-icon' }, h(WarningIcon)),
              h('span', null, t('delete.warning')),
            ),
          )
          body.push(h('div', { key: 'irreversible', className: 'dsd-warning' }, h('span', null, t('delete.irreversible'))))
          if (details.length > 0) {
            body.push(
              h(
                'ul',
                { key: 'details', className: 'dsd-detail' },
                details.map((line, index) =>
                  h('li', { key: String(index) }, h('span', { className: 'dsd-bullet' }), h('span', null, line)),
                ),
              ),
            )
          }
          if (phase === 'loading') body.push(h('div', { key: 'checking', className: 'dsd-pending' }, t('delete.checking')))
          if (phase === 'deleting') body.push(h('div', { key: 'pending', className: 'dsd-pending', role: 'status' }, t('delete.pending')))
          if (request.error !== null) {
            body.push(h('div', { key: 'error', className: 'dsd-error', role: 'alert' }, t('delete.error', { message: request.error })))
          }

          const confirmDisabled = busy || phase === 'loading'
          const confirmLabel = busy ? t('delete.pending') : t('delete.action')

          return h(
            'div',
            {
              className: 'dsd-root',
              onMouseDown: (event) => {
                if (event.target !== event.currentTarget) return
                if (busy) return
                closeDialog()
              },
            },
            h('div', { className: 'dsd-mask' }),
            h(
              'div',
              {
                className: 'dsd-dialog',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'dsd-title',
              },
              h('style', { key: 'style' }, STYLE),
              h(
                'div',
                { className: 'dsd-content' },
                h(
                  'div',
                  { className: 'dsd-header' },
                  h('h2', { className: 'dsd-title', id: 'dsd-title' }, t('delete.title')),
                  h(
                    'button',
                    {
                      type: 'button',
                      ref: closeRef,
                      className: 'dsd-close',
                      'aria-label': t('delete.close'),
                      disabled: busy,
                      onClick: () => closeDialog(),
                    },
                    h(CloseIcon),
                  ),
                ),
                h('p', { className: 'dsd-description' }, t('delete.desc', { title })),
                h('div', { className: 'dsd-body' }, body),
                h(
                  'div',
                  { className: 'dsd-footer' },
                  h(
                    'button',
                    { type: 'button', className: 'dsd-button dsd-outline dsd-cancel', disabled: busy, onClick: () => closeDialog() },
                    t('delete.cancel'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsd-button dsd-outline dsd-confirm',
                      disabled: confirmDisabled,
                      onClick: () => {
                        void confirmDelete()
                      },
                    },
                    confirmLabel,
                  ),
                ),
              ),
            ),
          )
        }

        //#endregion
        //#region registrations
        ctx.effect(() => {
          const disposeZh = ctx.locale.register(NS, 'zh', zh)
          const disposeEn = ctx.locale.register(NS, 'en', en)
          return () => {
            try {
              disposeZh()
            } catch {
              /* already disposed */
            }
            try {
              disposeEn()
            } catch {
              /* already disposed */
            }
          }
        }, 'session-deleter: locale')

        const t = ctx.locale.bind(NS)

        ctx.effect(
          () =>
            ctx.slots.inject('contextMenu.icon', () =>
              ctx.slots.register({
                name: 'contextMenu.icon',
                key: ICON_KEY,
              }, TrashIcon),
            ),
          'session-deleter: trash icon',
        )

        ctx.effect(
          () =>
            ctx.contextMenus.register({
              id: 'session.delete',
              target: 'session',
              order: 601,
              observe: ({ sessionId }) => [ctx.workspaces.list, ctx.sessions.list, ctx.locale],
              // ContextMenuRegistry passes the captured target VALUE here
              // (not the { kind, value } envelope).
              resolve: (value) => {
                const target = value !== null && typeof value === 'object' ? value : {}
                const sessionId = typeof target.sessionId === 'string' ? target.sessionId : ''
                if (sessionId.length === 0) return []
                return [
                  {
                    id: 'delete',
                    label: t('menu.delete'),
                    icon: { key: ICON_KEY },
                    afterContent: true,
                    failureLabel: t('delete.failureLabel'),
                    run: () => {
                      openDialog({
                        sessionId,
                        displayTitle: typeof target.displayTitle === 'string' ? target.displayTitle : '',
                      })
                    },
                  },
                ]
              },
            }),
          'session-deleter: session menu action',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('shell.overlay', () =>
              ctx.slots.register({
                name: 'shell.overlay',
                id: 'session-deleter-confirm',
                order: 900,
              }, ConfirmDialog),
            ),
          'session-deleter: confirm dialog',
        )

        //#endregion
      },
    }
  },
})
