import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../core/types.js'

// Mock the applications hooks before importing the component
const mockUseMyApplications = vi.fn()
const mockUseRevokeApplication = vi.fn()
const mockUseUpdateApplication = vi.fn()
const mockUseCreateApplication = vi.fn()

vi.mock('../../react/applications.js', () => ({
  useMyApplications: (...args: unknown[]) => mockUseMyApplications(...args),
  useApplication: () => ({ data: null, isLoading: false, isError: false }),
  useResolveApplicationByKey: () => ({ data: null, isLoading: false, isError: false }),
  useCreateApplication: (...args: unknown[]) => mockUseCreateApplication(...args),
  useUpdateApplication: (...args: unknown[]) => mockUseUpdateApplication(...args),
  useRevokeApplication: (...args: unknown[]) => mockUseRevokeApplication(...args),
}))

const { AuthApplicationsSection } =
  await import('../../components/admin/_internal/ApplicationsSection.js')

const fakeApp = (overrides: Partial<Application> = {}): Application => ({
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  description: 'Acme description',
  ownerId: 'user_1234567890',
  status: 'active',
  themeEnabled: false,
  isPlatformOwned: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...overrides,
})

const defaultRevoke = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

const defaultUpdate = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
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
  mockUseUpdateApplication.mockReturnValue(defaultUpdate)
  mockUseCreateApplication.mockReturnValue(defaultCreate)
}

describe('AuthApplicationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setup()
  })

  it('renders empty state when no applications', () => {
    render(<AuthApplicationsSection />)
    expect(screen.getByText('No applications found.')).toBeTruthy()
  })

  it('renders the New Application CTA', () => {
    render(<AuthApplicationsSection />)
    expect(screen.getByText('New Application')).toBeTruthy()
  })

  it('renders stats cards', () => {
    setup({
      data: [
        fakeApp(),
        fakeApp({ id: 'app_2', slug: 'beta', status: 'archived' }),
        fakeApp({ id: 'app_3', slug: 'plat', isPlatformOwned: true }),
        fakeApp({ id: 'app_4', slug: 'thm', themeEnabled: true }),
      ],
    })
    render(<AuthApplicationsSection />)
    // Stats labels (English defaults)
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
    expect(screen.getByText('Platform-owned')).toBeTruthy()
    expect(screen.getByText('White-label')).toBeTruthy()
  })

  it('renders the DataTable when applications are present', () => {
    setup({
      data: [
        fakeApp({ id: 'app_1', slug: 'acme', name: 'Acme Corp' }),
        fakeApp({ id: 'app_2', slug: 'beta', name: 'Beta App' }),
      ],
    })
    const { container } = render(<AuthApplicationsSection />)
    // DataTable mock renders as a passthrough Div (cell render functions are
    // not invoked in tests). Verify the table testid is present.
    expect(container.querySelector('[data-testid="DataTable"]')).toBeTruthy()
  })

  it('shows skeletons while loading', () => {
    setup({ isLoading: true })
    const { container } = render(<AuthApplicationsSection />)
    const skeletons = container.querySelectorAll('[data-testid="Skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('does not render the empty state when applications are present', () => {
    setup({ data: [fakeApp()] })
    render(<AuthApplicationsSection />)
    expect(screen.queryByText('No applications found.')).toBeNull()
  })

  it('passes custom texts override to UI', () => {
    setup({ data: [] })
    render(
      <AuthApplicationsSection
        texts={{
          createApplication: 'Nouvelle App',
          noApplications: 'Aucune app trouvee.',
        }}
      />
    )
    expect(screen.getByText('Nouvelle App')).toBeTruthy()
    expect(screen.getByText('Aucune app trouvee.')).toBeTruthy()
  })

  it('opens the create modal when New Application is clicked', () => {
    setup({ data: [] })
    render(<AuthApplicationsSection />)
    fireEvent.click(screen.getByText('New Application'))
    // CreateApplicationModal renders inside a Modal when isOpen=true
    const modals = screen.queryAllByTestId('Modal')
    expect(modals.length).toBeGreaterThan(0)
  })

  it('renders status filter options', () => {
    setup({ data: [] })
    render(<AuthApplicationsSection />)
    expect(screen.getByText('All statuses')).toBeTruthy()
    expect(screen.getByText('Active only')).toBeTruthy()
    expect(screen.getByText('Archived only')).toBeTruthy()
  })
})
