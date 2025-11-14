'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  P,
  Section,
} from '@ezstart/ui/components'
import { WaitlistManagement } from './components/WaitlistManagement'

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore()
  const rbac = useRBAC(user)

  // Page accessible only for admin, superadmin
  if (!isAuthenticated || !rbac.hasAnyRole(['admin', 'superadmin'])) {
    return (
      <Section size="full">
        <Card>
          <CardHeader>
            <H2>Access Denied</H2>
          </CardHeader>
          <CardContent className="text-center py-12">
            <P className="text-muted-foreground mt-2">
              You need admin or superadmin role to access this panel.
            </P>
            <Badge variant="destructive" className="mt-4">
              Required: Admin or Superadmin
            </Badge>
          </CardContent>
        </Card>
      </Section>
    )
  }

  return (
    <Div size="xs">
      <Section size="xl" className="mt-10">
        <H1>GreenPulse Admin Panel</H1>
        <P className="text-muted-foreground mt-2">
          Manage beta access requests for GreenPulse
        </P>
        <Div className="mt-4 flex gap-2">
          {user?.roles?.map((role) => (
            <Badge
              key={role}
              variant={role === 'superadmin' ? 'destructive' : role === 'admin' ? 'default' : 'secondary'}
            >
              {role}
            </Badge>
          ))}
        </Div>
      </Section>

      {/* Beta Waitlist Management */}
      <Section size="xl" className="mt-8">
        <WaitlistManagement />
      </Section>
    </Div>
  )
}
