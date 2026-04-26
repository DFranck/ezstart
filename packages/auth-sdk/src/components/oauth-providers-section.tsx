'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuthContext } from '../react/auth-provider.js'
import { useDisconnectOAuthProvider, useOAuthProviders } from '../react/oauth-providers.js'
import type { ConnectedOAuthProvider, OAuthProviderId } from '../core/types.js'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * One OAuth provider the section can render. When the provider id has
 * `comingSoon: true` the row is rendered in a disabled state so the user
 * sees that future support is on the roadmap.
 */
export interface OAuthProvidersSectionProvider {
  id: OAuthProviderId | string
  /** Display label, already localized when needed. */
  label: string
  /** Lucide icon name (e.g. `'lucide:Github'`). Falls back to a generic icon. */
  icon?: string
  /** When `true` the provider is rendered as disabled / coming soon. */
  comingSoon?: boolean
}

/** All user-facing strings used by the section. English defaults provided. */
export interface OAuthProvidersSectionTexts {
  title: string
  description: string
  connected: string
  notConnected: string
  connect: string
  disconnect: string
  disconnecting: string
  comingSoon: string
  /** Title of the destructive confirm dialog. `{provider}` is replaced. */
  confirmDisconnectTitle: string
  /** Description of the destructive confirm dialog. `{provider}` is replaced. */
  confirmDisconnectDescription: string
  cancel: string
  /** Toast on successful disconnect. `{provider}` is replaced. */
  disconnectSuccess: string
  /** Toast prefix on disconnect failure (the API error message is appended). */
  disconnectError: string
  /** Toast on the 409 last-method case. */
  cannotDisconnectLastMethod: string
  /** Empty state subtitle when no providers are configured + none connected. */
  noProvidersAvailable: string
  /** Label of the loading spinner. */
  loading: string
}

export interface OAuthProvidersSectionProps {
  /**
   * App name forwarded to the OAuth start endpoint. Used to scope the OAuth
   * code returned to the consumer app. Defaults to the surrounding
   * `<AuthProvider>` `appName`.
   */
  appName?: string
  /**
   * Where the OAuth callback should send the user once linking is complete.
   * Defaults to the current origin's `/auth/callback` path.
   */
  redirectUri?: string
  /**
   * The list of providers the section can show. Future-proof — pass the full
   * roster (Google, GitHub, Discord, Microsoft, …) and flip `comingSoon`
   * once a provider is enabled server-side.
   */
  availableProviders?: OAuthProvidersSectionProvider[]
  /**
   * When `true` (default), providers in `availableProviders` flagged as
   * `comingSoon` are still rendered (with a disabled CTA + badge). Set to
   * `false` to hide them entirely.
   */
  showComingSoon?: boolean
  /** Override any subset of the English defaults. */
  texts?: Partial<OAuthProvidersSectionTexts>
  /** Optional className applied to the outer Card. */
  className?: string
  /**
   * EZAuth API base URL used to start the OAuth flow. Falls back to the
   * surrounding `<AuthProvider>` configuration, then `window.location.origin`.
   */
  apiUrl?: string
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: OAuthProvidersSectionTexts = {
  title: 'Connected accounts',
  description: 'Sign in faster by linking your favorite identity providers.',
  connected: 'Connected',
  notConnected: 'Not connected',
  connect: 'Connect',
  disconnect: 'Disconnect',
  disconnecting: 'Disconnecting…',
  comingSoon: 'Coming soon',
  confirmDisconnectTitle: 'Disconnect {provider}?',
  confirmDisconnectDescription:
    'You will no longer be able to sign in with {provider}. You can reconnect it at any time.',
  cancel: 'Cancel',
  disconnectSuccess: '{provider} has been disconnected.',
  disconnectError: 'Failed to disconnect {provider}',
  cannotDisconnectLastMethod:
    'This is the only way to sign in. Set a password before disconnecting it.',
  noProvidersAvailable: 'No identity providers are available yet.',
  loading: 'Loading providers…',
}

/** Default provider roster the section ships with. */
export const DEFAULT_OAUTH_PROVIDERS: OAuthProvidersSectionProvider[] = [
  { id: 'google', label: 'Google', icon: 'lucide:Mail' },
  { id: 'github', label: 'GitHub', icon: 'lucide:Github', comingSoon: true },
  { id: 'discord', label: 'Discord', icon: 'lucide:MessageCircle', comingSoon: true },
  { id: 'microsoft', label: 'Microsoft', icon: 'lucide:Building2', comingSoon: true },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip a trailing `/api/auth` (or `/api`) suffix from the SDK-internal client
 * URL so the OAuth endpoint can re-append `/api/auth/<provider>`.
 *
 * Mirrors the helper used by `<OAuthButtons>` for consistency. Kept private
 * here to avoid cross-component coupling.
 *
 * @internal
 */
function normalizeOAuthBase(url: string): string {
  let base = url
  if (base.endsWith('/api/auth')) {
    base = base.slice(0, -'/api/auth'.length)
  } else if (base.endsWith('/api')) {
    base = base.slice(0, -'/api'.length)
  }
  if (base.endsWith('/')) base = base.slice(0, -1)
  return base
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * "Connected accounts" card that lets a signed-in user manage their OAuth
 * provider links (Google today; GitHub / Discord / Microsoft are surfaced as
 * `comingSoon` placeholders so consumers see the roadmap without wiring
 * anything new).
 *
 * - `Connect` → redirects to `<api>/api/auth/<provider>?app=…&intent=link&redirect_uri=…`
 * - `Disconnect` → confirms via `<AlertDialog>`, then calls
 *   `DELETE /api/auth/me/oauth-providers/:provider`. The 409 "last login
 *   method" response is mapped to a friendly toast.
 *
 * The component is fully `texts`-driven and ships English defaults — pass
 * translated strings from `next-intl` (or any i18n library) via the `texts`
 * prop.
 *
 * @example
 * ```tsx
 * <OAuthProvidersSection
 *   appName="myapp"
 *   texts={{
 *     title: t('oauthProviders.title'),
 *     description: t('oauthProviders.description'),
 *     // ...
 *   }}
 * />
 * ```
 */
export function OAuthProvidersSection({
  appName,
  redirectUri,
  availableProviders = DEFAULT_OAUTH_PROVIDERS,
  showComingSoon = true,
  texts: textOverrides,
  className,
  apiUrl,
}: OAuthProvidersSectionProps) {
  const texts: OAuthProvidersSectionTexts = { ...DEFAULT_TEXTS, ...textOverrides }
  const { data: providers, isLoading, isError } = useOAuthProviders(true)

  const [pendingDisconnect, setPendingDisconnect] = useState<OAuthProvidersSectionProvider | null>(
    null
  )

  // Surrounding AuthProvider is optional — the OAuthButtons pattern: try the
  // hook, fall back to nothing and resolve via window.origin at click time.
  let providerApiUrl: string | undefined
  let providerAppName: string | undefined
  try {
    const ctx = useAuthContext()
    providerApiUrl = ctx.client.getApiUrl()
    providerAppName = ctx.appName
  } catch {
    providerApiUrl = undefined
    providerAppName = undefined
  }

  const resolvedApiUrl =
    apiUrl ?? providerApiUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
  const resolvedAppName = appName ?? providerAppName ?? 'ezauth'

  const disconnect = useDisconnectOAuthProvider({
    onSuccess: () => {
      const label = pendingDisconnect?.label ?? ''
      toast.success(interpolate(texts.disconnectSuccess, { provider: label }))
      setPendingDisconnect(null)
    },
    onError: (err: Error & { status?: number }) => {
      const label = pendingDisconnect?.label ?? ''
      // The hook layer surfaces ApiError instances with `status` populated.
      if (err.status === 409) {
        toast.error(texts.cannotDisconnectLastMethod)
      } else {
        toast.error(`${interpolate(texts.disconnectError, { provider: label })}: ${err.message}`)
      }
      setPendingDisconnect(null)
    },
  })

  const connectedById = useMemo(() => {
    const map = new Map<string, ConnectedOAuthProvider>()
    for (const p of providers ?? []) map.set(p.provider, p)
    return map
  }, [providers])

  const handleConnect = (provider: OAuthProvidersSectionProvider): void => {
    if (!resolvedApiUrl) return
    const base = normalizeOAuthBase(resolvedApiUrl)
    const params = new URLSearchParams({
      app: resolvedAppName,
      intent: 'link',
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    })
    window.location.href = `${base}/api/auth/${encodeURIComponent(
      provider.id
    )}?${params.toString()}`
  }

  const visibleProviders = availableProviders.filter(p => showComingSoon || !p.comingSoon)

  return (
    <Card className={className}>
      <CardHeader>
        <Div className="flex items-center gap-2">
          <Icon name="lucide:Link" className="h-5 w-5 text-primary" />
          <H3 className="text-base font-semibold text-foreground">{texts.title}</H3>
        </Div>
        <P className="text-sm text-muted-foreground mt-1">{texts.description}</P>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Div className="flex items-center justify-center py-6">
            <Spinner variant="primary" size="md" />
            <Span className="ml-2 text-sm text-muted-foreground">{texts.loading}</Span>
          </Div>
        ) : isError ? (
          <Div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {texts.disconnectError.replace('{provider}', '')}
          </Div>
        ) : visibleProviders.length === 0 ? (
          <P className="text-sm text-muted-foreground py-2">{texts.noProvidersAvailable}</P>
        ) : (
          <Div className="space-y-3">
            {visibleProviders.map(provider => {
              const linked = connectedById.get(provider.id)
              const isPending = disconnect.isPending && pendingDisconnect?.id === provider.id

              return (
                <Div
                  key={provider.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <Div className="flex items-center gap-3 min-w-0">
                    <Icon
                      name={(provider.icon ?? 'lucide:KeyRound') as 'lucide:Key'}
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                    />
                    <Div className="min-w-0">
                      <Div className="flex items-center gap-2 flex-wrap">
                        <Span className="text-sm font-medium text-foreground truncate">
                          {provider.label}
                        </Span>
                        {provider.comingSoon ? (
                          <Badge variant="outline" size="xs">
                            {texts.comingSoon}
                          </Badge>
                        ) : linked ? (
                          <Badge variant="success" size="xs">
                            {texts.connected}
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="xs">
                            {texts.notConnected}
                          </Badge>
                        )}
                      </Div>
                      {linked && (
                        <Div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          <Span className="text-xs text-muted-foreground truncate">
                            {linked.email}
                          </Span>
                          <Span className="text-xs text-muted-foreground">
                            {formatDate(linked.connectedAt)}
                          </Span>
                        </Div>
                      )}
                    </Div>
                  </Div>

                  {provider.comingSoon ? (
                    <Button variant="outline" size="sm" disabled>
                      {texts.connect}
                    </Button>
                  ) : linked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      disabled={isPending}
                      onClick={() => setPendingDisconnect(provider)}
                    >
                      {isPending ? <Spinner size="sm" /> : texts.disconnect}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleConnect(provider)}
                    >
                      {texts.connect}
                    </Button>
                  )}
                </Div>
              )
            })}
          </Div>
        )}
      </CardContent>

      <AlertDialog
        variant="destructive"
        open={pendingDisconnect !== null}
        onOpenChange={next => {
          if (disconnect.isPending) return
          if (!next) setPendingDisconnect(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {interpolate(texts.confirmDisconnectTitle, {
                provider: pendingDisconnect?.label ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {interpolate(texts.confirmDisconnectDescription, {
                provider: pendingDisconnect?.label ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>{texts.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnect.isPending}
              onClick={event => {
                event.preventDefault()
                if (pendingDisconnect) {
                  disconnect.mutate(pendingDisconnect.id)
                }
              }}
            >
              {disconnect.isPending ? (
                <>
                  <Icon name="lucide:Loader2" className="mr-1.5 h-4 w-4 animate-spin" />
                  {texts.disconnecting}
                </>
              ) : (
                texts.disconnect
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
