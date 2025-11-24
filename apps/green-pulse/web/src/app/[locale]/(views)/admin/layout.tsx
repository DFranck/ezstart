'use client'

import { AccessDenied, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Button, Card, Div, Icon, Section, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: 'lucide:LayoutDashboard' as const,
    exact: true,
  },
  {
    href: '/admin/prompts',
    label: 'System Prompts',
    icon: 'lucide:MessageSquare' as const,
  },
  {
    href: '/admin/waitlist',
    label: 'Beta Waitlist',
    icon: 'lucide:UserPlus' as const,
  },
  { href: '/chat', label: 'Chat', icon: 'lucide:Bot' as const },
]

function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href || pathname === `/en${href}` || pathname === `/fr${href}`
    }
    return (
      pathname.startsWith(href) ||
      pathname.startsWith(`/en${href}`) ||
      pathname.startsWith(`/fr${href}`)
    )
  }

  return (
    <aside className="w-64 border-r bg-card min-h-[calc(100vh-4rem)] p-4 hidden md:block">
      <nav className="space-y-1">
        {ADMIN_NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive(item.href, item.exact) ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              size="sm"
            >
              <Icon name={item.icon} className="mr-2" size={16} />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function AdminMobileNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href || pathname === `/en${href}` || pathname === `/fr${href}`
    }
    return (
      pathname.startsWith(href) ||
      pathname.startsWith(`/en${href}`) ||
      pathname.startsWith(`/fr${href}`)
    )
  }

  return (
    <Div className="md:hidden border-b p-2 flex gap-2 overflow-x-auto">
      {ADMIN_NAV_ITEMS.map(item => (
        <Link key={item.href} href={item.href}>
          <Button variant={isActive(item.href, item.exact) ? 'secondary' : 'outline'} size="sm">
            <Icon name={item.icon} className="mr-1" size={14} />
            {item.label}
          </Button>
        </Link>
      ))}
    </Div>
  )
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <Div className="flex w-full min-h-[calc(100vh-4rem)] mt-16">
      <AdminSidebar />
      <Div className="flex-1">
        <AdminMobileNav />
        <Div className="p-6">{children}</Div>
      </Div>
    </Div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </RequireRole>
    </RequireAuth>
  )
}
