'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, Div, H1, Icon, Main, P } from '@ezstart/ui/components'
import { ReactNode } from 'react'

interface TestGuardProps {
  children: ReactNode
}

export function TestGuard({ children }: TestGuardProps) {
  const t = useTranslations('test')
  const { user } = useAuth()

  const isDev = process.env.NODE_ENV !== 'production'
  const isAdmin =
    user?.globalRoles?.includes('superadmin') || user?.appRoles?.['ezpay']?.includes('admin')

  if (!isDev && !isAdmin) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <Div className="max-w-md mx-auto text-center">
          <Card className="p-8">
            <Icon name="lucide:ShieldAlert" className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <H1 className="text-2xl font-bold mb-2">{t('accessDenied')}</H1>
            <P variant="description">{t('accessDeniedDesc')}</P>
          </Card>
        </Div>
      </Main>
    )
  }

  return <>{children}</>
}
