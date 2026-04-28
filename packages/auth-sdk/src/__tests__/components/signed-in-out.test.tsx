import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { SignedIn } from '../../components/SignedIn.js'
import { SignedOut } from '../../components/SignedOut.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

function makeWrapper(store: AuthStoreApi) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestAuthProvider store={store}>{children}</TestAuthProvider>
  }
}

describe('SignedIn (component layer)', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('renders children when authenticated', () => {
    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
    })
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <SignedIn>
          <span data-testid="inner">Visible</span>
        </SignedIn>
      </Wrapper>
    )
    expect(screen.getByTestId('inner')).toBeInTheDocument()
  })

  it('renders nothing when NOT authenticated', () => {
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <SignedIn>
          <span>Hidden</span>
        </SignedIn>
      </Wrapper>
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('SignedOut (component layer)', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('renders children when NOT authenticated', () => {
    const Wrapper = makeWrapper(store)
    render(
      <Wrapper>
        <SignedOut>
          <span data-testid="guest">Login please</span>
        </SignedOut>
      </Wrapper>
    )
    expect(screen.getByTestId('guest')).toBeInTheDocument()
  })

  it('renders nothing when authenticated', () => {
    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
    })
    const Wrapper = makeWrapper(store)
    const { container } = render(
      <Wrapper>
        <SignedOut>
          <span>Hidden</span>
        </SignedOut>
      </Wrapper>
    )
    expect(container.innerHTML).toBe('')
  })
})
