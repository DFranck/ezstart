import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock react-query hooks before importing the component
const mockUseApiKeys = vi.fn()
const mockUseCreateApiKey = vi.fn()
const mockUseRevokeApiKey = vi.fn()
const mockUseRotateApiKey = vi.fn()
const mockUseApiKeyUsage = vi.fn()

vi.mock('../../react/api-keys.js', () => ({
  useApiKeys: (...args: unknown[]) => mockUseApiKeys(...args),
  useApiKeyUsage: (...args: unknown[]) => mockUseApiKeyUsage(...args),
  useCreateApiKey: (...args: unknown[]) => mockUseCreateApiKey(...args),
  useRevokeApiKey: (...args: unknown[]) => mockUseRevokeApiKey(...args),
  useRotateApiKey: (...args: unknown[]) => mockUseRotateApiKey(...args),
}))

const { DeveloperPortal } = await import('../../components/developer/DeveloperPortal.js')
const { UsageBadge } = await import('../../components/developer/UsageBadge.js')
const { CreateKeyModal } = await import('../../components/developer/CreateKeyModal.js')
const { KeyCreatedModal } = await import('../../components/developer/KeyCreatedModal.js')

const defaultMutation = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

function setupMocks(overrides?: { keys?: unknown[]; isLoading?: boolean; isError?: boolean }) {
  mockUseApiKeys.mockReturnValue({
    data: overrides?.keys ?? [],
    isLoading: overrides?.isLoading ?? false,
    isError: overrides?.isError ?? false,
    refetch: vi.fn(),
  })
  mockUseCreateApiKey.mockReturnValue(defaultMutation)
  mockUseRevokeApiKey.mockReturnValue(defaultMutation)
  mockUseRotateApiKey.mockReturnValue(defaultMutation)
  mockUseApiKeyUsage.mockReturnValue({ data: null, isLoading: false, isError: false })
}

describe('DeveloperPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders title and description', () => {
    render(<DeveloperPortal />)
    expect(screen.getByText('API Keys')).toBeTruthy()
    expect(screen.getByText('Manage your developer API keys for programmatic access')).toBeTruthy()
  })

  it('shows create button', () => {
    render(<DeveloperPortal />)
    expect(screen.getByText('Create New Key')).toBeTruthy()
  })

  it('shows no-keys message when empty', () => {
    render(<DeveloperPortal />)
    expect(screen.getByText('No API keys yet. Create one to get started.')).toBeTruthy()
  })

  it('shows loading spinner', () => {
    setupMocks({ isLoading: true })
    render(<DeveloperPortal />)
    expect(screen.getByTestId('Spinner')).toBeTruthy()
  })

  it('shows error with retry', () => {
    setupMocks({ isError: true })
    render(<DeveloperPortal />)
    expect(screen.getByText('Failed to load API keys')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('accepts custom texts', () => {
    render(<DeveloperPortal texts={{ title: 'Clefs API', description: 'Desc custom' }} />)
    expect(screen.getByText('Clefs API')).toBeTruthy()
    expect(screen.getByText('Desc custom')).toBeTruthy()
  })
})

describe('UsageBadge', () => {
  it('shows unlimited when quota is null', () => {
    render(<UsageBadge used={0} quota={null} />)
    expect(screen.getByText('Unlimited')).toBeTruthy()
  })

  it('shows percentage when quota is set', () => {
    render(<UsageBadge used={50} quota={100} />)
    expect(screen.getByText('50%')).toBeTruthy()
  })

  it('caps at 100%', () => {
    render(<UsageBadge used={200} quota={100} />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('uses custom texts', () => {
    render(<UsageBadge used={0} quota={null} texts={{ unlimited: 'Illimite' }} />)
    expect(screen.getByText('Illimite')).toBeTruthy()
  })
})

describe('CreateKeyModal', () => {
  const defaultTexts = {
    title: 'Create API Key',
    nameLabel: 'Key Name',
    namePlaceholder: 'My App',
    appScope: 'App Scope',
    appScopeAll: 'All apps',
    keyType: 'Key Type',
    keyTypePublishable: 'Publishable',
    keyTypeSecret: 'Secret',
    keyEnv: 'Environment',
    keyEnvLive: 'Live',
    keyEnvTest: 'Test',
    keyScope: 'Permission Scope',
    keyScopeUser: 'User',
    keyScopeReadonly: 'Read-only',
    keyScopeAdmin: 'Admin',
    keyScopeAdminWarning: 'Admin scope grants full access.',
    expiry: 'Expiry',
    expiryNever: 'Never',
    expiry30d: '30 days',
    expiry90d: '90 days',
    expiry1y: '1 year',
    submit: 'Create',
    submitting: 'Creating...',
  }

  it('renders nothing when closed', () => {
    const { container } = render(
      <CreateKeyModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        texts={defaultTexts}
      />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders modal content when open', () => {
    render(
      <CreateKeyModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        texts={defaultTexts}
      />
    )
    // The modal body contains labels and inputs (footer with "Create" button is not rendered by mock)
    expect(screen.getByText('Key Name')).toBeTruthy()
    expect(screen.getByText('Expiry')).toBeTruthy()
  })
})

describe('KeyCreatedModal', () => {
  const defaultTexts = {
    title: 'API Key Created',
    warning: 'Save this key now.',
    copied: 'Copied!',
    copyKey: 'Copy',
    done: 'Done',
  }

  it('renders nothing when closed', () => {
    const { container } = render(
      <KeyCreatedModal isOpen={false} onClose={vi.fn()} rawKey={null} texts={defaultTexts} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows warning and key when open', () => {
    render(
      <KeyCreatedModal
        isOpen={true}
        onClose={vi.fn()}
        rawKey="ezk_secret123"
        texts={defaultTexts}
      />
    )
    expect(screen.getByText('Save this key now.')).toBeTruthy()
    expect(screen.getByDisplayValue('ezk_secret123')).toBeTruthy()
  })
})
