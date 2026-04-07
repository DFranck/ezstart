'use client'

import { Button, Icon } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { usePayContext } from '../provider.js'

export interface ManageSubscriptionButtonTexts {
  label?: string
  loadingLabel?: string
  errorMessage?: string
}

export interface ManageSubscriptionButtonProps {
  /** URL to return to after the portal session. Defaults to current page. */
  returnUrl?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  texts?: ManageSubscriptionButtonTexts
}

export function ManageSubscriptionButton({
  returnUrl,
  className,
  variant = 'outline',
  size = 'default',
  texts,
}: ManageSubscriptionButtonProps) {
  const { client } = usePayContext()
  const [loading, setLoading] = useState(false)

  const t = {
    label: texts?.label || 'Manage Subscription',
    loadingLabel: texts?.loadingLabel || 'Loading...',
    errorMessage: texts?.errorMessage || 'Failed to open subscription management',
  }

  const handleClick = async () => {
    setLoading(true)
    try {
      const { url } = await client.createPortalSession(returnUrl)
      window.location.href = url
    } catch (error) {
      logger.error(
        'Portal session failed:',
        error instanceof Error ? error.message : String(error)
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
          {t.loadingLabel}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Icon name="lucide:Settings" className="w-4 h-4" />
          {t.label}
        </span>
      )}
    </Button>
  )
}
