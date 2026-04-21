/**
 * Tests for CreatePayKeyModal — the EZPay API key creation form.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from '../component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

vi.mock('@ezstart/auth-sdk', () => ({
  useApplication: () => ({
    data: { id: 'app_1', slug: 'acme', name: 'Acme Corp' },
    isLoading: false,
    isError: false,
  }),
}))

const { CreatePayKeyModal } = await import('../../../components/developer/CreatePayKeyModal.js')
const { defaultPayDeveloperPortalTexts } = await import('../../../components/developer/types.js')

const texts = defaultPayDeveloperPortalTexts.create

describe('CreatePayKeyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal when open', () => {
    render(
      <CreatePayKeyModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        texts={texts}
        applicationId="app_1"
      />
    )
    expect(screen.getByText('Create EZPay API Key')).toBeTruthy()
    expect(screen.getByLabelText('Key Name')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(
      <CreatePayKeyModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        texts={texts}
        applicationId="app_1"
      />
    )
    expect(screen.queryByText('Create EZPay API Key')).toBeNull()
  })

  it('submits with defaults when name is filled', () => {
    const onSubmit = vi.fn()
    render(
      <CreatePayKeyModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        texts={texts}
        applicationId="app_1"
      />
    )
    fireEvent.change(screen.getByLabelText('Key Name'), {
      target: { value: 'Prod Key' },
    })
    fireEvent.click(screen.getByText('Create'))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Prod Key',
        applicationId: 'app_1',
        type: 'publishable',
        env: 'live',
        scope: 'user',
        expiresAt: null,
      })
    )
  })

  it('shows the submitting label while the request is in flight', () => {
    render(
      <CreatePayKeyModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting
        texts={texts}
        applicationId="app_1"
      />
    )
    expect(screen.getByText('Creating...')).toBeTruthy()
  })

  it('displays the resolved application slug read-only', () => {
    render(
      <CreatePayKeyModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        texts={texts}
        applicationId="app_1"
      />
    )
    const appInput = screen.getByLabelText('Application') as HTMLInputElement
    expect(appInput.value).toBe('acme')
    expect(appInput.readOnly).toBe(true)
  })

  it('does not submit when the name is empty', () => {
    const onSubmit = vi.fn()
    render(
      <CreatePayKeyModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        texts={texts}
        applicationId="app_1"
      />
    )
    fireEvent.click(screen.getByText('Create'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
