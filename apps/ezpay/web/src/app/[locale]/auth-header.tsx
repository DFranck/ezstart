'use client'

import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export function AuthHeader() {
  const t = useTranslations('auth')
  const { user, isAuthenticated } = useAuth()

  return (
    <Div className="flex items-center justify-end gap-4 mb-6">
      {isAuthenticated && user && (
        <P size="sm" variant="description">
          {user.username || user.email}
        </P>
      )}
      <LoginButton
        loginText={t('login')}
        logoutText={t('logout')}
        variant={isAuthenticated ? 'outline' : 'default'}
        size="sm"
        alwaysShowText
      />
    </Div>
  )
}
