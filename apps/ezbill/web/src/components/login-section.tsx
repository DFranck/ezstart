'use client'

import { useUserStore } from '@/stores/useUserStore'
import { Icon, Input, Span } from '@ezstart/ui/components'
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
    <div className="flex flex-col gap-4">
      {!user ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleLogin()
          }}
          className="space-y-4"
        >
          <Input
            placeholder="Enter your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full text-center"
            maxLength={20}
            disabled={isLoggingIn}
          />
          <LoadingButton
            loading={isLoggingIn}
            disabled={!username.trim()}
            loadingText="Signing in..."
            className="w-full bg-gradient-to-r from-ezbill-indigo-500 to-ezbill-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Icon name="lucide:ArrowRight" className="w-4 h-4 mr-2" />
            Continue
          </LoadingButton>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-ezbill-green-500 to-ezbill-emerald-500 rounded-lg flex items-center justify-center">
              <Icon name="lucide:Check" className="w-4 h-4 text-white" />
            </div>
            <Span className="text-lg font-semibold text-success">
              Connected as {user.username}
            </Span>
          </div>
          <LoadingButton 
            variant="outline" 
            onClick={handleLogout}
            className="w-full border-gray-300 hover:border-gray-400"
          >
            <Icon name="lucide:LogOut" className="w-4 h-4 mr-2" />
            Logout
          </LoadingButton>
        </div>
      )}
    </div>
  )
}