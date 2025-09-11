'use client'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { Icon, Input, Section, Span } from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { LoadingButton } from './LoadingButton'

export function LoginSection() {
  const { player, register, reset } = usePlayerStore()
  const { user, isAuthenticated, logout } = useAuth()
  const [name, setName] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false)

  const validateName = (name: string) => {
    if (!name.trim()) {
      throw new Error('Player name is required')
    }
    if (name.trim().length < 2) {
      throw new Error('Player name must be at least 2 characters')
    }
    if (name.trim().length > 20) {
      throw new Error('Player name must be less than 20 characters')
    }
    // Vérifier les caractères spéciaux
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name.trim())) {
      throw new Error('Player name contains invalid characters')
    }
  }

  // Auto-create player when authenticated and no player exists
  useEffect(() => {
    if (isAuthenticated && user && !player && !isCreatingPlayer) {
      setIsCreatingPlayer(true)
      register(user.username, user._id)
        .then(() => {
          console.log('Player auto-created for authenticated user')
        })
        .catch(err => {
          console.error('Failed to auto-create player:', err)
        })
        .finally(() => {
          setIsCreatingPlayer(false)
        })
    }
  }, [isAuthenticated, user, player, register, isCreatingPlayer])

  const handleCreatePlayer = async () => {
    if (!name.trim() || !user) return

    validateName(name)

    return runWithFeedback({
      action: async () => {
        const player = await register(name.trim(), user._id)
        return player
      },
      toastLoading: { message: 'Creating player...' },
      toastSuccess: { message: `Welcome, ${name.trim()}!` },
      toastError: { message: 'Failed to create player' },
      onLoadingChange: setIsLoggingIn,
      onError: err => {
        console.error('Failed to register player', err)
      },
    })
  }

  const handleLogout = () => {
    return runWithFeedback({
      action: async () => {
        await logout()
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

  // Show loading while auto-creating player
  if (isAuthenticated && user && !player && isCreatingPlayer) {
    return (
      <Section className="flex flex-col gap-4">
        <div className="text-center">
          <Icon name="fa:FaSpinner" spin className="w-6 h-6 mb-2 mx-auto" />
          <p className="text-gray-600">Setting up your player profile...</p>
        </div>
      </Section>
    )
  }

  return (
    <Section className="flex flex-col gap-4">
      {!isAuthenticated ? (
        <div className="text-center">
          <LoginButton size="sm" loadingText="Redirecting to EZAuth...">
            Login with EZAuth
          </LoginButton>
        </div>
      ) : !player ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleCreatePlayer()
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Welcome, {user?.username}! Choose your player name:
            </p>
            <Input
              placeholder="Player name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-fit"
              maxLength={20}
              disabled={isLoggingIn}
            />
          </div>
          <LoadingButton
            loading={isLoggingIn}
            disabled={!name.trim()}
            loadingText="Creating player..."
            icon="fa:FaGamepad"
          >
            Create Player
          </LoadingButton>
        </form>
      ) : (
        <>
          <Span className="text-lg font-semibold flex items-center gap-2">
            <Icon name="fa:FaUserCheck" className="text-green-500" />
            Playing as {player.name}
            <span className="text-sm text-gray-500 font-normal">({user?.username})</span>
          </Span>
          <LoadingButton variant="outline" onClick={handleLogout} icon="fa:FaSignOutAlt">
            Logout
          </LoadingButton>
        </>
      )}
    </Section>
  )
}
