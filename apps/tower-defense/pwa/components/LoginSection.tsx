'use client'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Icon, Input, Section, Span } from '@ezstart/ui/components'
import { useState } from 'react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { LoadingButton } from './LoadingButton'

export function LoginSection() {
  const { player, register, reset } = usePlayerStore()
  const [name, setName] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  const { addError } = useErrorHandler({
    maxRetries: 2,
    retryDelay: 1000
  })

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

  const handleLogin = async () => {
    if (!name.trim()) return
    
    try {
      setIsLoggingIn(true)
      
      // Validation côté client
      validateName(name)
      
      await register(name.trim())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register player'
      addError(errorMessage, false)
      console.error('Failed to register player', err)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    try {
      reset()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout'
      addError(errorMessage, false)
    }
  }

  return (
    <Section className="flex flex-col gap-4">
      {!player ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleLogin()
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            placeholder="Player name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-fit"
            maxLength={20}
            disabled={isLoggingIn}
          />
          <LoadingButton
            type="submit"
            loading={isLoggingIn}
            disabled={!name.trim()}
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
            Connected as {player.name}
          </Span>
          <LoadingButton
            variant="outline"
            onClick={handleLogout}
            icon="fa:FaSignOutAlt"
          >
            Logout
          </LoadingButton>
        </>
      )}
    </Section>
  )
}
