import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'

const registerMock = vi.fn(() => new Promise<never>(() => {}))
const setLoggingInMock = vi.fn()

// Mock useAuth — mirror of what LoginButton consumes
vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    register: registerMock,
    isLoggingIn: false,
    setLoggingIn: setLoggingInMock,
  }),
}))

const { RegisterButton } = await import('../../components/RegisterButton.js')

describe('RegisterButton', () => {
  beforeEach(() => {
    registerMock.mockClear()
    setLoggingInMock.mockClear()
  })

  it('renders default text when no children provided', () => {
    render(<RegisterButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Sign up with EZAuth')
  })

  it('renders children as button text override (i18n hook-in point)', () => {
    render(<RegisterButton>Get started</RegisterButton>)
    expect(screen.getByRole('button')).toHaveTextContent('Get started')
  })

  it('accepts custom registerText when no children', () => {
    render(<RegisterButton registerText="Créer un compte" />)
    expect(screen.getByRole('button')).toHaveTextContent('Créer un compte')
  })

  it('calls register() from useAuth on click (redirect to ezauth)', async () => {
    render(<RegisterButton>Sign up</RegisterButton>)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(setLoggingInMock).toHaveBeenCalledWith(true)
    expect(registerMock).toHaveBeenCalledTimes(1)
  })

  it('calls onClick prop in addition to register', async () => {
    const onClick = vi.fn()
    render(<RegisterButton onClick={onClick}>Sign up</RegisterButton>)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(registerMock).toHaveBeenCalledTimes(1)
  })

  it('does not trigger register when disabled', async () => {
    render(
      <RegisterButton disabled onClick={vi.fn()}>
        Sign up
      </RegisterButton>
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(registerMock).not.toHaveBeenCalled()
    expect(setLoggingInMock).not.toHaveBeenCalled()
  })

  it('does not trigger register when external loading is true', async () => {
    render(<RegisterButton loading>Sign up</RegisterButton>)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(registerMock).not.toHaveBeenCalled()
  })

  it('shows loading text when loading prop is true', () => {
    render(
      <RegisterButton loading loadingText="Please wait...">
        Sign up
      </RegisterButton>
    )
    expect(screen.getByRole('button')).toHaveTextContent('Please wait...')
  })

  it('propagates explicit theme prop to register() as ?theme= param', async () => {
    render(<RegisterButton theme="dark">Sign up</RegisterButton>)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(registerMock).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('auto-detects theme from document.documentElement.classList when prop is omitted', async () => {
    document.documentElement.classList.add('dark')
    try {
      render(<RegisterButton>Sign up</RegisterButton>)

      await act(async () => {
        fireEvent.click(screen.getByRole('button'))
      })

      expect(registerMock).toHaveBeenCalledTimes(1)
      expect(registerMock).toHaveBeenCalledWith({ theme: 'dark' })
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })

  it('omits theme param when no signal is available', async () => {
    // Ensure clean DOM state
    document.documentElement.className = ''
    render(<RegisterButton>Sign up</RegisterButton>)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(registerMock).toHaveBeenCalledWith(undefined)
  })
})
