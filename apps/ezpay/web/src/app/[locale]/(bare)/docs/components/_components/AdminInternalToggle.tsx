'use client'

import { Badge, Div, Label, Span, Switch } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useId } from 'react'
import { useInternalToggle } from './InternalToggleContext'

/**
 * Superadmin-only switch that reveals `@internal`-tagged components on the
 * `/docs/components` showcase. Hidden from non-admin users — the entire
 * surface is server-side gated in addition to the client-side guard, so
 * non-admins never receive the toggle markup at all.
 *
 * Visual: dense one-row inline group anchored top-right of the page header.
 * When ON, an `ADMIN VIEW` warning badge surfaces so the elevated state is
 * always obvious.
 */
export function AdminInternalToggle() {
  const t = useTranslations('components')
  const { showInternal, isSuperadmin, setShowInternal } = useInternalToggle()
  const switchId = useId()

  if (!isSuperadmin) return null

  return (
    <Div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch
        id={switchId}
        checked={showInternal}
        onCheckedChange={setShowInternal}
        aria-label={t('adminToggleAriaLabel')}
      />
      <Label htmlFor={switchId} className="text-xs cursor-pointer">
        {t('adminToggleShowInternal')}
      </Label>
      {showInternal && (
        <Badge variant="warning" size="xs" className="font-mono uppercase tracking-wider">
          {t('adminToggleAdminView')}
        </Badge>
      )}
    </Div>
  )
}

/**
 * Visual badge attached to internal entries when the admin toggle is on.
 * Lives next to the component name in cards, sidebar entries, and the
 * command palette so the elevated surface is consistently signposted.
 */
export function InternalBadge({ className }: { className?: string }) {
  const t = useTranslations('components')
  return (
    <Badge
      variant="warning"
      size="xs"
      className={['font-mono', className].filter(Boolean).join(' ')}
      title={t('adminToggleInternalTooltip')}
    >
      <Span>{t('adminToggleInternalBadge')}</Span>
    </Badge>
  )
}
