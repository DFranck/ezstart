'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  Input,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import type { ConnectAccountType } from '../core/types.js'

export interface ConnectOnboardFormTexts {
  title?: string
  description?: string
  emailLabel?: string
  emailPlaceholder?: string
  businessNameLabel?: string
  businessNamePlaceholder?: string
  accountTypeLabel?: string
  standard?: string
  express?: string
  submit?: string
  submitting?: string
}

export interface ConnectOnboardFormProps {
  /**
   * Required — the ezauth Application this Connect account will be scoped to.
   * Passed through to the API so the server can validate ownership and persist
   * the account with the correct `applicationId`.
   */
  applicationId: string
  onSubmit: (data: {
    applicationId: string
    email: string
    businessName: string
    type: ConnectAccountType
  }) => void
  isSubmitting?: boolean
  className?: string
  texts?: ConnectOnboardFormTexts
}

export function ConnectOnboardForm({
  applicationId,
  onSubmit,
  isSubmitting = false,
  className,
  texts,
}: ConnectOnboardFormProps) {
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [accountType, setAccountType] = useState<ConnectAccountType>('standard')

  const t = {
    title: texts?.title ?? 'Connect with Stripe',
    description: texts?.description ?? 'Link your Stripe account to receive payments.',
    emailLabel: texts?.emailLabel ?? 'Email',
    emailPlaceholder: texts?.emailPlaceholder ?? 'your@email.com',
    businessNameLabel: texts?.businessNameLabel ?? 'Business Name',
    businessNamePlaceholder: texts?.businessNamePlaceholder ?? 'Your Business',
    accountTypeLabel: texts?.accountTypeLabel ?? 'Account Type',
    standard: texts?.standard ?? 'Standard',
    express: texts?.express ?? 'Express',
    submit: texts?.submit ?? 'Start Onboarding',
    submitting: texts?.submitting ?? 'Submitting...',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !businessName) return
    onSubmit({ applicationId, email, businessName, type: accountType })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:Link" className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <P variant="description">{t.description}</P>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t.emailLabel}
            </P>
            <Input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Div>
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t.businessNameLabel}
            </P>
            <Input
              placeholder={t.businessNamePlaceholder}
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
            />
          </Div>
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t.accountTypeLabel}
            </P>
            <Select
              value={accountType}
              onValueChange={v => setAccountType(v as ConnectAccountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t.standard}</SelectItem>
                <SelectItem value="express">{t.express}</SelectItem>
              </SelectContent>
            </Select>
          </Div>
          <Button type="submit" disabled={isSubmitting || !email || !businessName}>
            <Icon name="lucide:Zap" className="mr-2 h-4 w-4" />
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
