'use client'

import { AccessDenied, LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Badge, Card, Div, H1, P, Section, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { WaitlistManagement } from './components/WaitlistManagement'

function AdminPageContent() {
  const { user } = useAuthStore()

  return (
    <Div size="xs">
      <Section size="xl" className="mt-10">
        <H1>GreenPulse Admin Panel</H1>
        <P className="text-muted-foreground mt-2">Manage beta access requests for GreenPulse</P>
        <Div className="mt-4 flex gap-2">
          {user?.roles?.map(role => (
            <Badge
              key={role}
              variant={
                role === 'superadmin' ? 'destructive' : role === 'admin' ? 'default' : 'secondary'
              }
            >
              {role}
            </Badge>
          ))}
        </Div>
      </Section>

      {/* Beta Waitlist Management */}
      <Section size="xl">
        <WaitlistManagement />
      </Section>
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
          <Card variant="ghost">
            <AccessDenied>
              <LoginButton>{t('auth.login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles={['admin', 'superadmin']}
        fallbackComponent={
          <Section size="full">
            <Card variant="ghost">
              <InsufficientPermissions requiredRoles={['admin', 'superadmin']} />
            </Card>
          </Section>
        }
      >
        <AdminPageContent />
      </RequireRole>
    </RequireAuth>
  )
}
