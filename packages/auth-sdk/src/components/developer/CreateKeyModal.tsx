'use client'

import {
  Button,
  Div,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { useState } from 'react'
import type { CreateApiKeyRequest } from '../../core/types.js'
import type { CreateKeyModalTexts } from './types.js'

export interface CreateKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateApiKeyRequest) => void
  isSubmitting: boolean
  texts: CreateKeyModalTexts
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

export function CreateKeyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  texts,
}: CreateKeyModalProps) {
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
      title={texts.title}
      size="default"
      footer={
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? texts.submitting : texts.submit}
        </Button>
      }
    >
      <Div className="space-y-4">
        <Div className="space-y-2">
          <Label htmlFor="key-name">{texts.nameLabel}</Label>
          <Input
            id="key-name"
            placeholder={texts.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </Div>

        <Div className="space-y-2">
          <Label>{texts.appScope}</Label>
          <Select value={appName} onValueChange={setAppName}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="*">{texts.appScopeAll}</SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div className="space-y-2">
          <Label>{texts.expiry}</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">{texts.expiryNever}</SelectItem>
              <SelectItem value="30d">{texts.expiry30d}</SelectItem>
              <SelectItem value="90d">{texts.expiry90d}</SelectItem>
              <SelectItem value="1y">{texts.expiry1y}</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </Div>
    </Modal>
  )
}
