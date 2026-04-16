'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  Input,
  P,
  Icon,
} from '@ezstart/ui/components'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ezstart/ui/components'

type OnboardFormProps = {
  onSubmit: (data: { email: string; businessName: string; type: 'standard' | 'express' }) => void
  isSubmitting: boolean
}

export function OnboardForm({ onSubmit, isSubmitting }: OnboardFormProps) {
  const t = useTranslations('developer.connect')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [accountType, setAccountType] = useState<'standard' | 'express'>('standard')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !businessName) return
    onSubmit({ email, businessName, type: accountType })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:Link" className="h-5 w-5 text-primary" />
          {t('notConnected')}
        </CardTitle>
        <P variant="description">{t('notConnectedDescription')}</P>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t('onboard.email')}
            </P>
            <Input
              type="email"
              placeholder={t('onboard.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Div>
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t('onboard.businessName')}
            </P>
            <Input
              placeholder={t('onboard.businessNamePlaceholder')}
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
            />
          </Div>
          <Div className="space-y-2">
            <P size="sm" className="font-medium">
              {t('onboard.accountType')}
            </P>
            <Select
              value={accountType}
              onValueChange={v => setAccountType(v as 'standard' | 'express')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t('onboard.standard')}</SelectItem>
                <SelectItem value="express">{t('onboard.express')}</SelectItem>
              </SelectContent>
            </Select>
          </Div>
          <Button type="submit" disabled={isSubmitting || !email || !businessName}>
            <Icon name="lucide:Zap" className="mr-2 h-4 w-4" />
            {isSubmitting ? t('onboard.submitting') : t('onboard.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
