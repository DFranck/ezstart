'use client'

import { AccessDenied, LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Badge, Card, Div, H1, P, Section, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { WaitlistManagement } from './components/WaitlistManagement'
import { PromptsManagement } from './components/PromptsManagement'

function AdminPageContent() {
  const { user } = useAuthStore()

  // Gather all roles from globalRoles and appRoles
  const allRoles = [...(user?.globalRoles || []), ...(user?.appRoles?.['green-pulse'] || [])]

  return (
    <Div size="xs">
      <Section size="xl" className="mt-10">
        <H1>GreenPulse Admin Panel</H1>
        <P className="text-muted-foreground mt-2">Manage beta access and AI system prompts</P>
        <Div className="mt-4 flex gap-2">
          {allRoles.map((role, idx) => (
            <Badge
              key={`${role}-${idx}`}
              variant={
                role === 'superadmin' ? 'destructive' : role === 'admin' ? 'default' : 'secondary'
              }
            >
              {role === 'superadmin' ? '🌟 superadmin (global)' : role}
            </Badge>
          ))}
        </Div>
      </Section>

      {/* System Prompts Management */}
      <Section size="xl">
        <PromptsManagement />
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
              <LoginButton alwaysShowText>{t('auth.login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles={['admin', 'superadmin']}
        appName="green-pulse"
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
