'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import {
  Card,
  Div,
  Section,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { EZPayTab } from './components/ezpay-tab'
import { MonitoringTab } from './components/monitoring-tab'
import { UsersTab } from './components/users-tab'

function AdminPanelContent() {
  const t = useTranslations()

  return (
    <Div className="w-full max-w-7xl mx-auto px-4 my-10">
      <Tabs defaultValue="ezauth" className="w-full">
        <TabsList>
          <TabsTrigger value="ezauth">{t('admin.tabs.ezauth')}</TabsTrigger>
          <TabsTrigger value="ezpay">{t('admin.tabs.ezpay')}</TabsTrigger>
          <TabsTrigger value="monitoring">{t('admin.tabs.monitoring')}</TabsTrigger>
        </TabsList>

        <TabsContent value="ezauth" className="w-full">
          <UsersTab />
        </TabsContent>

        <TabsContent value="ezpay" className="w-full">
          <EZPayTab />
        </TabsContent>

        <TabsContent value="monitoring" className="w-full">
          <MonitoringTab />
        </TabsContent>
      </Tabs>
    </Div>
  )
}

export default function AdminPage() {
  const t = useTranslations()

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('auth.login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles="superadmin" />
            </Card>
          </Section>
        }
      >
        <AdminPanelContent />
      </RequireRole>
    </RequireAuth>
  )
}
