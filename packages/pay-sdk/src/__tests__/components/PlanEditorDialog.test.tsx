/**
 * Tests for PlanEditorDialog — create/edit plan form.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

const mockClient = {
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
}

vi.mock('../../react/pay-provider.js', async () => {
  const actual = await vi.importActual<typeof import('../../react/pay-provider.js')>(
    '../../react/pay-provider.js'
  )
  return {
    ...actual,
    usePayContext: () => ({
      client: mockClient,
      applicationId: 'app_1',
      appSlug: 'acme',
      isReady: true,
    }),
  }
})

const { PlanEditorDialog } = await import('../../components/PlanEditorDialog.js')

type PlanShape = {
  id: string
  name: string
  appName: string
  applicationId: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  metadata?: {
    grantsRoles?: string[]
    grantsFeatures?: string[]
  }
}

const fakePlan: PlanShape = {
  id: 'plan_1',
  name: 'Pro',
  appName: 'acme',
  applicationId: 'app_1',
  description: 'Pro plan',
  amount: 1999,
  currency: 'EUR',
  interval: 'month',
  intervalCount: 1,
  features: ['Feature A', 'Feature B'],
  active: true,
  sortOrder: 1,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  metadata: {
    grantsRoles: ['pro'],
    grantsFeatures: ['advanced'],
  },
}

describe('PlanEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.createPlan.mockResolvedValue({ success: true, data: { plan: fakePlan } })
    mockClient.updatePlan.mockResolvedValue({ success: true, data: { plan: fakePlan } })
  })

  it('renders nothing when closed', () => {
    render(<PlanEditorDialog isOpen={false} onClose={vi.fn()} applicationId="app_1" />)
    expect(screen.queryByText('Create a new plan')).toBeNull()
  })

  it('renders create title when no plan is provided', () => {
    render(<PlanEditorDialog isOpen onClose={vi.fn()} applicationId="app_1" />)
    expect(screen.getByText('Create a new plan')).toBeTruthy()
  })

  it('renders edit title with prefilled fields when a plan is provided', () => {
    render(
      <PlanEditorDialog
        isOpen
        onClose={vi.fn()}
        applicationId="app_1"
        plan={fakePlan as unknown as import('../../core/types.js').Plan}
      />
    )
    expect(screen.getByText('Edit plan')).toBeTruthy()
    const nameInput = screen.getByLabelText('Name') as HTMLInputElement
    expect(nameInput.value).toBe('Pro')
    // Amount in cents (1999) -> "19.99"
    const amountInput = screen.getByLabelText('Price') as HTMLInputElement
    expect(amountInput.value).toBe('19.99')
  })

  it('does not submit when name is empty and shows validation error', async () => {
    render(<PlanEditorDialog isOpen onClose={vi.fn()} applicationId="app_1" />)
    // Fill a valid amount so only the name fails
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeTruthy()
    })
    expect(mockClient.createPlan).not.toHaveBeenCalled()
  })

  it('submits create with amount converted to cents and metadata', async () => {
    const onClose = vi.fn()
    render(<PlanEditorDialog isOpen onClose={onClose} applicationId="app_1" />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Starter' } })
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '19.99' } })
    fireEvent.change(screen.getByLabelText('Grants roles'), {
      target: { value: 'pro, premium' },
    })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockClient.createPlan).toHaveBeenCalledTimes(1)
    })
    expect(mockClient.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Starter',
        applicationId: 'app_1',
        amount: 1999,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        metadata: expect.objectContaining({
          grantsRoles: ['pro', 'premium'],
        }),
      })
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('submits edit via updatePlan with the plan id and patch body', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(
      <PlanEditorDialog
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        applicationId="app_1"
        plan={fakePlan as unknown as import('../../core/types.js').Plan}
      />
    )
    // Change the name and submit
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pro Plus' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockClient.updatePlan).toHaveBeenCalledTimes(1)
    })
    expect(mockClient.updatePlan).toHaveBeenCalledWith(
      'plan_1',
      expect.objectContaining({
        name: 'Pro Plus',
        amount: 1999,
        currency: 'EUR',
      })
    )
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('surfaces the server error when the request fails', async () => {
    mockClient.createPlan.mockRejectedValueOnce(new Error('Plan name already exists'))
    render(<PlanEditorDialog isOpen onClose={vi.fn()} applicationId="app_1" />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pro' } })
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '19' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(sonnerMock.toast.error).toHaveBeenCalledWith('Plan name already exists')
    })
  })
})
