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
