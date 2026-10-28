import { Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, type UserSession } from '../../api'
import { HeaderData } from '../../components/header/headerData'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Toast, type ToastMessage } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/items'
import { describeDevice, formatDateTime } from '../../lib/sessions'

const messages: Record<string, string> = {
  not_found: 'That session had already ended.',
  current_session: 'To end this session, log out instead.',
  unauthenticated: 'Your session expired. Sign in again.',
}

async function errorFrom(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return messages[body.error ?? ''] ?? 'Something went wrong. Please try again.'
}

export function Sessions() {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // One revoke at a time: the id in flight, or null.
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.api.sessions.$get()
      if (!res.ok) throw new Error('request failed')
      setSessions((await res.json()).sessions)
    } catch {
      setLoadError('We could not load your sessions. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const current = sessions.find((s) => s.current)
  const others = sessions.filter((s) => !s.current)

  async function handleRevoke(session: UserSession) {
    setRevokingId(session.id)
    try {
      const res = await api.api.sessions[':id'].$delete({ param: { id: session.id } })
      // A 404 means it is already gone — expired, or ended from another device.
      // Either way the row should leave the list, so only other failures stop here.
      if (!res.ok && res.status !== 404) {
        setToast({ text: await errorFrom(res), kind: 'error' })
        return
      }
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
      setToast({ text: `Signed out ${describeDevice(session.userAgent).label}.`, kind: 'success' })
    } catch {
      setToast({ text: 'Could not reach the server.', kind: 'error' })
    } finally {
      setRevokingId(null)
    }
  }

  async function handleRevokeOthers() {
    setBusy(true)
    try {
      const res = await api.api.sessions.$delete()
      if (!res.ok) {
        setToast({ text: await errorFrom(res), kind: 'error' })
        return
      }
      const { revoked } = await res.json()
      setSessions((prev) => prev.filter((s) => s.current))
      setConfirmAll(false)
      setToast({
        text: `Signed out of ${revoked} other ${revoked === 1 ? 'session' : 'sessions'}.`,
        kind: 'success',
      })
    } catch {
      setToast({ text: 'Could not reach the server.', kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderData />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Active sessions
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Everywhere your account is signed in right now. Sign out of any device you do not
              recognise.
            </p>
          </div>
          {!loading && !loadError && others.length > 0 && (
            <button type="button" className="btn-quiet-danger" onClick={() => setConfirmAll(true)}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out other sessions
            </button>
          )}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              title="Could not load your sessions"
              message={loadError}
              onRetry={() => void load()}
            />
          ) : (
            <div className="flex flex-col gap-8">
              {current && (
                <section aria-labelledby="current-session">
                  <h2 id="current-session" className="text-xs font-medium text-ink-soft">
                    This device
                  </h2>
                  <SessionRow session={current} className="mt-3" />
                </section>
              )}

              <section aria-labelledby="other-sessions">
                <h2 id="other-sessions" className="text-xs font-medium text-ink-soft">
                  Other sessions <span className="text-ink-faint">{others.length}</span>
                </h2>
                {others.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={ShieldCheck}
                      title="No other sessions"
                      message="You are only signed in on this device."
                    />
                  </div>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {others.map((session) => (
                      <li key={session.id}>
                        <SessionRow
                          session={session}
                          revoking={revokingId === session.id}
                          disabled={revokingId !== null || busy}
                          onRevoke={() => void handleRevoke(session)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <Modal
        open={confirmAll}
        title="Sign out other sessions?"
        onClose={() => setConfirmAll(false)}
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          The{' '}
          <span className="font-medium text-ink">
            {others.length} other {others.length === 1 ? 'session' : 'sessions'}
          </span>{' '}
          listed here are signed out right away. You stay signed in on this device.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn-outline"
            onClick={() => setConfirmAll(false)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-quiet-danger"
            onClick={() => void handleRevokeOthers()}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            Sign out
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function SessionRow({
  session,
  className,
  revoking = false,
  disabled = false,
  onRevoke,
}: {
  session: UserSession
  className?: string
  revoking?: boolean
  disabled?: boolean
  onRevoke?: () => void
}) {
  const device = describeDevice(session.userAgent)
  const Icon = device.icon

  return (
    <article className={cn('animate-fade-in card flex items-center gap-4 p-4', className)}>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft"
        aria-hidden="true"
      >
        <Icon className="size-5 text-accent" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-ink">{device.label}</h3>
          {session.current && (
            <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              This device
            </span>
          )}
        </div>
        <dl className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
          <div>
            <dt className="sr-only">Signed in</dt>
            <dd>
              Signed in{' '}
              <time dateTime={session.createdAt}>{formatDateTime(session.createdAt)}</time>
            </dd>
          </div>
          <span className="text-line" aria-hidden="true">
            •
          </span>
          <div>
            <dt className="sr-only">Expires</dt>
            <dd>
              Expires <time dateTime={session.expiresAt}>{formatDate(session.expiresAt)}</time>
            </dd>
          </div>
        </dl>
      </div>

      {onRevoke && (
        <button
          type="button"
          className="btn-outline shrink-0 px-3 py-2 text-xs"
          onClick={onRevoke}
          disabled={disabled}
          aria-busy={revoking}
        >
          {revoking ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-3.5" aria-hidden="true" />
          )}
          Sign out
          <span className="sr-only"> {device.label}</span>
        </button>
      )}
    </article>
  )
}

function RowSkeleton() {
  return (
    <div className="card flex animate-pulse items-center gap-4 p-4">
      <div className="size-10 rounded-lg bg-line-soft" />
      <div className="flex-1">
        <div className="h-4 w-2/5 rounded bg-line-soft" />
        <div className="mt-2 h-3 w-3/5 rounded bg-line-soft" />
      </div>
    </div>
  )
}
