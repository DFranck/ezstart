/**
 * ConfirmActionDialog — public surface tests.
 *
 * Pin the contract for the generic confirm-action dialog with built-in
 * loading / success / error states, exposed by `@ezstart/ui/components`.
 * Originally extracted from `@ezstart/pay-sdk` — now generic and reusable.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('sonner', async importOriginal => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    toast: Object.assign(vi.fn(), {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    }),
  }
})

const { ConfirmActionDialog } = await import('../../../components/feedback/confirm-action-dialog')

describe('ConfirmActionDialog', () => {
  it('renders title and description in confirm state', () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete?"
        description="Are you sure?"
        onConfirm={async () => {}}
      />
    )
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={onOpenChange}
        title="X"
        description="Sure?"
        onConfirm={async () => {}}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses custom text labels', () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Custom"
        description="Custom desc"
        onConfirm={async () => {}}
        texts={{ confirmLabel: 'Yes', cancelLabel: 'No' }}
      />
    )
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('shows success state after confirm resolves', async () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Action"
        description="Do it?"
        onConfirm={async () => {}}
        texts={{ successMessage: 'Done!' }}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => {
      expect(screen.getAllByText('Done!').length).toBeGreaterThan(0)
    })
  })

  it('shows error state + error detail after confirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Oops'))
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={() => {}}
        title="Action"
        description="Do it?"
        onConfirm={onConfirm}
        texts={{ errorMessage: 'Failed', retryLabel: 'Retry' }}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => {
      expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Oops')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('does not close while loading (cancel button is disabled)', async () => {
    const onOpenChange = vi.fn()
    let resolveConfirm: () => void = () => {}
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>(r => {
          resolveConfirm = r
        })
    )
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Action"
        description="Do?"
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    // Cancel button is now disabled — clicking it must NOT invoke onOpenChange.
    const cancelBtn = screen.getByText('Cancel') as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(true)
    resolveConfirm()
  })
})
