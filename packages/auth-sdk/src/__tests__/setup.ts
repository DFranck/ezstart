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
      const { children, asChild, ...rest } = props as Record<string, unknown> & {
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
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: unknown
    ) => {
      const { variant, size, asChild, children, ...rest } = props
      return React.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  // Form components — use react-hook-form compatible shims
  const Form = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'Form' }, children)
  }

  const FormField = (props: Record<string, unknown>) => {
    const { render, control, name, rules } = props as {
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
    Modal: ({ children, isOpen }: { children?: React.ReactNode; isOpen?: boolean }) => {
      if (!isOpen) return null
      return React.createElement('div', { 'data-testid': 'Modal', role: 'dialog' }, children)
    },
    Sheet: passthrough('Sheet'),
    SheetContent: passthrough('SheetContent'),
    SheetHeader: passthrough('SheetHeader'),
    SheetTitle: passthrough('SheetTitle'),
    Dropdown: ({
      trigger,
      items,
      children,
      ...rest
    }: {
      trigger?: React.ReactNode
      items?: unknown[]
      children?: React.ReactNode
      [key: string]: unknown
    }) => {
      return React.createElement(
        'div',
        { 'data-testid': 'Dropdown' },
        trigger,
        children
      )
    },
    Checkbox: passthrough('Checkbox', 'input'),
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
  }
})

// ---------------------------------------------------------------------------
// Mock @ezstart/ui/lib
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/lib', () => ({
  cn: (...args: unknown[]) =>
    args
      .flat()
      .filter(Boolean)
      .join(' '),
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
