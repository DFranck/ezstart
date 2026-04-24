/**
 * Unit tests for `ApplicationThemeEditor` after the primary-only refactor.
 *
 * The editor exposes only `primary` + `logo` + the enable toggle — these
 * tests lock in that contract so a future "let's expose bg/fg/accent
 * again" regression is caught at compile/test time.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Application } from '../../../core/types.js'

// ---------------------------------------------------------------------------
// Lightweight @ezstart/ui/components mock — mirrors the shape used in
// ApplicationDetailView.test.tsx.
// ---------------------------------------------------------------------------
vi.mock('@ezstart/ui/components', () => {
  const React = require('react')

  const passthrough = (displayName: string, tag = 'div') => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
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
        } else if (k === 'style') {
          // Preserve style objects so the preview CSS variable assertion works
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

  const Button = React.forwardRef(
    (props: Record<string, unknown> & { children?: React.ReactNode }, ref: unknown) => {
      const { variant, size, asChild: _asChild, children, ...rest } = props
      return React.createElement('button', { ...rest, ref, 'data-variant': variant }, children)
    }
  )
  Button.displayName = 'Button'

  return {
    Button,
    Input,
    Div: passthrough('Div'),
    P: passthrough('P', 'p'),
    Span: passthrough('Span', 'span'),
    Label: passthrough('Label', 'label'),
    Card: passthrough('Card'),
    CardHeader: passthrough('CardHeader'),
    CardContent: passthrough('CardContent'),
    CardTitle: passthrough('CardTitle'),
    CardDescription: passthrough('CardDescription'),
    Switch: React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
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
    }),
  }
})

// Mock utils — we don't need real toasts during render assertions.
vi.mock('@ezstart/ui/utils', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock the update-theme hook so we can assert the payload shape.
const mockMutate = vi.fn()
vi.mock('../../../react/applications.js', () => ({
  useUpdateApplicationTheme: (opts?: { onSuccess?: () => void; onError?: () => void }) => ({
    mutate: mockMutate,
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    _opts: opts,
  }),
}))

const { ApplicationThemeEditor } =
  await import('../../../components/applications/ApplicationThemeEditor.js')
const { defaultApplicationsFlowTexts } = await import('../../../components/applications/types.js')

const texts = defaultApplicationsFlowTexts.detail

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  ownerId: 'user_1',
  status: 'active',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  theme: null,
  themeEnabled: false,
}

describe('ApplicationThemeEditor — primary-only UI', () => {
  beforeEach(() => {
    mockMutate.mockReset()
  })

  it('renders the primary color field', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.getByLabelText(/primary/i)).toBeTruthy()
  })

  it('renders the logo URL field', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.getByLabelText(/logo/i)).toBeTruthy()
  })

  it('renders the enable toggle', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.getByLabelText(texts.themeEnableLabel)).toBeTruthy()
  })

  it('does NOT render a Background field', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.queryByLabelText(/background/i)).toBeNull()
  })

  it('does NOT render a Foreground field', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.queryByLabelText(/foreground/i)).toBeNull()
  })

  it('does NOT render an Accent field', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)
    expect(screen.queryByLabelText(/accent/i)).toBeNull()
  })

  it('save mutation payload contains only primary + logo + themeEnabled', () => {
    render(<ApplicationThemeEditor application={fakeApp} texts={texts} />)

    const primaryInput = screen.getByLabelText(/primary/i) as HTMLInputElement
    fireEvent.change(primaryInput, { target: { value: '#00D9F7' } })

    const logoInput = screen.getByLabelText(/logo/i) as HTMLInputElement
    fireEvent.change(logoInput, { target: { value: 'https://cdn.example.com/logo.svg' } })

    const saveButton = screen.getByText(texts.themeSave)
    fireEvent.click(saveButton)

    expect(mockMutate).toHaveBeenCalledTimes(1)
    const payload = mockMutate.mock.calls[0][0]
    expect(payload).toEqual({
      id: 'app_1',
      data: {
        theme: { primary: '#00D9F7', logo: 'https://cdn.example.com/logo.svg' },
        themeEnabled: false,
      },
    })
    // Defensive: assert the payload does NOT include legacy fields
    expect(payload.data.theme).not.toHaveProperty('background')
    expect(payload.data.theme).not.toHaveProperty('foreground')
    expect(payload.data.theme).not.toHaveProperty('accent')
  })

  it('sends theme=null when primary + logo are both cleared', () => {
    const appWithTheme: Application = {
      ...fakeApp,
      theme: { primary: '#00D9F7', logo: 'https://cdn.example.com/logo.svg' },
      themeEnabled: true,
    }
    render(<ApplicationThemeEditor application={appWithTheme} texts={texts} />)

    const primaryInput = screen.getByLabelText(/primary/i) as HTMLInputElement
    fireEvent.change(primaryInput, { target: { value: '' } })

    const logoInput = screen.getByLabelText(/logo/i) as HTMLInputElement
    fireEvent.change(logoInput, { target: { value: '' } })

    const saveButton = screen.getByText(texts.themeSave)
    fireEvent.click(saveButton)

    expect(mockMutate).toHaveBeenCalledTimes(1)
    const payload = mockMutate.mock.calls[0][0]
    expect(payload.data.theme).toBeNull()
  })
})
