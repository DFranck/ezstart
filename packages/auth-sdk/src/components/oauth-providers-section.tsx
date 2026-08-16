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
import type { ConnectedOAuthProvider } from '../core/types.js'
import {
  DEFAULT_OAUTH_PROVIDERS,
  OAUTH_PROVIDERS_SECTION_DEFAULT_TEXTS,
  interpolate,
  normalizeOAuthBase,
  type OAuthProvidersSectionProps,
  type OAuthProvidersSectionProvider,
  type OAuthProvidersSectionTexts,
} from './_internal/oauth-providers-section/types.js'
import { ProviderRow } from './_internal/oauth-providers-section/ProviderRow.js'

export { DEFAULT_OAUTH_PROVIDERS } from './_internal/oauth-providers-section/types.js'
export type {
  OAuthProvidersSectionProps,
  OAuthProvidersSectionTexts,
  OAuthProvidersSectionProvider,
} from './_internal/oauth-providers-section/types.js'

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
  const texts: OAuthProvidersSectionTexts = {
    ...OAUTH_PROVIDERS_SECTION_DEFAULT_TEXTS,
    ...textOverrides,
  }
  const { data: providers, isLoading, isError } = useOAuthProviders(true)

  const [pendingDisconnect, setPendingDisconnect] = useState<OAuthProvidersSectionProvider | null>(
    null
  )
  const [redirectingProviderId, setRedirectingProviderId] = useState<string | null>(null)

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
    if (!resolvedApiUrl || redirectingProviderId) return
    setRedirectingProviderId(provider.id)
    const base = normalizeOAuthBase(resolvedApiUrl)
    const params = new URLSearchParams({
      app: resolvedAppName,
      intent: 'link',
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    })
    // Full page redirect — leave the loading state set; the next render after
    // the OAuth round-trip will be a fresh component instance.
    window.location.href = `${base}/api/auth/${encodeURIComponent(provider.id)}?${params.toString()}`
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
            <Spinner variant="primary" size="default" />
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
            {visibleProviders.map(provider => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                linked={connectedById.get(provider.id)}
                texts={texts}
                isPending={disconnect.isPending && pendingDisconnect?.id === provider.id}
                isRedirecting={redirectingProviderId === provider.id}
                onDisconnect={setPendingDisconnect}
                onConnect={handleConnect}
              />
            ))}
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
