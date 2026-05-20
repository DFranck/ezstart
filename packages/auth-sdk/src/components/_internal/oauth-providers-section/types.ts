import type { OAuthProviderId } from '../../../core/types.js'

/**
 * One OAuth provider the section can render. When the provider id has
 * `comingSoon: true` the row is rendered in a disabled state so the user
 * sees that future support is on the roadmap.
 *
 * @internal
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

/**
 * All user-facing strings used by the section. English defaults provided.
 *
 * @internal
 */
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

/** @internal */
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

/** @internal */
export const OAUTH_PROVIDERS_SECTION_DEFAULT_TEXTS: OAuthProvidersSectionTexts = {
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

/**
 * Default provider roster the section ships with.
 *
 * @internal
 */
export const DEFAULT_OAUTH_PROVIDERS: OAuthProvidersSectionProvider[] = [
  { id: 'google', label: 'Google', icon: 'lucide:Mail' },
  { id: 'github', label: 'GitHub', icon: 'lucide:Github', comingSoon: true },
  { id: 'discord', label: 'Discord', icon: 'lucide:MessageCircle', comingSoon: true },
  { id: 'microsoft', label: 'Microsoft', icon: 'lucide:Building2', comingSoon: true },
]

/**
 * Strip a trailing `/api/auth` (or `/api`) suffix from the SDK-internal client
 * URL so the OAuth endpoint can re-append `/api/auth/<provider>`.
 *
 * Mirrors the helper used by `<OAuthButtons>` for consistency. Kept private
 * here to avoid cross-component coupling.
 *
 * @internal
 */
export function normalizeOAuthBase(url: string): string {
  let base = url
  if (base.endsWith('/api/auth')) {
    base = base.slice(0, -'/api/auth'.length)
  } else if (base.endsWith('/api')) {
    base = base.slice(0, -'/api'.length)
  }
  if (base.endsWith('/')) base = base.slice(0, -1)
  return base
}

/** @internal */
export function formatOAuthDate(iso: string): string {
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

/** @internal */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
