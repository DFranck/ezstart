'use client'

import { Badge, Button, Div, Icon, Span, Spinner } from '@ezstart/ui/components'
import type { ConnectedOAuthProvider } from '../../../core/types.js'
import {
  formatOAuthDate,
  type OAuthProvidersSectionProvider,
  type OAuthProvidersSectionTexts,
} from './types.js'

/** @internal */
export interface ProviderRowProps {
  provider: OAuthProvidersSectionProvider
  linked: ConnectedOAuthProvider | undefined
  texts: OAuthProvidersSectionTexts
  isPending: boolean
  isRedirecting: boolean
  onDisconnect: (provider: OAuthProvidersSectionProvider) => void
  onConnect: (provider: OAuthProvidersSectionProvider) => void
}

/** Status badge for a single provider row. @internal */
function ProviderStatusBadge({
  provider,
  linked,
  texts,
}: Pick<ProviderRowProps, 'provider' | 'linked' | 'texts'>) {
  if (provider.comingSoon) {
    return (
      <Badge variant="outline" size="xs">
        {texts.comingSoon}
      </Badge>
    )
  }
  if (linked) {
    return (
      <Badge variant="success" size="xs">
        {texts.connected}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" size="xs">
      {texts.notConnected}
    </Badge>
  )
}

/** CTA button for a single provider row (connect / disconnect / coming soon). @internal */
function ProviderRowAction({
  provider,
  linked,
  texts,
  isPending,
  isRedirecting,
  onDisconnect,
  onConnect,
}: ProviderRowProps) {
  if (provider.comingSoon) {
    return (
      <Button variant="outline" size="sm" disabled>
        {texts.connect}
      </Button>
    )
  }
  if (linked) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        disabled={isPending}
        onClick={() => onDisconnect(provider)}
      >
        {isPending ? <Spinner size="sm" /> : texts.disconnect}
      </Button>
    )
  }
  return (
    <Button
      variant="default"
      size="sm"
      className="cursor-pointer"
      disabled={isRedirecting}
      aria-busy={isRedirecting}
      onClick={() => onConnect(provider)}
    >
      {isRedirecting ? <Spinner size="sm" /> : texts.connect}
    </Button>
  )
}

/**
 * A single provider row in the "Connected accounts" list — icon, label,
 * status badge, optional linked-account metadata, and the connect/disconnect
 * action.
 *
 * @internal
 */
export function ProviderRow(props: ProviderRowProps) {
  const { provider, linked } = props
  return (
    <Div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <Div className="flex items-center gap-3 min-w-0">
        <Icon
          name={(provider.icon ?? 'lucide:KeyRound') as 'lucide:Key'}
          className="h-5 w-5 shrink-0 text-muted-foreground"
        />
        <Div className="min-w-0">
          <Div className="flex items-center gap-2 flex-wrap">
            <Span className="text-sm font-medium text-foreground truncate">{provider.label}</Span>
            <ProviderStatusBadge provider={provider} linked={linked} texts={props.texts} />
          </Div>
          {linked && (
            <Div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              <Span className="text-xs text-muted-foreground truncate">{linked.email}</Span>
              <Span className="text-xs text-muted-foreground">
                {formatOAuthDate(linked.connectedAt)}
              </Span>
            </Div>
          )}
        </Div>
      </Div>

      <ProviderRowAction {...props} />
    </Div>
  )
}
