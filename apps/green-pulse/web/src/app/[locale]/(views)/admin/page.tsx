'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { Badge, Card, CardContent, CardHeader, Div, H1, H3, Icon, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const t = useTranslations('admin')
  const { user } = useAuthStore()

  const ADMIN_CARDS = [
    {
      href: '/admin/prompts',
      title: t('cards.systemPrompts.title'),
      description: t('cards.systemPrompts.description'),
      icon: 'lucide:MessageSquare' as const,
      color: 'text-primary',
    },
    {
      href: '/admin/waitlist',
      title: t('cards.betaWaitlist.title'),
      description: t('cards.betaWaitlist.description'),
      icon: 'lucide:UserPlus' as const,
      color: 'text-primary',
    },
    {
      href: '/admin/users',
      title: t('cards.users.title'),
      description: t('cards.users.description'),
      icon: 'lucide:Users' as const,
      color: 'text-primary',
    },
    {
      href: '/admin/payments',
      title: t('cards.payments.title'),
      description: t('cards.payments.description'),
      icon: 'lucide:CreditCard' as const,
      color: 'text-primary',
    },
  ]

  // Gather all roles from globalRoles and appRoles
  const allRoles = [...(user?.globalRoles || []), ...(user?.appRoles?.['green-pulse'] || [])]

  return (
    <Div>
      <Div className="mb-8">
        <H1>{t('dashboard.title')}</H1>
        <P className="text-muted-foreground mt-2">
          {t('dashboard.welcomeBack', {
            name: user?.firstName || user?.username || user?.email || '',
          })}
        </P>
        <Div className="mt-4 flex gap-2 flex-wrap">
          {allRoles.map((role, idx) => (
            <Badge
              key={`${role}-${idx}`}
              variant={
                role === 'superadmin' ? 'destructive' : role === 'admin' ? 'default' : 'secondary'
              }
            >
              {role === 'superadmin' ? 'superadmin (global)' : role}
            </Badge>
          ))}
        </Div>
      </Div>

      {/* Quick access cards */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_CARDS.map(card => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <Div className="flex items-center gap-3">
                  <Div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                    <Icon name={card.icon} size={24} />
                  </Div>
                  <H3>{card.title}</H3>
                </Div>
              </CardHeader>
              <CardContent>
                <P className="text-sm text-muted-foreground">{card.description}</P>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Div>
    </Div>
  )
}
