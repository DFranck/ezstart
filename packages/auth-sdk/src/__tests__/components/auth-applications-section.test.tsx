import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../core/types.js'
import type { ColumnDef, Row } from '@tanstack/react-table'

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
const { buildAdminApplicationsColumns } =
  await import('../../components/admin/AdminApplicationsTable.js')
const { DEFAULT_APPLICATIONS_TEXTS } =
  await import('../../components/admin/AdminApplications.types.js')

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

  it('accepts the onApplicationOpen prop without breaking the section render', () => {
    // Detailed cell-level behavior (button visible / hidden + click invocation)
    // is exercised in the dedicated `buildAdminApplicationsColumns` block
    // below. This test only proves the section accepts the new prop without
    // exploding and still mounts the table.
    setup({ data: [fakeApp()] })
    const handler = vi.fn()
    expect(() => render(<AuthApplicationsSection onApplicationOpen={handler} />)).not.toThrow()
    expect(screen.getByTestId('DataTable')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Cell-level coverage for the actions column built by
// `buildAdminApplicationsColumns()`.
//
// The shared @ezstart/ui mock renders `<DataTable>` as a passthrough Div,
// so cell renderers from the columns array are NOT invoked during a normal
// `render(<AdminApplicationsTable .../>)`. We exercise the columns helper
// directly — extracting the actions cell renderer and invoking it by hand.
// This guarantees:
//   - graceful default: View button is absent when `onView` is omitted
//   - wired behavior:   View button is rendered + click invokes the handler
//                       with the correct Application
// ---------------------------------------------------------------------------

describe('buildAdminApplicationsColumns — actions column', () => {
  const sampleApp: Application = {
    id: 'app_42',
    slug: 'acme',
    name: 'Acme Corp',
    description: undefined,
    ownerId: 'user_42',
    status: 'active',
    themeEnabled: false,
    isPlatformOwned: false,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  }

  function getActionsColumn(opts: {
    onView?: (app: Application) => void
    onEdit?: (app: Application) => void
    onArchive?: (app: Application) => void
  }): ColumnDef<Application> | undefined {
    const columns = buildAdminApplicationsColumns({
      t: DEFAULT_APPLICATIONS_TEXTS,
      onEdit: opts.onEdit ?? vi.fn(),
      onArchive: opts.onArchive ?? vi.fn(),
      onView: opts.onView,
    })
    return columns.find((c: ColumnDef<Application>) => 'id' in c && c.id === 'actions')
  }

  function renderCell(
    column: ColumnDef<Application> | undefined,
    row: Application
  ): ReturnType<typeof render> | null {
    if (!column || typeof column.cell !== 'function') return null
    const cellFn = column.cell as (ctx: { row: Row<Application> }) => React.ReactNode
    const node = cellFn({ row: { original: row } as Row<Application> })
    return render(<>{node}</>)
  }

  it('omits the View action button when onView is undefined (graceful default)', () => {
    const actionsColumn = getActionsColumn({})
    const rendered = renderCell(actionsColumn, sampleApp)
    expect(rendered).not.toBeNull()
    if (!rendered) return
    expect(rendered.queryByText(DEFAULT_APPLICATIONS_TEXTS.viewDetails)).toBeNull()
    // Edit + Archive (active row) still rendered
    expect(rendered.getByText(DEFAULT_APPLICATIONS_TEXTS.edit)).toBeTruthy()
    expect(rendered.getByText(DEFAULT_APPLICATIONS_TEXTS.archive)).toBeTruthy()
  })

  it('renders the View action button when onView is provided', () => {
    const onView = vi.fn()
    const actionsColumn = getActionsColumn({ onView })
    const rendered = renderCell(actionsColumn, sampleApp)
    expect(rendered).not.toBeNull()
    if (!rendered) return
    expect(rendered.getByText(DEFAULT_APPLICATIONS_TEXTS.viewDetails)).toBeTruthy()
  })

  it('invokes onView with the row Application when the View button is clicked', () => {
    const onView = vi.fn()
    const actionsColumn = getActionsColumn({ onView })
    const rendered = renderCell(actionsColumn, sampleApp)
    if (!rendered) {
      throw new Error('actions column did not render')
    }
    fireEvent.click(rendered.getByText(DEFAULT_APPLICATIONS_TEXTS.viewDetails))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(sampleApp)
  })
})
