'use client'

import { useUserStore } from '@/stores/useUserStore'
import { logger } from '@ezstart/logger'
import { Icon, Input, Span, Div } from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LoadingButton } from './loading-button'

export function LoginSection() {
  const { user, register, reset } = useUserStore()
  const [username, setUsername] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const t = useTranslations('login')
  const tAuth = useTranslations('auth')
  const tPlaceholders = useTranslations('placeholders')

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
      toastLoading: { message: t('loggingIn') },
      toastSuccess: { message: t('welcome', { username: username.trim() }) },
      toastError: { message: t('loginFailed') },
      onLoadingChange: setIsLoggingIn,
      onError: err => {
        logger.error('Failed to register user', err)
      },
    })
  }

  const handleLogout = () => {
    return runWithFeedback({
      action: async () => {
        reset()
        return true
      },
      toastSuccess: { message: t('loggedOut') },
      toastError: { message: t('logoutFailed') },
      onError: err => {
        logger.error('Failed to logout', err)
      },
    })
  }

  return (
    <Div className="flex flex-col gap-4">
      {!user ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleLogin()
          }}
          className="space-y-4"
        >
          <Input
            placeholder={tPlaceholders('username')}
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full text-center"
            maxLength={20}
            disabled={isLoggingIn}
          />
          <LoadingButton
            loading={isLoggingIn}
            disabled={!username.trim()}
            loadingText={t('signingIn')}
            className="w-full bg-gradient-to-r from-ezbill-indigo-500 to-ezbill-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Icon name="lucide:ArrowRight" className="w-4 h-4 mr-2" />
            {t('continue')}
          </LoadingButton>
        </form>
      ) : (
        <Div className="text-center space-y-4">
          <Div className="flex items-center justify-center gap-3 p-4 bg-success/10 border border-success/20 rounded-xl">
            <Div className="w-8 h-8 bg-gradient-payment rounded-lg flex items-center justify-center">
              <Icon name="lucide:Check" className="w-4 h-4 text-white" />
            </Div>
            <Span className="text-lg font-semibold text-success">
              {t('connectedAs', { username: user.username })}
            </Span>
          </Div>
          <LoadingButton
            variant="outline"
            onClick={handleLogout}
            className="w-full border-border hover:border-border/80"
          >
            <Icon name="lucide:LogOut" className="w-4 h-4 mr-2" />
            {tAuth('logout')}
          </LoadingButton>
        </Div>
      )}
    </Div>
  )
}
