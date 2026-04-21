import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'

const mockUseCreateApplication = vi.fn()
const mockUseMyApplications = vi.fn()

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
  useRevokeApplication: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

const { CreateApplicationModal } =
  await import('../../../components/applications/CreateApplicationModal.js')

const existingApp: Application = {
  id: 'app_existing',
  slug: 'existing',
  name: 'Existing App',
  ownerId: 'user_1',
  status: 'active',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const defaultCreate = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
}

function setup(overrides?: { apps?: Application[]; create?: typeof defaultCreate }) {
  mockUseMyApplications.mockReturnValue({
    data: overrides?.apps ?? [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })
  mockUseCreateApplication.mockImplementation(() => overrides?.create ?? defaultCreate)
}

describe('CreateApplicationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setup()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<CreateApplicationModal isOpen={false} onClose={vi.fn()} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders modal fields when open', () => {
    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Slug')).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
  })

  it('shows slug-invalid error for reserved characters', () => {
    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)
    const slugInput = screen.getByPlaceholderText('acme') as HTMLInputElement
    fireEvent.change(slugInput, { target: { value: 'Invalid Slug!' } })
    // After normalization + user input, check the invalid message
    // (lowercased automatically by handler)
    expect(
      screen.queryByText('Invalid slug. Use lowercase letters, numbers and hyphens (2-32 chars).')
    ).toBeTruthy()
  })

  it('shows slug-taken error when slug matches an existing app', () => {
    setup({ apps: [existingApp] })
    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)
    const slugInput = screen.getByPlaceholderText('acme') as HTMLInputElement
    fireEvent.change(slugInput, { target: { value: 'existing' } })
    expect(screen.queryByText('This slug is already taken.')).toBeTruthy()
  })

  it('calls create.mutate with correct body on submit', () => {
    const mutate = vi.fn()
    setup({
      create: { ...defaultCreate, mutate },
    })

    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Acme Corp'), {
      target: { value: 'New Co' },
    })
    // Slug should be auto-derived; override to be deterministic
    fireEvent.change(screen.getByPlaceholderText('acme'), {
      target: { value: 'new-co' },
    })

    const submitButton = screen.getByText('Create')
    fireEvent.click(submitButton)

    expect(mutate).toHaveBeenCalledWith({
      slug: 'new-co',
      name: 'New Co',
      description: undefined,
    })
  })

  it('does not submit when slug is invalid', () => {
    const mutate = vi.fn()
    setup({ create: { ...defaultCreate, mutate } })
    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Acme Corp'), {
      target: { value: 'Bad Co' },
    })
    fireEvent.change(screen.getByPlaceholderText('acme'), {
      target: { value: 'x' }, // too short
    })

    fireEvent.click(screen.getByText('Create'))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows "Creating..." label while mutation is pending', () => {
    setup({ create: { ...defaultCreate, isPending: true } })
    render(<CreateApplicationModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Creating...')).toBeTruthy()
  })
})
