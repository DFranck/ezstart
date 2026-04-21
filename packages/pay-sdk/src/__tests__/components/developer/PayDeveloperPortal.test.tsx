/**
 * Tests for PayDeveloperPortal — the drop-in EZPay developer portal UI.
 *
 * Mirrors auth-sdk's DeveloperPortal test strategy: the react-query hooks
 * and the auth-sdk `useApplication` hook are replaced with vi mocks so the
 * component renders synchronously and we can assert UI flows.
 */
import React, { act } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from '../component-mocks.js'

// Mock @ezstart/ui + friends before importing the component
vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

// Mock our pay-sdk hooks.
// We also capture the latest `{ onSuccess, onError }` callbacks passed to each
// mutation hook so individual tests can simulate mutation success / error
// events by invoking them directly — mirrors the strategy used in
// auth-sdk's DeveloperPortal tests.
const mockUsePayKeys = vi.fn()
const mockUseCreatePayKey = vi.fn()
const mockUseRevokePayKey = vi.fn()
const mockUseRotatePayKey = vi.fn()

type MutationCallbacks = {
  onSuccess?: (data: unknown) => void
  onError?: (err: unknown) => void
}

let latestCreateCbs: MutationCallbacks | undefined
let latestRevokeCbs: MutationCallbacks | undefined
let latestRotateCbs: MutationCallbacks | undefined

vi.mock('../../../react/index.js', () => ({
  usePayKeys: (...args: unknown[]) => mockUsePayKeys(...args),
  useCreatePayKey: (cbs?: MutationCallbacks) => {
    latestCreateCbs = cbs
    return mockUseCreatePayKey(cbs)
  },
  useRevokePayKey: (cbs?: MutationCallbacks) => {
    latestRevokeCbs = cbs
    return mockUseRevokePayKey(cbs)
  },
  useRotatePayKey: (cbs?: MutationCallbacks) => {
    latestRotateCbs = cbs
    return mockUseRotatePayKey(cbs)
  },
}))

// Mock @ezstart/auth-sdk for KeyCreatedModal + useApplication
vi.mock('@ezstart/auth-sdk', () => ({
  KeyCreatedModal: ({
    isOpen,
    rawKey,
    texts,
  }: {
    isOpen: boolean
    rawKey: string | null
    texts: { title: string }
  }) =>
    isOpen
      ? React.createElement(
          'div',
          { 'data-testid': 'key-created-modal' },
          React.createElement('h3', null, texts.title),
          React.createElement('span', { 'data-testid': 'raw-key' }, rawKey)
        )
      : null,
  useApplication: () => ({
    data: { id: 'app_1', slug: 'acme', name: 'Acme Corp' },
    isLoading: false,
    isError: false,
  }),
}))

const { PayDeveloperPortal } = await import('../../../components/developer/PayDeveloperPortal.js')

const defaultMutation = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

type SetupOptions = {
  keys?: unknown[]
  isLoading?: boolean
  isError?: boolean
}

function setupMocks(options: SetupOptions = {}) {
  mockUsePayKeys.mockReturnValue({
    data: options.keys ?? [],
    isLoading: options.isLoading ?? false,
    isError: options.isError ?? false,
    refetch: vi.fn(),
  })
  mockUseCreatePayKey.mockReturnValue(defaultMutation)
  mockUseRevokePayKey.mockReturnValue(defaultMutation)
  mockUseRotatePayKey.mockReturnValue(defaultMutation)
}

const fakeKey = {
  id: 'k_pay_1',
  keyPrefix: 'ez_pk_live_abc',
  name: 'Prod Key',
  applicationId: 'app_1',
  appSlug: 'acme',
  type: 'publishable' as const,
  env: 'live' as const,
  scope: 'user' as const,
  permissions: ['*'],
  status: 'active' as const,
  lastUsedAt: null,
  expiresAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  revokedAt: null,
  quotaMonthly: null,
  usageThisMonth: 12,
}

describe('PayDeveloperPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders title and default description', () => {
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByText('EZPay API Keys')).toBeTruthy()
    expect(screen.getByText('Manage your EZPay API keys for programmatic access')).toBeTruthy()
  })

  it('renders create button', () => {
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByText('Create New Key')).toBeTruthy()
  })

  it('shows select-application notice when no applicationId', () => {
    render(<PayDeveloperPortal />)
    expect(screen.getByText('Select an Application above to view its EZPay keys.')).toBeTruthy()
  })

  it('shows empty state when there are no keys', () => {
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByText('No EZPay API keys yet. Create one to get started.')).toBeTruthy()
  })

  it('shows loading spinner while fetching', () => {
    setupMocks({ isLoading: true })
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByTestId('spinner')).toBeTruthy()
  })

  it('shows error + retry when fetch fails', () => {
    setupMocks({ isError: true })
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByText('Failed to load API keys')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('renders a row per key when data is loaded', () => {
    setupMocks({ keys: [fakeKey] })
    render(<PayDeveloperPortal applicationId="app_1" />)
    expect(screen.getByText('Prod Key')).toBeTruthy()
    // Prefix rendered in a <code> with trailing dots
    expect(screen.getByText(/ez_pk_live_abc/)).toBeTruthy()
  })

  it('opens the create modal when the Create button is clicked', () => {
    render(<PayDeveloperPortal applicationId="app_1" />)
    fireEvent.click(screen.getByText('Create New Key'))
    expect(screen.getByText('Create EZPay API Key')).toBeTruthy()
  })

  it('accepts a custom texts override', () => {
    render(
      <PayDeveloperPortal
        applicationId="app_1"
        texts={{ title: 'Clefs API EZPay', description: 'Custom' }}
      />
    )
    expect(screen.getByText('Clefs API EZPay')).toBeTruthy()
    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('triggers the rotate mutation when the Rotate action is clicked', () => {
    const rotateMock = vi.fn()
    mockUseRotatePayKey.mockReturnValue({ ...defaultMutation, mutate: rotateMock })
    setupMocks({ keys: [fakeKey] })
    // Re-set rotate mock (setupMocks resets it)
    mockUseRotatePayKey.mockReturnValue({ ...defaultMutation, mutate: rotateMock })
    render(<PayDeveloperPortal applicationId="app_1" />)
    fireEvent.click(screen.getByText('Rotate'))
    expect(rotateMock).toHaveBeenCalledWith('k_pay_1')
  })

  it('opens the revoke confirmation when Revoke is clicked', () => {
    setupMocks({ keys: [fakeKey] })
    render(<PayDeveloperPortal applicationId="app_1" />)
    fireEvent.click(screen.getByText('Revoke'))
    // The AlertDialog contains the confirmation text from defaults
    expect(
      screen.getByText(
        'Are you sure you want to revoke this API key? This action cannot be undone.'
      )
    ).toBeTruthy()
  })

  it('shows a toast and does not navigate when revoke fails', () => {
    setupMocks({ keys: [fakeKey] })
    render(<PayDeveloperPortal applicationId="app_1" />)

    // Simulate the mutation error by invoking the onError callback the
    // component wired into useRevokePayKey.
    act(() => {
      latestRevokeCbs?.onError?.(new Error('boom'))
    })

    expect(sonnerMock.toast.error).toHaveBeenCalledWith('Failed to revoke API key')
    // No KeyCreatedModal should appear on revoke (neither success nor error)
    expect(screen.queryByTestId('key-created-modal')).toBeNull()
  })

  it('shows a toast when rotate fails', () => {
    setupMocks({ keys: [fakeKey] })
    render(<PayDeveloperPortal applicationId="app_1" />)

    act(() => {
      latestRotateCbs?.onError?.(new Error('boom'))
    })

    expect(sonnerMock.toast.error).toHaveBeenCalledWith('Failed to rotate API key')
    // No modal should open on rotate error
    expect(screen.queryByTestId('key-created-modal')).toBeNull()
  })

  it('opens the KeyCreatedModal with the new raw key when rotate succeeds', () => {
    setupMocks({ keys: [fakeKey] })
    render(<PayDeveloperPortal applicationId="app_1" />)

    const newRawKey = 'ez_pk_live_rotatedsecret'
    act(() => {
      latestRotateCbs?.onSuccess?.({
        id: 'k_pay_1',
        key: newRawKey,
        keyPrefix: 'ez_pk_live_rot',
        name: 'Prod Key',
        type: 'publishable',
        env: 'live',
        scope: 'user',
        applicationId: 'app_1',
        appSlug: 'acme',
      })
    })

    // The rotate success toast fires, and the KeyCreatedModal opens with
    // the new raw key surfaced to the user exactly once.
    expect(sonnerMock.toast.success).toHaveBeenCalledWith('API key rotated')
    expect(screen.getByTestId('key-created-modal')).toBeTruthy()
    expect(screen.getByTestId('raw-key').textContent).toBe(newRawKey)
  })

  it('hides the admin scope option in the create modal by default', () => {
    setupMocks({ keys: [] })
    render(<PayDeveloperPortal applicationId="app_1" />)

    fireEvent.click(screen.getByText('Create New Key'))
    // Default defaults list: user + readonly, no admin
    expect(screen.getByText('User — standard permissions')).toBeTruthy()
    expect(screen.getByText('Read-only — cannot modify data')).toBeTruthy()
    expect(screen.queryByText('Admin — full access (superadmin only)')).toBeNull()
  })

  it('shows the admin scope option in the create modal when showSuperadminScope is true', () => {
    setupMocks({ keys: [] })
    render(<PayDeveloperPortal applicationId="app_1" showSuperadminScope />)

    fireEvent.click(screen.getByText('Create New Key'))
    expect(screen.getByText('Admin — full access (superadmin only)')).toBeTruthy()
  })
})
