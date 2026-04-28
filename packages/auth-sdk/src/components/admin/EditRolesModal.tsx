'use client'

import { Button, Checkbox, Div, H2, Label, Modal, P, Spinner } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { toast } from '@ezstart/ui/utils'
import { useCallback, useEffect, useState } from 'react'
import {
  ADMIN_APP_ROLES,
  ADMIN_GLOBAL_ROLES,
  type AdminUser,
  type AuthUsersSectionTexts,
  getAdminRoleLabel,
} from './types.js'

export interface EditRolesModalProps {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  t: Required<AuthUsersSectionTexts>
  /**
   * Resolve the bearer token for admin API calls. May return null when no
   * token is available — the call will proceed unauthenticated and the
   * server will reject with 401.
   */
  getToken: () => string | Promise<string | null> | null
  /** Optional base URL override forwarded to `apiCall` for federated admin embeds. */
  apiUrl?: string
}

/**
 * Modal that lets a superadmin edit the global + per-app role assignments
 * for a single user. Internal sub-component of `<AuthAdminDashboard>`.
 *
 * @internal
 */
export function EditRolesModal({
  user,
  open,
  onOpenChange,
  onSaved,
  t,
  getToken,
  apiUrl,
}: EditRolesModalProps) {
  const [globalRoles, setGlobalRoles] = useState<string[]>([])
  const [appRoles, setAppRoles] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setGlobalRoles([...(user.globalRoles || [])])
      setAppRoles(
        Object.fromEntries(
          Object.entries(user.appRoles || {}).map(([app, roles]) => [app, [...(roles || [])]])
        )
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
        getToken,
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
      })
      toast.success(t.editSuccess)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.editError
      setError(message)
      toast.error(t.editError)
    } finally {
      setSaving(false)
    }
  }, [user, globalRoles, appRoles, onSaved, onOpenChange, t, getToken, apiUrl])

  if (!user) return null

  const appNames = Object.keys(appRoles || {})

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      title={t.editRolesTitle}
      description={t.editRolesSubtitle.replace('{email}', user.email)}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : t.save}
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
            {t.globalRolesLabel}
          </H2>
          <Div className="space-y-2">
            {ADMIN_GLOBAL_ROLES.map(role => (
              <Div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`global-${role}`}
                  checked={globalRoles.includes(role)}
                  onCheckedChange={() => handleGlobalRoleToggle(role)}
                />
                <Label htmlFor={`global-${role}`} className="cursor-pointer">
                  {getAdminRoleLabel(role, t)}
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
                {t.appRolesLabel.replace('{app}', app)}
              </H2>
              <Div className="space-y-2">
                {ADMIN_APP_ROLES.map(role => (
                  <Div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={`${app}-${role}`}
                      checked={(appRoles[app] || []).includes(role)}
                      onCheckedChange={() => handleAppRoleToggle(app, role)}
                    />
                    <Label htmlFor={`${app}-${role}`} className="cursor-pointer">
                      {getAdminRoleLabel(role, t)}
                    </Label>
                  </Div>
                ))}
              </Div>
            </Div>
          ))
        ) : (
          <P className="text-muted-foreground text-sm">{t.noAppRoles}</P>
        )}
      </Div>
    </Modal>
  )
}
