import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'
import { defaultApplicationsFlowTexts } from '../../../components/applications/types.js'

vi.mock('@ezstart/ui/components', () => {
  const Reactm = require('react')

  const passthrough = (displayName: string, tag = 'div') => {
    const Comp = Reactm.forwardRef((props: Record<string, unknown>, ref: unknown) => {
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
      return Reactm.createElement(tag, { ...domProps, ref, 'data-testid': displayName }, children)
    })
    Comp.displayName = displayName
    return Comp
  }

  const Input = Reactm.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return Reactm.createElement('input', { ...props, ref })
  })
  Input.displayName = 'Input'

  const Button = Reactm.forwardRef(
    (props: Record<string, unknown> & { children?: React.ReactNode }, ref: unknown) => {
      const { variant, size: _size, asChild: _asChild, children, ...rest } = props
      return Reactm.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  return {
    Button,
    Input,
    Div: passthrough('Div'),
    P: passthrough('P', 'p'),
    Label: passthrough('Label', 'label'),
    H4: passthrough('H4', 'h4'),
    Card: passthrough('Card'),
    CardHeader: passthrough('CardHeader'),
    CardContent: passthrough('CardContent'),
    CardTitle: passthrough('CardTitle'),
    CardDescription: passthrough('CardDescription'),
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

vi.mock('@ezstart/ui/utils', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockUseRegenerateWebhookSecret = vi.fn()

vi.mock('../../../react/applications.js', () => ({
  useRegenerateWebhookSecret: (...args: unknown[]) => mockUseRegenerateWebhookSecret(...args),
}))

const { WebhookSecretSection } =
  await import('../../../components/applications/WebhookSecretSection.js')

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  ownerId: 'user_1',
  status: 'active',
  webhookEndpointUrl: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const detailTexts = defaultApplicationsFlowTexts.detail

describe('WebhookSecretSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRegenerateWebhookSecret.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    })
  })

  it('renders the masked-secret help by default (no reveal banner)', () => {
    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    // Help text under the masked input is visible.
    expect(screen.getByText(detailTexts.webhookSecretMaskedHelp)).toBeTruthy()
    // The reveal banner title is NOT present.
    expect(screen.queryByText(detailTexts.webhookRevealTitle)).toBeNull()
  })

  it('shows the regenerate button — clicking it opens the confirmation modal', () => {
    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    const trigger = screen.getByText(detailTexts.webhookRegenerate)
    fireEvent.click(trigger)
    // Confirmation title becomes visible (AlertDialog mock just renders children).
    expect(screen.getByText(detailTexts.webhookConfirmTitle)).toBeTruthy()
  })

  it('confirming the modal calls mutate(applicationId) with no extra args', () => {
    const mutate = vi.fn()
    mockUseRegenerateWebhookSecret.mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      isError: false,
    })
    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    fireEvent.click(screen.getByText(detailTexts.webhookRegenerate))
    fireEvent.click(screen.getByText(detailTexts.webhookConfirmSubmit))
    expect(mutate).toHaveBeenCalledWith('app_1')
  })

  it('disables the regenerate button while a rotation is in flight', () => {
    mockUseRegenerateWebhookSecret.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
    })
    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    const button = screen.getByText(detailTexts.webhookRegenerating) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('captures the new secret from onSuccess and renders the reveal banner once', () => {
    let onSuccess: ((app: Application) => void) | undefined
    mockUseRegenerateWebhookSecret.mockImplementation((cb?: { onSuccess?: typeof onSuccess }) => {
      onSuccess = cb?.onSuccess
      return {
        mutate: () => {
          onSuccess?.({
            ...fakeApp,
            webhookSecret: 'whsec_freshly_generated_value_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          })
        },
        isPending: false,
        isSuccess: false,
        isError: false,
      }
    })

    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    fireEvent.click(screen.getByText(detailTexts.webhookRegenerate))
    fireEvent.click(screen.getByText(detailTexts.webhookConfirmSubmit))

    // Reveal banner title now visible
    expect(screen.getByText(detailTexts.webhookRevealTitle)).toBeTruthy()
    // The full secret value is rendered in the read-only Input
    const inputs = document.querySelectorAll('input')
    const valueInput = Array.from(inputs).find(i => i.value.startsWith('whsec_freshly_generated'))
    expect(valueInput).toBeTruthy()
  })

  it('hides the reveal banner when the user clicks Hide', () => {
    let onSuccess: ((app: Application) => void) | undefined
    mockUseRegenerateWebhookSecret.mockImplementation((cb?: { onSuccess?: typeof onSuccess }) => {
      onSuccess = cb?.onSuccess
      return {
        mutate: () => {
          onSuccess?.({
            ...fakeApp,
            webhookSecret: 'whsec_xx_to_hide_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          })
        },
        isPending: false,
        isSuccess: false,
        isError: false,
      }
    })

    render(<WebhookSecretSection application={fakeApp} texts={detailTexts} />)
    fireEvent.click(screen.getByText(detailTexts.webhookRegenerate))
    fireEvent.click(screen.getByText(detailTexts.webhookConfirmSubmit))
    expect(screen.getByText(detailTexts.webhookRevealTitle)).toBeTruthy()

    fireEvent.click(screen.getByText(detailTexts.webhookHide))
    expect(screen.queryByText(detailTexts.webhookRevealTitle)).toBeNull()
  })

  it('shows the configured webhookEndpointUrl when set on the Application', () => {
    const appWithUrl: Application = {
      ...fakeApp,
      webhookEndpointUrl: 'https://acme.example.com/hooks/ezpay',
    }
    render(<WebhookSecretSection application={appWithUrl} texts={detailTexts} />)
    const inputs = document.querySelectorAll('input')
    const urlInput = Array.from(inputs).find(
      i => i.value === 'https://acme.example.com/hooks/ezpay'
    )
    expect(urlInput).toBeTruthy()
  })
})
