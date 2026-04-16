'use client'

import { Badge } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/** Returns a due date indicator badge based on status and date */
export function DueDateBadge({ status, dueDate }: { status: string; dueDate?: string }) {
  const t = useTranslations('documentCard')

  if (status === 'paid') {
    return (
      <Badge variant="success" className="text-xs">
        {t('paid')}
      </Badge>
    )
  }

  if (!dueDate) return null

  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t('overdue')}
      </Badge>
    )
  }

  if (diffDays <= 7) {
    return (
      <Badge variant="warning" className="text-xs">
        {t('dueSoon')}
      </Badge>
    )
  }

  return null
}

/** Returns a validity indicator badge for quotes */
export function ValidityBadge({ status, validUntil }: { status: string; validUntil?: string }) {
  const t = useTranslations('documentCard')

  if (status === 'accepted') {
    return (
      <Badge variant="success" className="text-xs">
        {t('accepted')}
      </Badge>
    )
  }

  if (status === 'rejected' || status === 'declined') {
    return (
      <Badge variant="destructive" className="text-xs">
        {t('declined')}
      </Badge>
    )
  }

  if (!validUntil) return null

  const now = new Date()
  const expiry = new Date(validUntil)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t('expired')}
      </Badge>
    )
  }

  if (diffDays <= 7) {
    return (
      <Badge variant="warning" className="text-xs">
        {t('expiresSoon')}
      </Badge>
    )
  }

  return null
}
