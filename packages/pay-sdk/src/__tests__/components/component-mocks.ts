/**
 * Module mocks for component tests.
 * Components import from @ezstart/ui/components, @ezstart/logger, next/image, etc.
 * We mock these so tests can run in jsdom without the full UI kit.
 */
import { vi } from 'vitest'
import React from 'react'

// ---------------------------------------------------------------------------
// @ezstart/ui/components — pass-through div/span wrappers
// ---------------------------------------------------------------------------

function makePassthrough(name: string, defaultTag = 'div') {
  const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
    ({ children, ...props }, ref) => {
      // Remove non-DOM props
      const { variant, size, layout, hover, dot, pulse, asChild, startIcon, ...domProps } = props
      return React.createElement(defaultTag, { ...domProps, ref, 'data-testid': name }, children)
    }
  )
  Component.displayName = name
  return Component
}

export const uiComponentsMock = {
  Button: makePassthrough('Button', 'button'),
  Card: makePassthrough('Card'),
  CardHeader: makePassthrough('CardHeader'),
  CardContent: makePassthrough('CardContent'),
  CardFooter: makePassthrough('CardFooter'),
  CardTitle: makePassthrough('CardTitle'),
  Div: makePassthrough('Div'),
  H1: makePassthrough('H1', 'h1'),
  H2: makePassthrough('H2', 'h2'),
  H3: makePassthrough('H3', 'h3'),
  P: makePassthrough('P', 'p'),
  Span: makePassthrough('Span', 'span'),
  Label: makePassthrough('Label', 'label'),
  Icon: ({ name, ...props }: { name: string; [k: string]: unknown }) =>
    React.createElement('span', { 'data-testid': 'icon', 'data-icon': name, ...props }),
  Input: React.forwardRef<HTMLInputElement, Record<string, unknown>>(
    ({ startIcon, ...props }, ref) => React.createElement('input', { ...props, ref })
  ),
  Textarea: React.forwardRef<HTMLTextAreaElement, Record<string, unknown>>((props, ref) =>
    React.createElement('textarea', { ...props, ref })
  ),
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    ...props
  }: {
    id?: string
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
    [k: string]: unknown
  }) =>
    React.createElement('input', {
      type: 'checkbox',
      id,
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
      ...props,
    }),
  Badge: makePassthrough('Badge', 'span'),
  Modal: ({
    isOpen,
    onClose,
    children,
    title,
    footer,
    ...props
  }: {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
    footer?: React.ReactNode
    [k: string]: unknown
  }) =>
    isOpen
      ? React.createElement(
          'div',
          { 'data-testid': 'modal', role: 'dialog' },
          title ? React.createElement('h2', null, title) : null,
          children,
          footer
        )
      : null,
  AlertDialog: ({
    open,
    children,
    ...props
  }: {
    open?: boolean
    children: React.ReactNode
    [k: string]: unknown
  }) =>
    open !== false
      ? React.createElement('div', { 'data-testid': 'AlertDialog', ...props }, children)
      : null,
  AlertDialogContent: makePassthrough('AlertDialogContent'),
  AlertDialogHeader: makePassthrough('AlertDialogHeader'),
  AlertDialogTitle: makePassthrough('AlertDialogTitle'),
  AlertDialogDescription: makePassthrough('AlertDialogDescription'),
  AlertDialogFooter: makePassthrough('AlertDialogFooter'),
  Select: makePassthrough('Select'),
  SelectTrigger: makePassthrough('SelectTrigger'),
  SelectContent: makePassthrough('SelectContent'),
  SelectItem: makePassthrough('SelectItem', 'option'),
  SelectValue: makePassthrough('SelectValue'),
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
    [k: string]: unknown
  }) =>
    React.createElement('input', {
      type: 'checkbox',
      role: 'switch',
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
      ...props,
    }),
  Tabs: makePassthrough('Tabs'),
  TabsList: makePassthrough('TabsList'),
  TabsTrigger: makePassthrough('TabsTrigger', 'button'),
  TabsContent: makePassthrough('TabsContent'),
  Separator: () => React.createElement('hr'),
  Skeleton: makePassthrough('Skeleton'),
  SkeletonList: makePassthrough('SkeletonList'),
  SkeletonCard: makePassthrough('SkeletonCard'),
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
  Img: ({ src, alt, ...props }: { src?: string; alt?: string; [k: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
  Code: makePassthrough('Code', 'code'),
  CardDescription: makePassthrough('CardDescription'),
  AlertDialogAction: makePassthrough('AlertDialogAction', 'button'),
  AlertDialogCancel: makePassthrough('AlertDialogCancel', 'button'),
  DataTable: ({ data, columns }: { data: unknown[]; columns: unknown[] }) => {
    // Render cells so row-level assertions work. Each column's `cell` renderer
    // is called with `{ row: { original: dataItem } }`.
    type Col = {
      id?: string
      header?: unknown
      cell?: (ctx: { row: { original: unknown } }) => React.ReactNode
    }
    const cols = (columns ?? []) as Col[]
    return React.createElement(
      'table',
      { 'data-testid': 'data-table' },
      React.createElement(
        'tbody',
        null,
        data.map((item, i) =>
          React.createElement(
            'tr',
            { key: i, 'data-testid': 'data-table-row' },
            cols.map((col, j) =>
              React.createElement(
                'td',
                { key: j },
                typeof col.cell === 'function' ? col.cell({ row: { original: item } }) : null
              )
            )
          )
        )
      )
    )
  },
  DataTableColumnHeader: ({ title }: { title: string; header?: unknown }) =>
    React.createElement('th', null, title),
  InfiniteMovingCards: ({
    children,
  }: {
    children: React.ReactNode
    direction?: string
    speed?: string
    pauseOnHover?: boolean
  }) => React.createElement('div', { 'data-testid': 'infinite-cards' }, children),
  Text: makePassthrough('Text', 'span'),
  // Semantic HTML5 + list elements (used by checkout callback pages)
  Main: makePassthrough('Main', 'main'),
  Section: makePassthrough('Section', 'section'),
  Header: makePassthrough('Header', 'header'),
  Footer: makePassthrough('Footer', 'footer'),
  Article: makePassthrough('Article', 'article'),
  Aside: makePassthrough('Aside', 'aside'),
  Nav: makePassthrough('Nav', 'nav'),
  UL: makePassthrough('UL', 'ul'),
  OL: makePassthrough('OL', 'ol'),
  LI: makePassthrough('LI', 'li'),
  H4: makePassthrough('H4', 'h4'),
  H5: makePassthrough('H5', 'h5'),
  H6: makePassthrough('H6', 'h6'),
  // Templates / generics moved from pay-sdk to @ezstart/ui (PAY_SDK_PHASE_1_MIGRATE-001).
  // The pay-sdk deprecated re-exports forward to these — passthrough shells so tests
  // can render the deprecated wrappers without pulling the real ui implementation.
  PaymentSuccessTemplate: PaymentSuccessTemplateMock,
  SubscribeSuccessTemplate: makeCheckoutCallbackTemplateMock('SubscribeSuccessTemplate'),
  SubscribeCancelTemplate: makeCheckoutCallbackTemplateMock('SubscribeCancelTemplate', true),
  DonateSuccessTemplate: makeCheckoutCallbackTemplateMock('DonateSuccessTemplate'),
  DonateCancelTemplate: makeCheckoutCallbackTemplateMock('DonateCancelTemplate', true),
  PurchaseSuccessTemplate: makeCheckoutCallbackTemplateMock('PurchaseSuccessTemplate'),
  PurchaseCancelTemplate: makeCheckoutCallbackTemplateMock('PurchaseCancelTemplate', true),
  ConfirmActionDialog: ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    variant: _variant,
    autoCloseDelay: _autoCloseDelay,
    texts,
  }: {
    open?: boolean
    onOpenChange?: (v: boolean) => void
    title?: string
    description?: string
    onConfirm?: () => Promise<void>
    variant?: 'destructive' | 'default'
    autoCloseDelay?: number
    texts?: Record<string, string>
  }) => {
    if (open === false) return null
    const confirmLabel = texts?.confirmLabel ?? 'Confirm'
    const cancelLabel = texts?.cancelLabel ?? 'Cancel'
    return React.createElement(
      'div',
      { 'data-testid': 'ConfirmActionDialog', role: 'dialog' },
      title ? React.createElement('h2', null, title) : null,
      description ? React.createElement('p', null, description) : null,
      React.createElement(
        'button',
        { type: 'button', onClick: () => onOpenChange?.(false) },
        cancelLabel
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => {
            void onConfirm?.()
          },
        },
        confirmLabel
      )
    )
  },
  ProductCard: ({
    name,
    description,
    price,
    currency,
    badge,
    type: _type,
    intervalCount,
    actionSlot,
    formatCurrency: _fmt,
    ...rest
  }: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'ProductCard', ...(rest as Record<string, unknown>) },
      badge
        ? React.createElement('span', { 'data-testid': 'ProductCard-badge' }, badge as string)
        : null,
      React.createElement('h3', null, name as string),
      description ? React.createElement('p', null, description as string) : null,
      React.createElement(
        'p',
        null,
        `${price as number} ${(currency as string) ?? 'EUR'}${
          (_type as string) === 'subscription'
            ? ` / ${(intervalCount as number) === 12 ? 'yr' : (intervalCount as number) === 1 ? 'mo' : `${intervalCount as number}mo`}`
            : ''
        }`
      ),
      actionSlot as React.ReactNode
    ),
  ProductGrid: ({
    products,
    actionSlot: _,
    ...rest
  }: {
    products?: Array<Record<string, unknown>>
    actionSlot?: unknown
  } & Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'ProductGrid', ...(rest as Record<string, unknown>) },
      (products ?? []).map((p, i) =>
        React.createElement('div', { key: i, 'data-testid': 'ProductGrid-item' }, p.name as string)
      )
    ),
}

/**
 * Mock for `<PaymentSuccessTemplate>` (the new @ezstart/ui template that
 * replaced pay-sdk's `PaymentSuccessPage`). Pure presentational — always
 * renders the error-state markup since the pay-sdk re-export contract tests
 * only assert that the underlying template surface is composed correctly
 * (label / button forwarding). The full router/auto-redirect behaviour is
 * covered exhaustively by the @ezstart/ui template suite.
 */
function PaymentSuccessTemplateMock(props: Record<string, unknown>) {
  const { fallbackHref, errorMessage, errorButtonText, errorButtonClassName } = props as {
    fallbackHref?: string
    errorMessage?: string
    errorButtonText?: string
    errorButtonClassName?: string
  }
  return React.createElement(
    'div',
    { 'data-testid': 'PaymentSuccessTemplate-error', 'data-fallback-href': fallbackHref ?? '/' },
    React.createElement('p', null, errorMessage ?? 'Payment verification failed'),
    React.createElement(
      'button',
      {
        type: 'button',
        className: errorButtonClassName,
        // No router.push call here — pay-sdk only verifies prop forwarding.
        onClick: () => {},
      },
      errorButtonText ?? 'Go Back'
    )
  )
}

/**
 * Helper — produce a stateless passthrough mock for a checkout callback
 * template. Renders the consumer-provided title / description / CTA labels.
 *
 * Pure presentational — no `useRouter` / `useSearchParams` calls (those would
 * collide with vitest's per-test `vi.mock('next/navigation', ...)` and pick up
 * the REAL next module via require()). The full session_id / auto-redirect
 * behaviour is now covered by the @ezstart/ui template suite directly.
 */
function makeCheckoutCallbackTemplateMock(testid: string, isCancel = false) {
  return function CallbackTemplateMock(props: Record<string, unknown>) {
    const { redirectTo, texts, backToPricingHref, backHomeHref, tryAgainHref } = props as {
      redirectTo?: string
      texts?: Record<string, string | string[]>
      backToPricingHref?: string
      backHomeHref?: string
      tryAgainHref?: string
    }
    const t = (texts ?? {}) as Record<string, string | string[]>
    const fallback: Record<string, string> = {
      title: testid,
      description: '',
      ctaLabel: 'CTA',
      stepsTitle: 'Steps',
      primaryCtaLabel: 'Primary',
      secondaryCtaLabel: 'Secondary',
    }
    const realDefaults = REAL_TEMPLATE_DEFAULTS[testid] ?? {}
    const get = (k: string): string => {
      const v = t[k]
      if (typeof v === 'string') return v
      return realDefaults[k] ?? fallback[k] ?? ''
    }
    const stepsArr: string[] = Array.isArray(t.steps)
      ? (t.steps as string[])
      : (REAL_TEMPLATE_STEPS[testid] ?? [])

    const ctaHrefs: Array<{ href: string; label: string }> = []
    if (isCancel) {
      const primaryHref = backToPricingHref ?? tryAgainHref ?? '/'
      const secondaryHref = backHomeHref ?? '/'
      ctaHrefs.push(
        { href: primaryHref, label: get('primaryCtaLabel') },
        { href: secondaryHref, label: get('secondaryCtaLabel') }
      )
    } else {
      ctaHrefs.push({ href: redirectTo ?? '/', label: get('ctaLabel') })
    }

    return React.createElement(
      'div',
      { 'data-testid': testid },
      React.createElement('h1', null, get('title')),
      React.createElement('p', null, get('description')),
      ...ctaHrefs.map((cta, i) =>
        React.createElement('a', { key: `cta-${i}`, href: cta.href }, cta.label)
      ),
      React.createElement('h3', null, get('stepsTitle')),
      ...stepsArr.map((s, i) => React.createElement('p', { key: `step-${i}` }, s))
    )
  }
}

/**
 * Mirror of the REAL `DEFAULT_TEXTS` in each
 * packages/ui/src/components/checkout-templates/*.tsx — kept here so the mock
 * surfaces the same English defaults when the consumer doesn't override `texts`.
 * KEEP IN SYNC if the real defaults change (low churn — these are landing pages).
 */
const REAL_TEMPLATE_DEFAULTS: Record<string, Record<string, string>> = {
  SubscribeSuccessTemplate: {
    title: 'Subscription Successful!',
    description: 'Your subscription is active and your account has been upgraded.',
    ctaLabel: 'Go to dashboard',
    stepsTitle: 'What happens next?',
    redirectingLabel: 'Redirecting in {seconds}s…',
    referenceLabel: 'Reference: {id}',
  },
  SubscribeCancelTemplate: {
    title: 'Checkout Cancelled',
    description: 'Your subscription was not started. No charges have been made.',
    primaryCtaLabel: 'Back to pricing',
    secondaryCtaLabel: 'Back to home',
    stepsTitle: 'Need help?',
  },
  DonateSuccessTemplate: {
    title: 'Thank You!',
    description:
      'Your donation has been received successfully. Your generosity makes a difference!',
    ctaLabel: 'Back to home',
    stepsTitle: 'What happens next?',
    redirectingLabel: 'Redirecting in {seconds}s…',
    referenceLabel: 'Reference: {id}',
  },
  DonateCancelTemplate: {
    title: 'Payment Cancelled',
    description: 'Your payment was cancelled. No charges have been made.',
    primaryCtaLabel: 'Try Again',
    secondaryCtaLabel: 'Back to Home',
    stepsTitle: 'Need help?',
  },
  PurchaseSuccessTemplate: {
    title: 'Purchase Complete!',
    description: 'Your purchase has been processed successfully. Thank you for your order!',
    ctaLabel: 'Back to home',
    stepsTitle: 'What happens next?',
    redirectingLabel: 'Redirecting in {seconds}s…',
    referenceLabel: 'Reference: {id}',
  },
  PurchaseCancelTemplate: {
    title: 'Payment Cancelled',
    description: 'Your payment was cancelled. No charges have been made.',
    primaryCtaLabel: 'Try Again',
    secondaryCtaLabel: 'Back to Home',
    stepsTitle: 'Need help?',
  },
}

const REAL_TEMPLATE_STEPS: Record<string, string[]> = {
  SubscribeSuccessTemplate: [
    'A receipt has been emailed to you via Stripe.',
    'Your new features and roles have been granted.',
    'Manage your subscription anytime from your account page.',
  ],
  SubscribeCancelTemplate: [
    "Don't worry — no amount has been charged to your account.",
    'If you encountered an issue, please reach out to support.',
  ],
  DonateSuccessTemplate: [
    'A receipt will be sent to your email via Stripe.',
    'Your receipt is available in your Stripe email.',
  ],
  DonateCancelTemplate: [
    "Don't worry, no amount has been charged to your account.",
    'If you encountered an issue, please contact support.',
  ],
  PurchaseSuccessTemplate: [
    'A receipt will be sent to your email via Stripe.',
    'Your access has been granted immediately.',
  ],
  PurchaseCancelTemplate: [
    "Don't worry, no amount has been charged to your account.",
    'If you encountered an issue, please contact support.',
  ],
}

// ---------------------------------------------------------------------------
// @ezstart/logger — silent mock
// ---------------------------------------------------------------------------

export const loggerMock = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  // Used by `useDeprecationWarning` from @ezstart/ui/hooks (see PHASE_1_MIGRATE).
  warnDeprecation: vi.fn(),
}

// ---------------------------------------------------------------------------
// sonner — toast mock
// ---------------------------------------------------------------------------

export const sonnerMock = {
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}

// ---------------------------------------------------------------------------
// @ezstart/ui/utils — toast re-export mock
// ---------------------------------------------------------------------------

export const uiUtilsMock = {
  toast: sonnerMock.toast,
}

// ---------------------------------------------------------------------------
// next/image — simple img tag
// ---------------------------------------------------------------------------

export const nextImageMock = {
  default: ({
    src,
    alt,
    fill,
    ...props
  }: {
    src: string
    alt: string
    fill?: boolean
    [k: string]: unknown
  }) => React.createElement('img', { src, alt, ...props }),
}

// ---------------------------------------------------------------------------
// next/navigation — mock router + searchParams
// ---------------------------------------------------------------------------

export const nextNavigationMock = {
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}
