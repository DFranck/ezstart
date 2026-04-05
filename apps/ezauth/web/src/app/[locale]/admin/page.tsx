'use client'

import { useTranslations } from 'next-intl'
import {
  Card,
  Div,
  H1,
  Main,
  P,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { RequireRole } from '@ezstart/rbac'
import { UserTable } from './components/user-table'
import { WaitlistTable } from './components/waitlist-table'

// ========================================
// Access Denied Fallback
// ========================================

function AccessDenied() {
  const t = useTranslations('admin')

  return (
    <Main className="container mx-auto py-12 px-4">
      <Div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          <H1 className="text-2xl font-bold mb-4">{t('accessDenied')}</H1>
          <P className="text-muted-foreground">{t('accessDeniedDescription')}</P>
        </Card>
      </Div>
    </Main>
  )
}

// ========================================
// Admin Page
// ========================================

export default function AdminPage() {
  const t = useTranslations('admin')

  return (
    <RequireRole
      roles={['superadmin', 'admin']}
      appName="ezauth"
      fallbackComponent={<AccessDenied />}
    >
      <Main className="container mx-auto py-8 px-4 min-h-screen">
        {/* Header */}
        <Div className="mb-8">
          <H1 className="text-3xl font-bold">{t('title')}</H1>
        </Div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
            <TabsTrigger value="waitlist">{t('tabs.waitlist')}</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserTable />
          </TabsContent>

          <TabsContent value="waitlist" className="mt-6">
            <WaitlistTable />
          </TabsContent>
        </Tabs>
      </Main>
    </RequireRole>
  )
}
