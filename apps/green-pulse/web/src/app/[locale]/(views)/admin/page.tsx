'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Icon,
  P,
  Section,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { WaitlistManagement } from './components/WaitlistManagement'

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore()
  const t = useTranslations()
  const rbac = useRBAC(user)

  // Page accessible only for manager, admin, superadmin
  if (!isAuthenticated || !rbac.hasAnyRole(['manager', 'admin', 'superadmin'])) {
    return (
      <Section size="full">
        <Card>
          <CardHeader>
            <H2>Access Denied</H2>
          </CardHeader>
          <CardContent className="text-center py-12">
            <P className="text-muted-foreground mt-2">
              You need manager, admin or superadmin role to access this panel.
            </P>
            <Badge variant="destructive" className="mt-4">
              Required: Manager, Admin or Superadmin
            </Badge>
          </CardContent>
        </Card>
      </Section>
    )
  }

  const isSuperAdmin = rbac.hasRole('superadmin')
  const isAdmin = rbac.hasRole('admin')
  const isManager = rbac.hasRole('manager')

  return (
    <Div size="xs">
      <Section size="xl" className="mt-10">
        <H1>GreenPulse Admin Panel</H1>
        <P className="text-muted-foreground mt-2">
          Manage GreenPulse settings and content
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

      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Form Management - Manager+ */}
        {(isManager || isAdmin || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <H2 className="flex items-center gap-2">
                <Icon name="lucide:FileText" />
                Forms Management
              </H2>
            </CardHeader>
            <CardContent>
              <P className="text-sm text-muted-foreground mb-4">
                Create, edit and manage BIDV forms
              </P>
              <Button asChild className="w-full">
                <Link href="/admin/forms">
                  <Icon name="lucide:Settings" className="mr-2" />
                  Manage Forms
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* User Management - Admin+ */}
        {(isAdmin || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <H2 className="flex items-center gap-2">
                <Icon name="lucide:Users" />
                User Management
              </H2>
            </CardHeader>
            <CardContent>
              <P className="text-sm text-muted-foreground mb-4">
                View and manage GreenPulse users
              </P>
              <Button asChild className="w-full" variant="secondary">
                <Link href="https://www.ezstart.xyz/admin" target="_blank">
                  <Icon name="lucide:ExternalLink" className="mr-2" />
                  EZStart Admin Panel
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analytics - Manager+ */}
        {(isManager || isAdmin || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <H2 className="flex items-center gap-2">
                <Icon name="lucide:BarChart" />
                Analytics
              </H2>
            </CardHeader>
            <CardContent>
              <P className="text-sm text-muted-foreground mb-4">
                View form submissions and usage stats
              </P>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/analytics">
                  <Icon name="lucide:TrendingUp" className="mr-2" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Settings - Admin+ */}
        {(isAdmin || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <H2 className="flex items-center gap-2">
                <Icon name="lucide:Settings" />
                App Settings
              </H2>
            </CardHeader>
            <CardContent>
              <P className="text-sm text-muted-foreground mb-4">
                Configure GreenPulse application settings
              </P>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/settings">
                  <Icon name="lucide:Sliders" className="mr-2" />
                  Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Database - Superadmin only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <H2 className="flex items-center gap-2">
                <Icon name="lucide:Database" />
                Database
              </H2>
            </CardHeader>
            <CardContent>
              <P className="text-sm text-muted-foreground mb-4">
                Direct database access and management
              </P>
              <Button asChild className="w-full" variant="destructive">
                <Link href="/admin/database">
                  <Icon name="lucide:AlertTriangle" className="mr-2" />
                  Database Admin
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </Div>

      {/* Beta Waitlist Management - Admin+ */}
      {(isAdmin || isSuperAdmin) && (
        <Section size="xl" className="mt-12">
          <WaitlistManagement />
        </Section>
      )}

      {/* Quick Actions */}
      <Section size="xl" className="mt-12">
        <H2 className="mb-6">Quick Actions</H2>
        <Div className="flex flex-wrap gap-4">
          {(isManager || isAdmin || isSuperAdmin) && (
            <Button variant="outline">
              <Icon name="lucide:Plus" className="mr-2" />
              New Form
            </Button>
          )}
          {(isAdmin || isSuperAdmin) && (
            <Button variant="outline">
              <Icon name="lucide:Mail" className="mr-2" />
              Send Notification
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="outline">
              <Icon name="lucide:Download" className="mr-2" />
              Export Data
            </Button>
          )}
        </Div>
      </Section>
    </Div>
  )
}
