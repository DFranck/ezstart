'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Checkbox, Div, H2, Label, P, Spinner, Modal } from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'

// ========================================
// Types
// ========================================

interface AdminUser {
  _id: string
  email: string
  username: string
  globalRoles: string[]
  appRoles: Record<string, string[]>
}

interface EditRolesModalProps {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// ========================================
// Constants
// ========================================

const GLOBAL_ROLES = ['superadmin', 'admin'] as const
const APP_ROLES = ['admin', 'manager', 'beta-tester', 'client'] as const

// ========================================
// Component
// ========================================

export function EditRolesModal({ user, open, onOpenChange, onSaved }: EditRolesModalProps) {
  const t = useTranslations('admin.editRoles')
  const tr = useTranslations('admin.roles')

  const [globalRoles, setGlobalRoles] = useState<string[]>([])
  const [appRoles, setAppRoles] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setGlobalRoles([...user.globalRoles])
      setAppRoles(
        Object.fromEntries(Object.entries(user.appRoles).map(([app, roles]) => [app, [...roles]]))
      )
    }
  }, [user])

  const handleGlobalRoleToggle = useCallback((role: string) => {
    setGlobalRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]))
  }, [])

  const handleAppRoleToggle = useCallback((app: string, role: string) => {
    setAppRoles(prev => {
      const current = prev[app] || []
      const updated = current.includes(role) ? current.filter(r => r !== role) : [...current, role]
      return { ...prev, [app]: updated }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      await apiCall(`/admin/users/${user._id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: { globalRoles, appRoles },
      })
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      const message =
        ApiError.isApiError(err) || err instanceof Error ? err.message : t('editError')
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [user, globalRoles, appRoles, onSaved, onOpenChange, t])

  if (!user) return null

  const appNames = Object.keys(appRoles)

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      title={t('title')}
      description={t('subtitle', { email: user.email })}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : t('save')}
          </Button>
        </>
      }
    >
      <Div className="space-y-6 py-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </Div>
        )}

        {/* Global Roles */}
        <Div className="space-y-3">
          <H2 size="h5" className="font-semibold">
            {t('globalRoles')}
          </H2>
          <Div className="space-y-2">
            {GLOBAL_ROLES.map(role => (
              <Div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`global-${role}`}
                  checked={globalRoles.includes(role)}
                  onCheckedChange={() => handleGlobalRoleToggle(role)}
                />
                <Label htmlFor={`global-${role}`} className="cursor-pointer">
                  {tr(role)}
                </Label>
              </Div>
            ))}
          </Div>
        </Div>

        {/* App Roles */}
        {appNames.length > 0 ? (
          appNames.map(app => (
            <Div key={app} className="space-y-3">
              <H2 size="h5" className="font-semibold">
                {t('appRoles', { app })}
              </H2>
              <Div className="space-y-2">
                {APP_ROLES.map(role => (
                  <Div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={`${app}-${role}`}
                      checked={(appRoles[app] || []).includes(role)}
                      onCheckedChange={() => handleAppRoleToggle(app, role)}
                    />
                    <Label htmlFor={`${app}-${role}`} className="cursor-pointer">
                      {tr(role)}
                    </Label>
                  </Div>
                ))}
              </Div>
            </Div>
          ))
        ) : (
          <P className="text-muted-foreground text-sm">{t('noAppRoles')}</P>
        )}
      </Div>
    </Modal>
  )
}
