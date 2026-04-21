import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'

// ---------------------------------------------------------------------------
// Override the shared @ezstart/ui/components mock to include Tabs primitives.
// The root setup.ts mock doesn't include Tabs (this is the first SDK test
// using them), so we re-declare the full lightweight mock locally and add
// Tabs/TabsList/TabsTrigger/TabsContent.
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/components', () => {
  const React = require('react')

  const passthrough = (displayName: string, tag = 'div') => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const {
        children,
        asChild: _asChild,
        ...rest
      } = props as Record<string, unknown> & { children?: React.ReactNode; asChild?: boolean }
      const domProps: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rest)) {
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
      return React.createElement(tag, { ...domProps, ref, 'data-testid': displayName }, children)
    })
    Comp.displayName = displayName
    return Comp
  }

  const Input = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return React.createElement('input', { ...props, ref })
  })
  Input.displayName = 'Input'

  const Button = React.forwardRef(
    (props: Record<string, unknown> & { children?: React.ReactNode }, ref: unknown) => {
      const { variant, size, asChild: _asChild, children, ...rest } = props
      return React.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  const Textarea = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return React.createElement('textarea', { ...props, ref })
  })
  Textarea.displayName = 'Textarea'

  return {
    Button,
    Input,
    Textarea,
    Div: passthrough('Div'),
    P: passthrough('P', 'p'),
    Span: passthrough('Span', 'span'),
    H1: passthrough('H1', 'h1'),
    H2: passthrough('H2', 'h2'),
    H3: passthrough('H3', 'h3'),
    Label: passthrough('Label', 'label'),
    Card: passthrough('Card'),
    CardHeader: passthrough('CardHeader'),
    CardContent: passthrough('CardContent'),
    CardFooter: passthrough('CardFooter'),
    CardTitle: passthrough('CardTitle'),
    CardDescription: passthrough('CardDescription'),
    Badge: passthrough('Badge', 'span'),
    Skeleton: passthrough('Skeleton'),
    Tabs: passthrough('Tabs'),
    TabsList: passthrough('TabsList'),
    TabsTrigger: passthrough('TabsTrigger', 'button'),
    TabsContent: passthrough('TabsContent'),
    AlertDialog: passthrough('AlertDialog'),
    AlertDialogAction: passthrough('AlertDialogAction', 'button'),
    AlertDialogCancel: passthrough('AlertDialogCancel', 'button'),
    AlertDialogContent: passthrough('AlertDialogContent'),
    AlertDialogDescription: passthrough('AlertDialogDescription'),
    AlertDialogFooter: passthrough('AlertDialogFooter'),
    AlertDialogHeader: passthrough('AlertDialogHeader'),
    AlertDialogTitle: passthrough('AlertDialogTitle'),
  }
})

// ---------------------------------------------------------------------------
// Mock DeveloperPortal (embedded in the API Keys tab) to isolate this suite
// from the DeveloperPortal hook graph.
// ---------------------------------------------------------------------------
vi.mock('../../../components/developer/DeveloperPortal.js', () => ({
  DeveloperPortal: ({ applicationId }: { applicationId: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'DeveloperPortal', 'data-app-id': applicationId },
      'DeveloperPortal'
    ),
}))

// ---------------------------------------------------------------------------
// Mock applications hooks
// ---------------------------------------------------------------------------
const mockUseApplication = vi.fn()
const mockUseUpdateApplication = vi.fn()
const mockUseRevokeApplication = vi.fn()

vi.mock('../../../react/applications.js', () => ({
  useMyApplications: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useApplication: (...args: unknown[]) => mockUseApplication(...args),
  useResolveApplicationByKey: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
  useCreateApplication: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateApplication: (...args: unknown[]) => mockUseUpdateApplication(...args),
  useRevokeApplication: (...args: unknown[]) => mockUseRevokeApplication(...args),
}))

const { ApplicationDetailView } =
  await import('../../../components/applications/ApplicationDetailView.js')

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  description: 'Acme description',
  ownerId: 'user_1',
  status: 'active',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const defaultUpdate = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

const defaultRevoke = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
}

interface SetupArgs {
  data?: Application | null
  isLoading?: boolean
  isError?: boolean
  update?: typeof defaultUpdate
  revoke?: typeof defaultRevoke
}

function setup(overrides: SetupArgs = {}) {
  mockUseApplication.mockReturnValue({
    data: overrides.data === undefined ? fakeApp : overrides.data,
    isLoading: overrides.isLoading ?? false,
    isError: overrides.isError ?? false,
    refetch: vi.fn(),
  })
  mockUseUpdateApplication.mockReturnValue(overrides.update ?? defaultUpdate)
  mockUseRevokeApplication.mockReturnValue(overrides.revoke ?? defaultRevoke)
}

describe('ApplicationDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setup()
  })

  it('renders loading skeletons while fetching', () => {
    setup({ data: null, isLoading: true })
    const { container } = render(<ApplicationDetailView applicationId="app_1" />)
    const skeletons = container.querySelectorAll('[data-testid="Skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error state with retry when fetch fails', () => {
    setup({ data: null, isError: true })
    render(<ApplicationDetailView applicationId="app_1" />)
    expect(screen.getByText('Failed to load application')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('renders the same error/empty state when data is null', () => {
    setup({ data: null })
    render(<ApplicationDetailView applicationId="app_1" />)
    expect(screen.getByText('Failed to load application')).toBeTruthy()
  })

  it('renders both tabs when data is present', () => {
    setup({ data: fakeApp })
    render(<ApplicationDetailView applicationId="app_1" />)
    // Tabs triggers
    expect(screen.getByText('API Keys')).toBeTruthy()
    // "Settings" appears twice (tab trigger + card title) — assert at least one
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1)
  })

  it('calls update.mutate with trimmed name on Save', () => {
    const mutate = vi.fn()
    setup({
      data: fakeApp,
      update: { ...defaultUpdate, mutate },
    })
    render(<ApplicationDetailView applicationId="app_1" />)

    const nameInput = document.getElementById('detail-name') as HTMLInputElement
    expect(nameInput).toBeTruthy()
    fireEvent.change(nameInput, { target: { value: '  Renamed Corp  ' } })

    fireEvent.click(screen.getByText('Save'))

    expect(mutate).toHaveBeenCalledWith({
      id: 'app_1',
      data: {
        name: 'Renamed Corp',
        description: 'Acme description',
      },
    })
  })

  it('calls update.mutate with updated description on Save', () => {
    const mutate = vi.fn()
    setup({
      data: fakeApp,
      update: { ...defaultUpdate, mutate },
    })
    render(<ApplicationDetailView applicationId="app_1" />)

    const descTextarea = document.getElementById('detail-description') as HTMLTextAreaElement
    expect(descTextarea).toBeTruthy()
    fireEvent.change(descTextarea, {
      target: { value: 'Updated description' },
    })

    fireEvent.click(screen.getByText('Save'))

    expect(mutate).toHaveBeenCalledWith({
      id: 'app_1',
      data: {
        name: 'Acme Corp',
        description: 'Updated description',
      },
    })
  })

  it('triggers revoke.mutate when the archive confirmation action is clicked', () => {
    const mutate = vi.fn()
    setup({
      data: fakeApp,
      revoke: { ...defaultRevoke, mutate },
    })
    const { container } = render(<ApplicationDetailView applicationId="app_1" />)

    // The AlertDialogAction is the button inside AlertDialogFooter — click it
    // directly (no need to open the dialog since our mock renders everything).
    const alertDialogAction = container.querySelector(
      '[data-testid="AlertDialogAction"]'
    ) as HTMLButtonElement | null
    expect(alertDialogAction).toBeTruthy()
    fireEvent.click(alertDialogAction!)

    expect(mutate).toHaveBeenCalledWith({ id: 'app_1', cascade: true })
  })

  it('renders the slug field as disabled and readOnly (immutable)', () => {
    setup({ data: fakeApp })
    render(<ApplicationDetailView applicationId="app_1" />)

    const slugInput = document.getElementById('detail-slug') as HTMLInputElement | null
    expect(slugInput).toBeTruthy()
    expect(slugInput?.disabled).toBe(true)
    expect(slugInput?.readOnly).toBe(true)
    expect(slugInput?.value).toBe('acme')
  })

  it('disables the Save button when no field is dirty', () => {
    setup({ data: fakeApp })
    render(<ApplicationDetailView applicationId="app_1" />)
    const saveButton = screen.getByText('Save') as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it('calls onBack when the Back button is clicked', () => {
    const onBack = vi.fn()
    setup({ data: fakeApp })
    render(<ApplicationDetailView applicationId="app_1" onBack={onBack} />)

    fireEvent.click(screen.getByText('Back to applications'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('uses the slug label and help text from texts prop (i18n override)', () => {
    setup({ data: fakeApp })
    render(
      <ApplicationDetailView
        applicationId="app_1"
        texts={{
          settingsSlugLabel: 'Identifiant',
          settingsSlugHelp: 'Le slug est immuable.',
        }}
      />
    )
    expect(screen.getByText('Identifiant')).toBeTruthy()
    expect(screen.getByText('Le slug est immuable.')).toBeTruthy()
  })
})
