/**
 * Host half of the session deleter.
 *
 * Owns one authenticated Connection RPC channel and the deletion engine:
 * a conversation row menu action asks this half to (1) stop all of its running
 * work, (2) remove the durable session directory, (3) drop the projection-cache
 * record, and (4) remove the session from the workspace accounting registries.
 * Live Sessions finalize the cache and archive/pin flags after `session/disposed`,
 * because the projection cache rewrites its row during disposal; a startup sweep
 * reconciles anything a crash or a second client left behind.
 */
import { rm } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

/** Private authenticated API route; only this profile's plugin registers it. */
const ROUTE_PATH = '/api/session-deleter'
/** Session ids are one safe path segment: UUIDs or the legacy `session-<uuid>` spelling. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/
/** Wait briefly after `session/disposed` so the projection cache's own detach write lands first. */
const FINALIZE_DELAY_MS = 250
/** Reconcile stale accounting/cache records once, well after session restore. */
const SWEEP_DELAY_MS = 5000

export const inject = [
  'connection',
  'workspaceRegistry',
  'sessionPersistence',
  'sessions',
  'storageDomain',
]

/** An unexpected on-disk session directory shape; deletion refuses instead of guessing. */
class SessionDeleterShapeError extends Error {
  constructor(directory) {
    super(`refusing to delete unexpected session directory '${directory}'`)
    this.name = 'SessionDeleterShapeError'
  }
}

/** One failed deletion step; the RPC result names it in `details.step`. */
class SessionDeleterStepError extends Error {
  constructor(step, cause) {
    super(`${step} failed: ${messageOf(cause)}`)
    this.name = 'SessionDeleterStepError'
    this.step = step
    this.cause = cause
  }
}

function messageOf(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function isUnknownSessionError(error) {
  return error instanceof Error && error.name === 'WorkspaceUnknownSessionError'
}

function success(value) {
  return { ok: true, value }
}

function failure(code, message, details = {}) {
  return { ok: false, error: { code, message, details } }
}

export function apply(ctx) {
  /** Sessions whose post-disposal cleanup is owed. */
  const pendingFinalize = new Set()
  /** Top-level deletions currently running, keyed by session id. */
  const inFlight = new Set()

  const warn = (message) => {
    try {
      ctx.logger?.warn?.(`session-deleter: ${message}`)
    } catch {
      /* logging must never break deletion */
    }
  }


  //#region read helpers

  function readSessionId(payload) {
    const value = payload !== null && typeof payload === 'object' ? payload.sessionId : undefined
    if (typeof value !== 'string') return undefined
    if (value.length === 0 || value.length > 200) return undefined
    if (value === '.' || value === '..') return undefined
    if (!SESSION_ID_PATTERN.test(value)) return undefined
    return value
  }

  async function statSession(id) {
    return await ctx.sessionPersistence.stat(id)
  }

  function workspacesOf(id) {
    return ctx.workspaceRegistry.list().filter((workspace) => workspace.sessionIds.includes(id))
  }

  function registrationFlags(id) {
    const registry = ctx.workspaceRegistry
    return {
      archived: registry.archivedSessionIds.includes(id),
      pinned: registry.pinnedSessionIds.includes(id),
    }
  }

  async function readTitle(id, signal) {
    const query = ctx.get('sessionQuery')
    if (query === undefined || typeof query.readTitle !== 'function') return undefined
    try {
      const snapshot = await query.readTitle(id, signal)
      return snapshot !== null && typeof snapshot === 'object' && typeof snapshot.title === 'string' ? snapshot.title : undefined
    } catch {
      return undefined
    }
  }

  /** Subagent-origin descendant Sessions, deepest information unknown, so callers delete reversed. */
  async function listDescendants(id, signal) {
    const subagents = ctx.get('subagents')
    if (subagents === undefined || typeof subagents.listDescendants !== 'function') return []
    try {
      const entries = await subagents.listDescendants(id, signal)
      if (!Array.isArray(entries)) return []
      return entries
        .map((entry) => (entry !== null && typeof entry === 'object' ? entry.sessionId ?? entry.id : undefined))
        .filter((value) => typeof value === 'string' && value.length > 0 && value !== id)
    } catch (error) {
      warn(`descendant lookup for '${id}' failed: ${messageOf(error)}`)
      return []
    }
  }

  async function buildPlan(id, signal) {
    const live = ctx.sessions.get(id)
    const snapshot = await statSession(id)
    const flags = registrationFlags(id)
    const attached = workspacesOf(id)
    const known = live !== undefined || snapshot !== undefined || flags.archived || flags.pinned || attached.length > 0
    if (!known) return undefined
    const descendants = await listDescendants(id, signal)
    return {
      sessionId: id,
      displayTitle: await readTitle(id, signal),
      live: live !== undefined,
      archived: flags.archived,
      pinned: flags.pinned,
      materialized: typeof snapshot?.location?.path === 'string',
      sizeBytes: typeof snapshot?.sizeBytes === 'number' ? snapshot.sizeBytes : undefined,
      descendantCount: descendants.length,
      descendants,
    }
  }

  //#endregion
  //#region deletion steps

  async function stopAndHide(id, warnings) {
    try {
      await ctx.workspaceRegistry.archiveSession(id, { stopActivity: true })
    } catch (error) {
      if (!isUnknownSessionError(error)) warnings.push(`archive: ${messageOf(error)}`)
    }
    try {
      await ctx.parallel('workspace/session-stop', { sessionId: id })
    } catch (error) {
      warnings.push(`stop: ${messageOf(error)}`)
    }
  }

  async function flushLive(id, warnings) {
    const live = ctx.sessions.get(id)
    if (live === undefined) return
    try {
      await ctx.sessions.flush(live)
    } catch (error) {
      warnings.push(`flush: ${messageOf(error)}`)
    }
  }

  async function detachAccounting(id, warnings) {
    let workspaces
    try {
      workspaces = workspacesOf(id)
    } catch (error) {
      warnings.push(`accounting lookup: ${messageOf(error)}`)
      return
    }
    for (const workspace of workspaces) {
      try {
        if (typeof workspace.detachSession === 'function') {
          await workspace.detachSession(id)
          continue
        }
        const domain = ctx.storageDomain.get('workspace')
        const table = domain !== undefined ? domain.table('workspaces') : undefined
        if (table === undefined) throw new Error('workspace domain is unavailable')
        const key = String(workspace.id)
        await table.update(key, (current) => ({
          ...current,
          sessionIds: current.sessionIds.filter((value) => value !== id),
          updatedAt: new Date().toISOString(),
        }))
      } catch (error) {
        warnings.push(`accounting: ${messageOf(error)}`)
      }
    }
  }

  async function removeArtifacts(id) {
    const snapshot = await statSession(id)
    const logPath = snapshot?.location?.path
    if (typeof logPath !== 'string' || logPath.length === 0) return 0
    const directory = dirname(logPath)
    if (basename(directory) !== id) throw new SessionDeleterShapeError(directory)
    await rm(directory, { recursive: true, force: true })
    return typeof snapshot.sizeBytes === 'number' ? snapshot.sizeBytes : 0
  }

  async function deleteProjectionCache(id, warnings) {
    try {
      const domain = ctx.storageDomain.get('session_projcache')
      const table = domain !== undefined ? domain.table('sessions') : undefined
      if (table === undefined) return
      await table.delete(id)
    } catch (error) {
      warnings.push(`projection cache: ${messageOf(error)}`)
    }
  }

  async function clearRegistration(id, warnings) {
    try {
      await ctx.workspaceRegistry.unarchiveSession(id)
    } catch (error) {
      warnings.push(`unarchive: ${messageOf(error)}`)
    }
    try {
      await ctx.workspaceRegistry.unpinSession(id)
    } catch (error) {
      warnings.push(`unpin: ${messageOf(error)}`)
    }
  }

  async function finalize(id, warnings) {
    pendingFinalize.delete(id)
    await detachAccounting(id, warnings)
    await deleteProjectionCache(id, warnings)
    await clearRegistration(id, warnings)
  }

  async function deleteOne(id, warnings) {
    await stopAndHide(id, warnings)
    await flushLive(id, warnings)
    await detachAccounting(id, warnings)
    let bytesFreed
    try {
      bytesFreed = await removeArtifacts(id)
    } catch (error) {
      throw new SessionDeleterStepError('artifacts', error)
    }
    // The projection cache is derived state: drop it now. A live Session that
    // disposes later writes its row once more, and the disposal finalize removes it again.
    await deleteProjectionCache(id, warnings)
    if (ctx.sessions.get(id) === undefined) {
      await finalize(id, warnings)
      return { bytesFreed, deferred: false }
    }
    // A third-party plugin cannot remove a live Session from the store; keep it
    // archived (hidden) until `session/disposed` or the startup sweep reconciles
    // the archive/pin registrations.
    pendingFinalize.add(id)
    return { bytesFreed, deferred: true }
  }

  //#endregion
  //#region RPC surface

  async function deleteSessions(id, signal) {
    if (inFlight.has(id)) {
      return failure('session-deleter/busy', 'Another deletion for this session is already running.', { sessionId: id })
    }
    inFlight.add(id)
    try {
      const plan = await buildPlan(id, signal)
      if (plan === undefined) {
        return failure('session-deleter/not-found', 'Session not found.', { sessionId: id })
      }
      const warnings = []
      const deleted = []
      const deferred = []
      let bytesFreed = 0
      for (let index = plan.descendants.length - 1; index >= 0; index -= 1) {
        const childId = plan.descendants[index]
        try {
          const outcome = await deleteOne(childId, warnings)
          deleted.push(childId)
          if (outcome.deferred) deferred.push(childId)
          bytesFreed += outcome.bytesFreed
        } catch (error) {
          warnings.push(`${childId}: ${messageOf(error)}`)
        }
      }
      const outcome = await deleteOne(id, warnings)
      deleted.push(id)
      if (outcome.deferred) deferred.push(id)
      bytesFreed += outcome.bytesFreed
      return success({ deleted, deferred, warnings, bytesFreed })
    } catch (error) {
      // Completed steps stay completed; the failure names the step for a retry.
      return failure('session-deleter/failed', messageOf(error), {
        sessionId: id,
        step: error instanceof SessionDeleterStepError ? error.step : 'delete',
      })
    } finally {
      inFlight.delete(id)
    }
  }

  function handleRequest(endpoint, payload, signal) {
    if (endpoint === 'plan') {
      const id = readSessionId(payload)
      if (id === undefined) return failure('session-deleter/invalid', 'Invalid sessionId.')
      return buildPlan(id, signal).then((plan) => {
        if (plan === undefined) return failure('session-deleter/not-found', 'Session not found.', { sessionId: id })
        return success(plan)
      }, (error) => failure('session-deleter/failed', messageOf(error), { sessionId: id, step: 'plan' }))
    }
    if (endpoint === 'delete') {
      const id = readSessionId(payload)
      if (id === undefined) return failure('session-deleter/invalid', 'Invalid sessionId.')
      return deleteSessions(id, signal)
    }
    return failure('session-deleter/invalid', `Unknown endpoint '${String(endpoint)}'.`)
  }

  // Exact Fetch route inside the Connection authentication fence: a browser
  // cookie admits the request as the owner Peer; API Peers are refused before
  // this route runs, so the destructive action stays a local-operator action.
  ctx.inject(['connection'], (scope) => {
    scope.effect(
      () =>
        scope.connection.fetch.register({
          path: ROUTE_PATH,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request) => {
            let body
            try {
              body = await request.json()
            } catch {
              return Response.json(failure('session-deleter/invalid', 'Request body is not JSON.'))
            }
            const endpoint = body !== null && typeof body === 'object' && typeof body.endpoint === 'string' ? body.endpoint : ''
            const payload = body !== null && typeof body === 'object' ? body.payload : undefined
            const result = await Promise.resolve(handleRequest(endpoint, payload, request.signal))
            return Response.json(result)
          },
        }),
      'session-deleter: authenticated API route',
    )
  })

  //#endregion
  //#region deferred finalize and startup sweep

  function scheduleFinalize(id) {
    setTimeout(() => {
      const warnings = []
      void finalize(id, warnings).then(
        () => {
          if (warnings.length > 0) warn(`finalize '${id}': ${warnings.join('; ')}`)
        },
        (error) => warn(`finalize '${id}' failed: ${messageOf(error)}`),
      )
    }, FINALIZE_DELAY_MS)
  }

  ctx.effect(
    () =>
      ctx.on('session/disposed', (session) => {
        const id = session !== null && typeof session === 'object' ? String(session.id) : undefined
        if (id === undefined || !pendingFinalize.has(id)) return
        pendingFinalize.delete(id)
        scheduleFinalize(id)
      }),
    'session-deleter: disposed finalize',
  )

  async function sweepOrphans() {
    let snapshots
    try {
      snapshots = await ctx.sessionPersistence.list()
    } catch (error) {
      warn(`startup sweep skipped: session list failed: ${messageOf(error)}`)
      return
    }
    const known = new Set()
    for (const session of ctx.sessions.list()) known.add(String(session.id))
    for (const snapshot of snapshots) {
      const id = snapshot?.header?.id
      if (typeof id === 'string') known.add(id)
    }

    const registry = ctx.workspaceRegistry
    for (const id of [...registry.archivedSessionIds]) {
      if (known.has(String(id))) continue
      try {
        await registry.unarchiveSession(id)
      } catch (error) {
        warn(`sweep unarchive '${String(id)}': ${messageOf(error)}`)
      }
    }
    for (const id of [...registry.pinnedSessionIds]) {
      if (known.has(String(id))) continue
      try {
        await registry.unpinSession(id)
      } catch (error) {
        warn(`sweep unpin '${String(id)}': ${messageOf(error)}`)
      }
    }

    try {
      const domain = ctx.storageDomain.get('session_projcache')
      const table = domain !== undefined ? domain.table('sessions') : undefined
      if (table !== undefined) {
        const stale = [...table.keys()].filter((key) => !known.has(String(key)))
        if (stale.length > 0) await table.deleteMany(stale)
      }
    } catch (error) {
      warn(`sweep projection cache: ${messageOf(error)}`)
    }

    let workspaces = []
    try {
      workspaces = registry.list()
    } catch (error) {
      warn(`sweep workspace list: ${messageOf(error)}`)
    }

    // Read the durable records, not the filtered entity getter, so stale ids that
    // the registry already prunes from view are still removed from the accounting.
    let records = new Map()
    try {
      const domain = ctx.storageDomain.get('workspace')
      const table = domain !== undefined ? domain.table('workspaces') : undefined
      if (table !== undefined) records = new Map(table.entries())
    } catch (error) {
      warn(`sweep workspace records: ${messageOf(error)}`)
    }

    for (const workspace of workspaces) {
      if (typeof workspace.detachSession !== 'function') continue
      const key = String(workspace.id)
      const record = records.get(key)
      const sessionIds = record !== undefined && Array.isArray(record.sessionIds) ? record.sessionIds : workspace.sessionIds
      const stale = sessionIds.filter((id) => !known.has(String(id)) && !pendingFinalize.has(String(id)))
      for (const id of stale) {
        try {
          await workspace.detachSession(String(id))
        } catch (error) {
          warn(`sweep accounting '${String(id)}': ${messageOf(error)}`)
        }
      }
    }
  }

  ctx.effect(() => {
    const timer = setTimeout(() => {
      void sweepOrphans().catch((error) => warn(`startup sweep failed: ${messageOf(error)}`))
    }, SWEEP_DELAY_MS)
    return () => clearTimeout(timer)
  }, 'session-deleter: startup sweep')

  //#endregion
}
