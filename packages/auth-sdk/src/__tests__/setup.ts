import * as matchers from '@testing-library/jest-dom/matchers'
import { expect, vi } from 'vitest'

expect.extend(matchers)

// ---------------------------------------------------------------------------
// Mock @ezstart/config/urls
// ---------------------------------------------------------------------------
vi.mock('@ezstart/config/urls', () => ({
  getApiUrl: vi.fn((_app: string) => 'http://localhost:6110'),
  getWebUrl: vi.fn((_app: string) => 'http://localhost:6111'),
  getCurrentEnvironment: vi.fn(() => 'local'),
  isEzstartDomain: vi.fn(() => false),
}))

vi.mock('@ezstart/config', () => ({
  getApiUrl: vi.fn((_app: string) => 'http://localhost:6110'),
  getWebUrl: vi.fn((_app: string) => 'http://localhost:6111'),
  getCurrentEnvironment: vi.fn(() => 'local'),
  isEzstartDomain: vi.fn(() => false),
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/api-sdk
// ---------------------------------------------------------------------------
vi.mock('@ezstart/api-sdk', () => {
  class MockApiError extends Error {
    status: number
    code?: string
    constructor(message: string, status = 400, code?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
    static isApiError(err: unknown): err is MockApiError {
      return err instanceof MockApiError
    }
  }
  return {
    apiCall: vi.fn(),
    ApiError: MockApiError,
    parseApiError: vi.fn((result: Record<string, unknown>) => {
      if (typeof result?.error === 'string') return result.error
      if (typeof result?.message === 'string') return result.message
      return 'Unknown error'
    }),
  }
})

// ---------------------------------------------------------------------------
// Mock @ezstart/logger
// ---------------------------------------------------------------------------
vi.mock('@ezstart/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/ui/components (render as simple HTML elements)
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/components', () => {
  const React = require('react')

  const passthrough = (displayName: string, tag = 'div') => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const {
        children,
        asChild: _asChild,
        ...rest
      } = props as Record<string, unknown> & {
        children?: React.ReactNode
        asChild?: boolean
      }
      // Strip non-DOM props
      const domProps: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rest)) {
        if (
          typeof v !== 'function' ||
          k.startsWith('on') ||
          k === 'onClick' ||
          k === 'onChange' ||
          k === 'onSubmit'
        ) {
          // Keep string/number/boolean and event handlers
          if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean' ||
            typeof v === 'function' ||
            v == null
          ) {
            domProps[k] = v
          }
        }
      }
      return React.createElement(tag, { ...domProps, ref, 'data-testid': displayName }, children)
    })
    Comp.displayName = displayName
    return Comp
  }

  const Input = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    const { ...rest } = props
    return React.createElement('input', { ...rest, ref })
  })
  Input.displayName = 'Input'

  const PasswordInput = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return React.createElement('input', { ...props, ref, type: 'password' })
  })
  PasswordInput.displayName = 'PasswordInput'

  const Button = React.forwardRef(
    (props: Record<string, unknown> & { children?: React.ReactNode }, ref: unknown) => {
      const { variant, size: _size, asChild: _asChild, children, ...rest } = props
      return React.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  // Form components — use react-hook-form compatible shims
  const Form = ({
    children,
    ..._props
  }: Record<string, unknown> & { children?: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'Form' }, children)
  }

  const FormField = (props: Record<string, unknown>) => {
    const {
      render,
      control: _control,
      name,
      rules: _rules,
    } = props as {
      render: (arg: { field: Record<string, unknown> }) => React.ReactNode
      control?: unknown
      name?: string
      rules?: unknown
    }
    if (typeof render === 'function') {
      return render({
        field: {
          name: name || '',
          value: '',
          onChange: vi.fn(),
          onBlur: vi.fn(),
          ref: vi.fn(),
        },
      })
    }
    return null
  }

  const FormItem = passthrough('FormItem')
  const FormLabel = passthrough('FormLabel', 'label')
  const FormControl = passthrough('FormControl')
  const FormMessage = passthrough('FormMessage')

  return {
    Button,
    Input,
    PasswordInput,
    Div: passthrough('Div'),
    P: passthrough('P', 'p'),
    Span: passthrough('Span', 'span'),
    H1: passthrough('H1', 'h1'),
    H2: passthrough('H2', 'h2'),
    H3: passthrough('H3', 'h3'),
    H4: passthrough('H4', 'h4'),
    H5: passthrough('H5', 'h5'),
    H6: passthrough('H6', 'h6'),
    Label: passthrough('Label', 'label'),
    Card: passthrough('Card'),
    CardHeader: passthrough('CardHeader'),
    CardContent: passthrough('CardContent'),
    CardFooter: passthrough('CardFooter'),
    Badge: passthrough('Badge', 'span'),
    Icon: passthrough('Icon', 'span'),
    Spinner: passthrough('Spinner', 'span'),
    Modal: ({
      children,
      isOpen,
      footer,
      title,
      description,
    }: {
      children?: React.ReactNode
      isOpen?: boolean
      footer?: React.ReactNode
      title?: React.ReactNode
      description?: React.ReactNode
    }) => {
      if (!isOpen) return null
      return React.createElement(
        'div',
        { 'data-testid': 'Modal', role: 'dialog' },
        title != null && React.createElement('div', { 'data-testid': 'ModalTitle' }, title),
        description != null &&
          React.createElement('div', { 'data-testid': 'ModalDescription' }, description),
        children,
        footer != null && React.createElement('div', { 'data-testid': 'ModalFooter' }, footer)
      )
    },
    Sheet: passthrough('Sheet'),
    SheetContent: passthrough('SheetContent'),
    SheetHeader: passthrough('SheetHeader'),
    SheetTitle: passthrough('SheetTitle'),
    Dropdown: ({
      trigger,
      items: _items,
      children,
      ..._rest
    }: {
      trigger?: React.ReactNode
      items?: unknown[]
      children?: React.ReactNode
      [key: string]: unknown
    }) => {
      return React.createElement('div', { 'data-testid': 'Dropdown' }, trigger, children)
    },
    Checkbox: passthrough('Checkbox', 'input'),
    Switch: React.forwardRef(
      (
        props: Record<string, unknown> & { onCheckedChange?: (v: boolean) => void },
        ref: unknown
      ) => {
        const { onCheckedChange, checked, ...rest } = props
        const domProps: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(rest)) {
          if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean' ||
            v == null
          ) {
            domProps[k] = v
          }
        }
        return React.createElement('input', {
          ...domProps,
          type: 'checkbox',
          checked: !!checked,
          onChange: (e: { target: { checked: boolean } }) => onCheckedChange?.(e.target.checked),
          'data-testid': 'Switch',
          ref,
        })
      }
    ),
    Skeleton: passthrough('Skeleton'),
    AlertDialog: passthrough('AlertDialog'),
    AlertDialogAction: passthrough('AlertDialogAction', 'button'),
    AlertDialogCancel: passthrough('AlertDialogCancel', 'button'),
    AlertDialogContent: passthrough('AlertDialogContent'),
    AlertDialogDescription: passthrough('AlertDialogDescription'),
    AlertDialogFooter: passthrough('AlertDialogFooter'),
    AlertDialogHeader: passthrough('AlertDialogHeader'),
    AlertDialogTitle: passthrough('AlertDialogTitle'),
    DataTable: passthrough('DataTable'),
    DataTableColumnHeader: passthrough('DataTableColumnHeader'),
    DesignTokenProvider: passthrough('DesignTokenProvider'),
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Select: passthrough('Select'),
    SelectTrigger: passthrough('SelectTrigger'),
    SelectValue: passthrough('SelectValue'),
    SelectContent: passthrough('SelectContent'),
    SelectItem: passthrough('SelectItem'),
    Code: passthrough('Code', 'code'),
    CardTitle: passthrough('CardTitle'),
    CardDescription: passthrough('CardDescription'),
    Textarea: passthrough('Textarea', 'textarea'),
    Tabs: passthrough('Tabs'),
    TabsList: passthrough('TabsList'),
    TabsTrigger: passthrough('TabsTrigger', 'button'),
    TabsContent: passthrough('TabsContent'),
    ChartContainer: passthrough('ChartContainer'),
    ChartTooltip: passthrough('ChartTooltip'),
    ChartTooltipContent: passthrough('ChartTooltipContent'),
    // ── Migrated UI primitives (formerly in @ezstart/auth-sdk) ──────────────
    // Each renders the underlying semantic markup the deprecated re-export
    // wrappers expect (role="alert", data-scope, etc.).
    PasswordStrength: ({
      password,
      texts,
    }: {
      password: string
      texts?: { weak?: string; fair?: string; good?: string; strong?: string }
    }) => {
      if (!password) return null
      // Mirror the score logic from the real implementation so consumers can
      // assert the rendered label.
      let score = 0
      if (password.length >= 6) score++
      if (password.length >= 10) score++
      if (password.length >= 14) score++
      if (/[a-z]/.test(password)) score++
      if (/[A-Z]/.test(password)) score++
      if (/[0-9]/.test(password)) score++
      if (/[^a-zA-Z0-9]/.test(password)) score++
      let label: 'weak' | 'fair' | 'good' | 'strong'
      if (score <= 2) label = 'weak'
      else if (score <= 4) label = 'fair'
      else if (score <= 5) label = 'good'
      else label = 'strong'
      const dict: Record<typeof label, string> = {
        weak: texts?.weak ?? 'Weak',
        fair: texts?.fair ?? 'Fair',
        good: texts?.good ?? 'Good',
        strong: texts?.strong ?? 'Strong',
      }
      return React.createElement('p', { 'data-testid': 'PasswordStrength' }, dict[label])
    },
    ErrorAlert: ({
      children,
      className,
      texts,
    }: {
      children?: React.ReactNode
      className?: string
      texts?: { ariaLabel?: string }
    }) =>
      React.createElement(
        'div',
        {
          role: 'alert',
          'aria-label': texts?.ariaLabel ?? 'Error',
          className: ['bg-destructive/15', className].filter(Boolean).join(' '),
        },
        children
      ),
    ProgressBadge: ({
      usage,
      variant,
      texts,
      label,
      className,
      ariaLabel,
    }: {
      usage: { used: number; limit: number | null }
      variant?: 'default' | 'compact'
      threshold?: { warning: number; danger: number }
      texts?: { unlimited?: string }
      label?: React.ReactNode
      className?: string
      ariaLabel?: string
    }) => {
      if (usage.limit === null) {
        return React.createElement(
          'span',
          { 'data-testid': 'ProgressBadge', className },
          texts?.unlimited ?? 'Unlimited'
        )
      }
      const percentage =
        usage.limit > 0
          ? Math.min(100, Math.max(0, Math.round((usage.used / usage.limit) * 100)))
          : 0
      const labelNode = label ?? `${String(percentage)}%`
      if (variant === 'compact') {
        return React.createElement(
          'span',
          {
            'data-testid': 'ProgressBadge',
            className,
            'aria-label': ariaLabel ?? `${String(percentage)}%`,
          },
          labelNode
        )
      }
      return React.createElement(
        'div',
        { 'data-testid': 'ProgressBadge', className },
        React.createElement('div', {
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': percentage,
          'aria-label': ariaLabel ?? `${String(percentage)}%`,
        }),
        React.createElement('span', null, labelNode)
      )
    },
    MaintenanceBanner: ({
      status,
      texts,
      className,
      sticky,
    }: {
      status?: {
        enabled?: boolean
        message?: string
        startedAt?: string | null
        scheduledEnd?: string | null
      } | null
      texts?: { heading?: string; scheduledEndLabel?: string }
      className?: string
      sticky?: boolean
    }) => {
      if (!status?.enabled) return null
      return React.createElement(
        'div',
        {
          role: 'alert',
          'data-testid': 'MaintenanceBanner',
          'data-sticky': sticky ? 'true' : 'false',
          className,
        },
        React.createElement('p', null, texts?.heading ?? 'Scheduled maintenance in progress'),
        status.message ? React.createElement('p', null, status.message) : null
      )
    },
    ScopeContextSwitcher: ({
      scope,
      canSwitchToAdmin,
      switchPath,
      LinkComponent,
      texts,
      className,
    }: {
      scope: 'user' | 'admin'
      canSwitchToAdmin: boolean
      switchPath: string
      LinkComponent?: React.ComponentType<{
        href: string
        children: React.ReactNode
        className?: string
      }>
      texts?: {
        userMode?: string
        adminMode?: string
        switchToAdmin?: string
        switchToUser?: string
      }
      className?: string
    }) => {
      const isAdmin = scope === 'admin'
      const badgeLabel = isAdmin
        ? (texts?.adminMode ?? 'Platform admin')
        : (texts?.userMode ?? 'Personal account')
      const toggleLabel = isAdmin
        ? (texts?.switchToUser ?? 'Switch to personal')
        : (texts?.switchToAdmin ?? 'Switch to admin')
      const ResolvedLink =
        LinkComponent ??
        (({ href, children: c }: { href: string; children: React.ReactNode }) =>
          React.createElement('a', { href }, c))
      return React.createElement(
        'span',
        { 'data-scope': scope, className },
        React.createElement('span', { 'aria-label': badgeLabel }, badgeLabel),
        canSwitchToAdmin
          ? React.createElement(ResolvedLink, { href: switchPath }, toggleLabel)
          : null
      )
    },
  }
})

// ---------------------------------------------------------------------------
// Mock @ezstart/ui/hooks
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/hooks', () => ({
  useDeprecationWarning: vi.fn(),
  useClickOutside: vi.fn(),
  useDevice: vi.fn(),
  useInView: vi.fn(),
  useOnScroll: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/api-sdk/integrations (TurnstileWidget moved here 2026-05-01)
// ---------------------------------------------------------------------------
vi.mock('@ezstart/api-sdk/integrations', () => {
  const React = require('react')
  return {
    TurnstileWidget: ({
      siteKey,
      className,
    }: {
      siteKey?: string
      onSuccess?: (token: string) => void
      onError?: (err: unknown) => void
      onExpired?: () => void
      theme?: 'light' | 'dark' | 'auto'
      appearance?: 'always' | 'execute' | 'interaction-only'
      className?: string
      logger?: { warn: (msg: string, data?: unknown) => void }
    }) => {
      if (!siteKey) return null
      return React.createElement('div', {
        'data-testid': 'TurnstileWidget',
        'data-sitekey': siteKey,
        className,
      })
    },
  }
})

// ---------------------------------------------------------------------------
// Mock @ezstart/api-sdk/react (useMaintenanceStatus moved here 2026-05-01)
// ---------------------------------------------------------------------------
vi.mock('@ezstart/api-sdk/react', () => ({
  useMaintenanceStatus: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  createApiQuery: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/ui/lib
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/lib', () => ({
  cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/ui/utils
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/utils', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock next-intl
// ---------------------------------------------------------------------------
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
  useTranslations: vi.fn(() => (key: string) => key),
}))

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
}))

// ---------------------------------------------------------------------------
// Mock next/link
// ---------------------------------------------------------------------------
vi.mock('next/link', () => {
  const React = require('react')
  return {
    default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
      React.createElement('a', { href, ...props }, children),
  }
})

// ---------------------------------------------------------------------------
// Mock sonner
// ---------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/capture-sdk
// ---------------------------------------------------------------------------
vi.mock('@ezstart/capture-sdk', () => ({
  ImageCropper: () => null,
}))

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------
globalThis.fetch = vi.fn()

// ---------------------------------------------------------------------------
// BroadcastChannel mock
// ---------------------------------------------------------------------------
class MockBroadcastChannel {
  name: string
  onmessage: ((event: { data: unknown }) => void) | null = null
  constructor(name: string) {
    this.name = name
  }
  postMessage(_data: unknown) {}
  close() {}
}

globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel
