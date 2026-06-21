/**
 * Unit tests for the admin `EditApplicationModal` — covers the new white-label
 * theme fields (primary color + logo URL + themeEnabled toggle) added so
 * superadmins can edit theming directly from the global Applications table.
 *
 * The modal touches TWO endpoints on save:
 *  - `PATCH /applications/:id`       — name / description (`useUpdateApplication`)
 *  - `PATCH /applications/:id/theme` — theme tokens + themeEnabled
 *                                      (`useUpdateApplicationTheme`)
 *
 * These tests lock in:
 *  - Primary-only contract (no Background / Foreground / Accent fields)
 *  - Pure metadata edits only hit the metadata mutation
 *  - Pure theme edits only hit the theme mutation
 *  - Mixed edits fire BOTH mutations in parallel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'

// ---------------------------------------------------------------------------
// Lightweight @ezstart/ui/components mock — passthrough that preserves event
// handlers and renders semantic DOM so RTL queries (getByLabelText etc.) work.
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/components', () => {
  const React = require('react')

  const passthrough = (displayName: string, tag = 'div') => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const {
        children,
        asChild: _asChild,
        ...rest
      } = props as Record<string, unknown> & {
        children?: React.ReactNode
        asChild?: boolean
      }
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
      return React.createElement(tag, { ...domProps, ref, 'data-testid': displayName }, children)
    })
    Comp.displayName = displayName
    return Comp
  }

  const Input = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return React.createElement('input', { ...props, ref })
  })
  Input.displayName = 'Input'

  const Textarea = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    return React.createElement('textarea', { ...props, ref })
  })
  Textarea.displayName = 'Textarea'

  const Button = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode; disabled?: boolean },
      ref: unknown
    ) => {
      const {
        variant,
        size: _size,
        asChild: _asChild,
        children,
        ...rest
      } = props as Record<string, unknown> & {
        children?: React.ReactNode
        variant?: string
      }
      return React.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  const Switch = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    const { checked, onCheckedChange, ...rest } = props as Record<string, unknown> & {
      checked?: boolean
      onCheckedChange?: (v: boolean) => void
    }
    return React.createElement('input', {
      type: 'checkbox',
      checked: !!checked,
      onChange: (e: { target: { checked: boolean } }) => onCheckedChange?.(e.target.checked),
      ref,
      ...rest,
    })
  })
  Switch.displayName = 'Switch'

  // Modal — render children + footer inline when `isOpen`, otherwise null.
  const Modal = ({
    isOpen,
    children,
    footer,
    title,
    description,
  }: {
    isOpen?: boolean
    children?: React.ReactNode
    footer?: React.ReactNode
    title?: React.ReactNode
    description?: React.ReactNode
  }) => {
    if (!isOpen) return null
    return React.createElement(
      'div',
      { role: 'dialog', 'data-testid': 'Modal' },
      React.createElement('div', null, title),
      description ? React.createElement('div', null, description) : null,
      children,
      footer ? React.createElement('div', { 'data-testid': 'ModalFooter' }, footer) : null
    )
  }

  const Spinner = (_props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'Spinner' }, 'loading…')

  return {
    Button,
    Input,
    Textarea,
    Modal,
    Spinner,
    Switch,
    Div: passthrough('Div'),
    P: passthrough('P', 'p'),
    Span: passthrough('Span', 'span'),
    Label: passthrough('Label', 'label'),
  }
})

vi.mock('@ezstart/ui/utils', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mutation mocks — exposed so tests can assert calls + payloads.
const mockUpdateMutateAsync = vi.fn()
const mockUpdateThemeMutateAsync = vi.fn()

vi.mock('../../../react/applications.js', () => ({
  useUpdateApplication: (_opts?: unknown) => ({
    mutate: vi.fn(),
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
  useUpdateApplicationTheme: (_opts?: unknown) => ({
    mutate: vi.fn(),
    mutateAsync: mockUpdateThemeMutateAsync,
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

const { EditApplicationModal } = await import('../../../components/admin/EditApplicationModal.js')
const { DEFAULT_APPLICATIONS_TEXTS } =
  await import('../../../components/admin/AdminApplications.types.js')

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  description: 'Acme description',
  ownerId: 'user_1',
  status: 'active',
  themeEnabled: false,
  isPlatformOwned: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const fakeAppWithTheme: Application = {
  ...fakeApp,
  theme: { primary: '#00D9F7', logo: 'https://cdn.example.com/logo.svg' },
  themeEnabled: true,
}

const noop = () => {}

describe('EditApplicationModal — theme fields', () => {
  beforeEach(() => {
    mockUpdateMutateAsync.mockReset()
    mockUpdateMutateAsync.mockResolvedValue(fakeApp)
    mockUpdateThemeMutateAsync.mockReset()
    mockUpdateThemeMutateAsync.mockResolvedValue(fakeApp)
  })

  it('renders primary color + logo URL + themeEnabled fields', () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    expect(screen.getByLabelText(DEFAULT_APPLICATIONS_TEXTS.editThemePrimaryLabel)).toBeTruthy()
    expect(screen.getByLabelText(DEFAULT_APPLICATIONS_TEXTS.editThemeLogoLabel)).toBeTruthy()
    expect(screen.getByLabelText(DEFAULT_APPLICATIONS_TEXTS.editThemeEnableLabel)).toBeTruthy()
  })

  it('does NOT render legacy Background / Foreground / Accent fields (primary-only)', () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    expect(screen.queryByLabelText(/background/i)).toBeNull()
    expect(screen.queryByLabelText(/foreground/i)).toBeNull()
    expect(screen.queryByLabelText(/accent/i)).toBeNull()
  })

  it('pre-fills theme inputs from the application document', () => {
    render(
      <EditApplicationModal
        application={fakeAppWithTheme}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const primary = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemePrimaryLabel
    ) as HTMLInputElement
    const logo = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemeLogoLabel
    ) as HTMLInputElement
    const enabled = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemeEnableLabel
    ) as HTMLInputElement

    expect(primary.value).toBe('#00D9F7')
    expect(logo.value).toBe('https://cdn.example.com/logo.svg')
    expect(enabled.checked).toBe(true)
  })

  it('Save button is disabled when nothing changed', () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const saveBtn = screen.getByText(DEFAULT_APPLICATIONS_TEXTS.save) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })

  it('editing theme alone fires ONLY the theme mutation', async () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const primary = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemePrimaryLabel
    ) as HTMLInputElement
    fireEvent.change(primary, { target: { value: '#ff8800' } })

    const enabled = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemeEnableLabel
    ) as HTMLInputElement
    fireEvent.click(enabled)

    const saveBtn = screen.getByText(DEFAULT_APPLICATIONS_TEXTS.save)
    fireEvent.click(saveBtn)

    // wait microtask for async handler to flush
    await Promise.resolve()
    await Promise.resolve()

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled()
    expect(mockUpdateThemeMutateAsync).toHaveBeenCalledTimes(1)
    expect(mockUpdateThemeMutateAsync).toHaveBeenCalledWith({
      id: 'app_1',
      data: {
        theme: { primary: '#ff8800' },
        themeEnabled: true,
      },
    })
  })

  it('editing name alone fires ONLY the metadata mutation', async () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const name = screen.getByLabelText(DEFAULT_APPLICATIONS_TEXTS.editNameLabel) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Acme v2' } })

    const saveBtn = screen.getByText(DEFAULT_APPLICATIONS_TEXTS.save)
    fireEvent.click(saveBtn)

    await Promise.resolve()
    await Promise.resolve()

    expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1)
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: 'app_1',
      data: {
        name: 'Acme v2',
        description: 'Acme description',
      },
    })
    expect(mockUpdateThemeMutateAsync).not.toHaveBeenCalled()
  })

  it('editing both fires BOTH mutations', async () => {
    render(
      <EditApplicationModal
        application={fakeApp}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const name = screen.getByLabelText(DEFAULT_APPLICATIONS_TEXTS.editNameLabel) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Acme v3' } })

    const primary = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemePrimaryLabel
    ) as HTMLInputElement
    fireEvent.change(primary, { target: { value: 'oklch(0.7 0.15 210)' } })

    const saveBtn = screen.getByText(DEFAULT_APPLICATIONS_TEXTS.save)
    fireEvent.click(saveBtn)

    await Promise.resolve()
    await Promise.resolve()

    expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1)
    expect(mockUpdateThemeMutateAsync).toHaveBeenCalledTimes(1)
    expect(mockUpdateThemeMutateAsync).toHaveBeenCalledWith({
      id: 'app_1',
      data: {
        theme: { primary: 'oklch(0.7 0.15 210)' },
        themeEnabled: false,
      },
    })
  })

  it('clearing both primary and logo sends theme=null', async () => {
    render(
      <EditApplicationModal
        application={fakeAppWithTheme}
        open
        onOpenChange={noop}
        onSaved={noop}
        t={DEFAULT_APPLICATIONS_TEXTS}
      />
    )

    const primary = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemePrimaryLabel
    ) as HTMLInputElement
    fireEvent.change(primary, { target: { value: '' } })

    const logo = screen.getByLabelText(
      DEFAULT_APPLICATIONS_TEXTS.editThemeLogoLabel
    ) as HTMLInputElement
    fireEvent.change(logo, { target: { value: '' } })

    const saveBtn = screen.getByText(DEFAULT_APPLICATIONS_TEXTS.save)
    fireEvent.click(saveBtn)

    await Promise.resolve()
    await Promise.resolve()

    expect(mockUpdateThemeMutateAsync).toHaveBeenCalledTimes(1)
    const payload = mockUpdateThemeMutateAsync.mock.calls[0][0]
    expect(payload.data.theme).toBeNull()
    // themeEnabled in this test is unchanged (true), so it's still sent
    expect(payload.data.themeEnabled).toBe(true)
  })
})
