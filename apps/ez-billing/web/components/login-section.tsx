'use client'

import { useUserStore } from '@/stores/useUserStore'
import { Icon, Input, Section, Span } from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { useState } from 'react'
import { LoadingButton } from './loading-button'

export function LoginSection() {
  const { user, register, reset } = useUserStore()
  const [username, setUsername] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const validateUsername = (username: string) => {
    if (!username.trim()) {
      throw new Error('Username is required')
    }
    if (username.trim().length < 2) {
      throw new Error('Username must be at least 2 characters')
    }
    if (username.trim().length > 20) {
      throw new Error('Username must be less than 20 characters')
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      throw new Error('Username contains invalid characters')
    }
  }

  const handleLogin = async () => {
    if (!username.trim()) return

    validateUsername(username)

    return runWithFeedback({
      action: async () => {
        const user = await register(username.trim())
        return user
      },
      toastLoading: { message: 'Logging in...' },
      toastSuccess: { message: `Welcome, ${username.trim()}!` },
      toastError: { message: 'Failed to login' },
      onLoadingChange: setIsLoggingIn,
      onError: err => {
        console.error('Failed to register user', err)
      },
    })
  }

  const handleLogout = () => {
    return runWithFeedback({
      action: async () => {
        reset()
        return true
      },
      toastSuccess: { message: 'Logged out successfully' },
      toastError: { message: 'Failed to logout' },
      onError: err => {
        console.error('Failed to logout', err)
      },
    })
  }

  return (
    <Section className="flex flex-col gap-4">
      {!user ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleLogin()
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-fit"
            maxLength={20}
            disabled={isLoggingIn}
          />
          <LoadingButton
            loading={isLoggingIn}
            disabled={!username.trim()}
            loadingText="Logging in..."
            icon="fa:FaSignInAlt"
          >
            Continue
          </LoadingButton>
        </form>
      ) : (
        <>
          <Span className="text-lg font-semibold flex items-center gap-2">
            <Icon name="fa:FaUserCheck" className="text-green-500" />
            Connected as {user.username}
          </Span>
          <LoadingButton variant="outline" onClick={handleLogout} icon="fa:FaSignOutAlt">
            Logout
          </LoadingButton>
        </>
      )}
    </Section>
  )
}