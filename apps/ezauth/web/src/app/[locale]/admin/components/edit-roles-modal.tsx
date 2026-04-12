'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  Checkbox,
  Div,
  H2,
  Label,
  P,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { useMutation } from '@tanstack/react-query'
import { AuthErrorBanner } from '@/components/AuthErrorBanner'

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t('editError'))
      const response = await callApi(`/admin/users/${user._id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: { globalRoles, appRoles },
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t('editError'))
      }
    },
    onSuccess: () => {
      toast.success(t('editSuccess'))
      onSaved()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || t('editError'))
    },
  })

  if (!user) return null

  const saving = saveMutation.isPending
  const appNames = Object.keys(appRoles)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle', { email: user.email })}</DialogDescription>
        </DialogHeader>

        <Div className="space-y-6 py-4">
          {saveMutation.isError && (
            <AuthErrorBanner>
              {saveMutation.error instanceof Error ? saveMutation.error.message : t('editError')}
            </AuthErrorBanner>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saving}>
            {saving ? <Spinner size="sm" /> : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
