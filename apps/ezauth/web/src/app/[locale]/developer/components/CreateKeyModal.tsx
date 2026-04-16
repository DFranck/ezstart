'use client'

import { Button, Div, Input, Label, Modal, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface CreateKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; appName: string; expiresAt: string | null }) => void
  isSubmitting: boolean
}

function computeExpiryDate(option: string): string | null {
  if (option === 'never') return null
  const now = new Date()
  const days: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 }
  const d = days[option]
  if (!d) return null
  now.setDate(now.getDate() + d)
  return now.toISOString()
}

export function CreateKeyModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateKeyModalProps) {
  const t = useTranslations('developer.create')
  const [name, setName] = useState('')
  const [appName, setAppName] = useState('*')
  const [expiry, setExpiry] = useState('never')

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      appName,
      expiresAt: computeExpiryDate(expiry),
    })
  }

  const handleClose = () => {
    setName('')
    setAppName('*')
    setExpiry('never')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('title')}
      size="default"
      footer={
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      }
    >
      <Div className="space-y-4">
        <Div className="space-y-2">
          <Label htmlFor="key-name">{t('nameLabel')}</Label>
          <Input
            id="key-name"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
          />
        </Div>

        <Div className="space-y-2">
          <Label>{t('appScope')}</Label>
          <Select value={appName} onValueChange={setAppName}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="*">{t('appScopeAll')}</SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div className="space-y-2">
          <Label>{t('expiry')}</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">{t('expiryNever')}</SelectItem>
              <SelectItem value="30d">{t('expiry30d')}</SelectItem>
              <SelectItem value="90d">{t('expiry90d')}</SelectItem>
              <SelectItem value="1y">{t('expiry1y')}</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </Div>
    </Modal>
  )
}
