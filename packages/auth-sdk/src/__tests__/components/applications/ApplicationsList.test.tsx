import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'

// Mock hooks before importing the component
const mockUseMyApplications = vi.fn()
const mockUseRevokeApplication = vi.fn()
const mockUseCreateApplication = vi.fn()

vi.mock('../../../react/applications.js', () => ({
  useMyApplications: (...args: unknown[]) => mockUseMyApplications(...args),
  useApplication: () => ({ data: null, isLoading: false, isError: false }),
  useResolveApplicationByKey: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
  useCreateApplication: (...args: unknown[]) => mockUseCreateApplication(...args),
  useUpdateApplication: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeApplication: (...args: unknown[]) => mockUseRevokeApplication(...args),
}))

const { ApplicationsList } = await import('../../../components/applications/ApplicationsList.js')

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

const defaultRevoke = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
}

const defaultCreate = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

function setup(overrides?: { data?: Application[]; isLoading?: boolean; isError?: boolean }) {
  mockUseMyApplications.mockReturnValue({
    data: overrides?.data ?? [],
    isLoading: overrides?.isLoading ?? false,
    isError: overrides?.isError ?? false,
    refetch: vi.fn(),
  })
  mockUseRevokeApplication.mockReturnValue(defaultRevoke)
  mockUseCreateApplication.mockReturnValue(defaultCreate)
}

describe('ApplicationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setup()
  })

  it('renders title and description (English defaults)', () => {
    render(<ApplicationsList />)
    expect(screen.getByText('Applications')).toBeTruthy()
    expect(screen.getByText('Manage the apps that use your EZ keys')).toBeTruthy()
  })

  it('shows "New Application" CTA', () => {
    render(<ApplicationsList />)
    expect(screen.getByText('New Application')).toBeTruthy()
  })

  it('renders loading skeletons', () => {
    setup({ isLoading: true })
    const { container } = render(<ApplicationsList />)
    const skeletons = container.querySelectorAll('[data-testid="Skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error state with retry', () => {
    setup({ isError: true })
    render(<ApplicationsList />)
    expect(screen.getByText('Failed to load applications')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('renders empty state', () => {
    setup({ data: [] })
    render(<ApplicationsList />)
    expect(screen.getByText('No applications yet')).toBeTruthy()
    expect(screen.getByText('Create Application')).toBeTruthy()
  })

  it('renders one card per application in the grid', () => {
    setup({ data: [fakeApp, { ...fakeApp, id: 'app_2', slug: 'beta', name: 'Beta App' }] })
    render(<ApplicationsList />)
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('Beta App')).toBeTruthy()
  })

  it('calls onSelectApplication when Manage button is clicked', () => {
    const onSelect = vi.fn()
    setup({ data: [fakeApp] })
    render(<ApplicationsList onSelectApplication={onSelect} />)

    fireEvent.click(screen.getByText('Manage'))
    expect(onSelect).toHaveBeenCalledWith(fakeApp)
  })

  it('accepts custom texts override', () => {
    render(
      <ApplicationsList
        texts={{
          list: {
            title: 'Mes Apps',
            description: 'Gerez vos apps',
            newApplication: 'Nouvelle',
            loading: '',
            errorTitle: '',
            errorDescription: '',
            retry: '',
            emptyTitle: '',
            emptyDescription: '',
            emptyCta: '',
            showArchived: '',
            showAll: '',
          },
        }}
      />
    )
    expect(screen.getByText('Mes Apps')).toBeTruthy()
    expect(screen.getByText('Nouvelle')).toBeTruthy()
  })

  it('opens the Create modal when New Application button is clicked', () => {
    render(<ApplicationsList />)
    fireEvent.click(screen.getByText('New Application'))
    // Modal data-testid from setup mock
    const modals = screen.queryAllByTestId('Modal')
    expect(modals.length).toBeGreaterThan(0)
  })

  it('hides toggles when disabled', () => {
    render(<ApplicationsList showArchivedToggle={false} showSuperadminAllToggle={false} />)
    expect(screen.queryByText('Show archived')).toBeNull()
    expect(screen.queryByText('Show all applications (superadmin)')).toBeNull()
  })
})
