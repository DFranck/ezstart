'use client'

import { RequireAuth, AccessDenied, LoginButton } from '@ezstart/auth-sdk'
import { RequireRole, InsufficientPermissions } from '@ezstart/rbac'
import {
  Card,
  Div,
  H1,
  P,
  Section,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { UsersTab } from './components/users-tab'
import { EZPayTab } from './components/ezpay-tab'
import { MonitoringTab } from './components/monitoring-tab'

function AdminPanelContent() {
  const t = useTranslations()

  return (
    <Div size={'xs'} className="mt-10">
      <Tabs defaultValue="ezauth">
        <TabsList>
          <TabsTrigger value="ezauth">{t('admin.tabs.ezauth')}</TabsTrigger>
          <TabsTrigger value="ezpay">{t('admin.tabs.ezpay')}</TabsTrigger>
          <TabsTrigger value="monitoring">{t('admin.tabs.monitoring')}</TabsTrigger>
        </TabsList>

        <TabsContent value="ezauth">
          <UsersTab />
        </TabsContent>

        <TabsContent value="ezpay">
          <EZPayTab />
        </TabsContent>

        <TabsContent value="monitoring">
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
