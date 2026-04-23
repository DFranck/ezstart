'use client'

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  H3,
  Icon,
  P,
} from '@ezstart/ui/components'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Why the pay-sdk component is rendering its fallback instead of the real UI.
 *
 * - `missing-key` — `NEXT_PUBLIC_EZPAY_KEY` / `applicationId` is missing or
 *   empty; the provider cannot resolve the app context.
 * - `resolve-failed` — `/keys/config` returned an error (network, 5xx, etc.)
 *   so `applicationResolutionStatus` landed on `'failed'`.
 * - `fetch-failed` — a downstream query (donations, payments, plans, etc.)
 *   failed with a browser-level network error (offline / CORS / ECONNREFUSED).
 * - `invalid-key` — a downstream call returned 401/403 (key revoked, wrong
 *   env, permission denied).
 */
export type PayNotConfiguredReason =
  | 'missing-key'
  | 'resolve-failed'
  | 'fetch-failed'
  | 'invalid-key'

export interface PayNotConfiguredTexts {
  /** Card title. */
  title?: string
  /** Supporting description shown below the title. */
  description?: string
  /** CTA button label. Only used when `dashboardUrl` is set. */
  cta?: string
}

export interface PayNotConfiguredCardProps {
  /**
   * Why the fallback is rendering. Controls the icon + default copy.
   */
  reason: PayNotConfiguredReason
  /**
   * Full URL to the ezpay developer portal where a new publishable key can
   * be created (e.g. `https://ezpay.ezstart.xyz/en/developer`). When omitted
   * the card renders without the CTA button (still informative).
   */
  dashboardUrl?: string
  /**
   * Override the default English copy. All keys optional — missing keys fall
   * back to the reason-specific defaults.
   */
  texts?: PayNotConfiguredTexts
  /** Additional CSS class applied to the outer Card. */
  className?: string
  /**
   * Visual variant:
   * - `default` — full Card with header, description, CTA footer.
   * - `compact` — single-row inline banner (for embedding in tight layouts).
   */
  variant?: 'default' | 'compact'
  /**
   * When `true`, the card is NOT shown in production for the `fetch-failed`
   * reason — end-users don't need to know the dev misconfigured something.
   * Defaults to `true` for `fetch-failed`, `false` for the other reasons
   * (which indicate a permanent config problem worth surfacing).
   */
  silentInProduction?: boolean
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS_BY_REASON: Record<PayNotConfiguredReason, Required<PayNotConfiguredTexts>> = {
  'missing-key': {
    title: 'Payments not configured',
    description:
      'This feature needs an EZPay publishable key. Create one in the developer portal to continue.',
    cta: 'Get your key',
  },
  'resolve-failed': {
    title: 'Could not load payments context',
    description:
      'We could not verify your EZPay publishable key. Refresh the page or create a new key if the problem persists.',
    cta: 'Open developer portal',
  },
  'fetch-failed': {
    title: 'Payments service unreachable',
    description:
      'We could not reach the EZPay API. Check your connection or verify the service is running.',
    cta: 'Open developer portal',
  },
  'invalid-key': {
    title: 'Payments key rejected',
    description:
      'Your EZPay publishable key is invalid or revoked. Create a new key in the developer portal.',
    cta: 'Create a new key',
  },
}

const ICON_BY_REASON = {
  'missing-key': 'lucide:KeyRound',
  'resolve-failed': 'lucide:AlertTriangle',
  'fetch-failed': 'lucide:WifiOff',
  'invalid-key': 'lucide:ShieldAlert',
} as const satisfies Record<PayNotConfiguredReason, string>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default behaviour for each reason. Keeps `fetch-failed` silent in prod
 * (transient infra issue) while making config errors loud.
 */
function shouldSilenceInProd(reason: PayNotConfiguredReason): boolean {
  return reason === 'fetch-failed'
}

/**
 * @internal Used by other pay-sdk components to classify an error thrown by a
 * hook / client call. Returns `null` when the error does not match any known
 * pattern (caller can decide to still surface it).
 */
export function classifyPayError(error: unknown): PayNotConfiguredReason | null {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (!message) return null
  const lower = message.toLowerCase()
  if (/(invalid.*key|unauthori[sz]ed|forbidden|401|403)/.test(lower)) {
    return 'invalid-key'
  }
  if (/(failed to fetch|networkerror|network error|econnrefused|cors)/.test(lower)) {
    return 'fetch-failed'
  }
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Graceful fallback rendered by pay-sdk components when the SDK is
 * unconfigured, its context failed to resolve, or a downstream fetch
 * failed. Mirrors the auth-sdk `<DevModeBanner>` pattern.
 *
 * Always renders semantic tokens (`bg-card`, `text-muted-foreground`, …)
 * so both light + dark modes work out of the box. Uses `@ezstart/ui`
 * primitives exclusively — zero native HTML.
 *
 * @example
 * ```tsx
 * <PayNotConfiguredCard
 *   reason="missing-key"
 *   dashboardUrl="https://ezpay.ezstart.xyz/en/developer"
 * />
 * ```
 */
export function PayNotConfiguredCard({
  reason,
  dashboardUrl,
  texts,
  className,
  variant = 'default',
  silentInProduction,
}: PayNotConfiguredCardProps) {
  // Silent-in-prod gate: transient network failures should not scare users.
  // Defaults to `true` for `fetch-failed`, `false` for permanent config
  // errors. Consumers can override either way via the `silentInProduction`
  // prop.
  const silence = silentInProduction ?? shouldSilenceInProd(reason)
  if (silence && process.env.NODE_ENV === 'production') {
    return (
      <PayTransientPlaceholder
        className={className}
        variant={variant}
        description={texts?.description}
      />
    )
  }

  const defaults = DEFAULTS_BY_REASON[reason]
  const title = texts?.title ?? defaults.title
  const description = texts?.description ?? defaults.description
  const cta = texts?.cta ?? defaults.cta
  const iconName = ICON_BY_REASON[reason]

  if (variant === 'compact') {
    return (
      <Card className={`${className ?? ''}`} variant="outline">
        <CardContent className="py-3">
          <Div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              <Icon
                name={iconName}
                className="w-5 h-5 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <Div className="min-w-0">
                <P className="text-sm font-medium text-foreground">{title}</P>
                <P className="text-xs text-muted-foreground mt-0.5">{description}</P>
              </Div>
            </Div>
            {dashboardUrl && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                  {cta}
                </a>
              </Button>
            )}
          </Div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className ?? ''}`} variant="outline">
      <CardHeader className="items-center text-center">
        <Div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Icon name={iconName} className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
        </Div>
        <H3>{title}</H3>
      </CardHeader>
      <CardContent className="text-center">
        <P className="text-sm text-muted-foreground max-w-md mx-auto">{description}</P>
      </CardContent>
      {dashboardUrl && (
        <CardFooter className="justify-center">
          <Button asChild variant="default">
            <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="lucide:ExternalLink" className="w-4 h-4" aria-hidden="true" />
              {cta}
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * Minimal placeholder rendered in production when the reason is flagged as
 * silent (typically `fetch-failed`). Users only see a muted "temporarily
 * unavailable" message instead of a scary red error.
 */
function PayTransientPlaceholder({
  className,
  variant,
  description,
}: {
  className?: string
  variant: 'default' | 'compact'
  description?: string
}) {
  const fallbackDescription = description ?? 'Temporarily unavailable.'

  if (variant === 'compact') {
    return (
      <Div className={`text-xs text-muted-foreground ${className ?? ''}`}>
        {fallbackDescription}
      </Div>
    )
  }

  return (
    <Card className={`${className ?? ''}`} variant="ghost">
      <CardContent className="py-6 text-center">
        <P className="text-sm text-muted-foreground">{fallbackDescription}</P>
      </CardContent>
    </Card>
  )
}
