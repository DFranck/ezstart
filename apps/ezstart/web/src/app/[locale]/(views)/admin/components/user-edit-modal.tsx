'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import {
  Badge,
  Button,
  Checkbox,
  Div,
  H3,
  Icon,
  Label,
  Modal,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import type { useRBAC } from '@ezstart/rbac'
import { ROLE_PERMISSIONS, ROLE_FEATURES } from '@ezstart/rbac'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface UserEditModalProps {
  user: AuthUser
  currentUser: AuthUser | null
  rbac: ReturnType<typeof useRBAC>
  onClose: () => void
  onSave: () => void
}

const ALL_GLOBAL_ROLES = ['superadmin'] // Only superadmin can be global
const ALL_APP_ROLES = ['admin', 'manager', 'beta-tester', 'client']
const ALL_APPS = ['ezbill', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd', 'ezpay', 'ezauth']

export function UserEditModal({ user, currentUser, rbac, onClose, onSave }: UserEditModalProps) {
  const t = useTranslations('admin')

  // State for new role structure
  const [globalRoles, setGlobalRoles] = useState<string[]>(user.globalRoles || [])
  const [appRoles, setAppRoles] = useState<Record<string, string[]>>(user.appRoles || {})
  const [apps, setApps] = useState<string[]>(user.apps || [])
  const [customPermissions, setCustomPermissions] = useState<string[]>(user.permissions || [])
  const [customFeatures, setCustomFeatures] = useState<string[]>(user.features || [])
  const [isVerified, setIsVerified] = useState(user.isVerified)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSuperAdmin = rbac.hasRole('superadmin')

  // Calculate inherited permissions and features from all roles
  const inheritedPermissions = new Set<string>()
  const inheritedFeatures = new Set<string>()

  // Add permissions from global roles
  globalRoles.forEach(role => {
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
    const roleFeats = ROLE_FEATURES[role as keyof typeof ROLE_FEATURES] || []
    rolePerms.forEach(p => inheritedPermissions.add(p))
    roleFeats.forEach(f => inheritedFeatures.add(f))
  })

  // Add permissions from app-specific roles
  Object.values(appRoles).forEach(roles => {
    roles.forEach(role => {
      const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
      const roleFeats = ROLE_FEATURES[role as keyof typeof ROLE_FEATURES] || []
      rolePerms.forEach(p => inheritedPermissions.add(p))
      roleFeats.forEach(f => inheritedFeatures.add(f))
    })
  })

  const toggleGlobalRole = (role: string) => {
    if (globalRoles.includes(role)) {
      setGlobalRoles(globalRoles.filter(r => r !== role))
    } else {
      setGlobalRoles([...globalRoles, role])
    }
  }

  const toggleAppRole = (app: string, role: string) => {
    const currentRoles = appRoles[app] || []
    if (currentRoles.includes(role)) {
      setAppRoles({
        ...appRoles,
        [app]: currentRoles.filter(r => r !== role),
      })
    } else {
      setAppRoles({
        ...appRoles,
        [app]: [...currentRoles, role],
      })
    }
  }

  const toggleApp = (app: string) => {
    if (apps.includes(app)) {
      // Remove app and its roles
      const newAppRoles = { ...appRoles }
      delete newAppRoles[app]
      setAppRoles(newAppRoles)
      setApps(apps.filter(a => a !== app))
    } else {
      setApps([...apps, app])
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await callApi(`/admin/users/${user._id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: {
          globalRoles,
          appRoles,
          apps,
          permissions: customPermissions,
          features: customFeatures,
          isVerified,
        },
      })

      if (response.ok) {
        onSave()
      } else {
        throw new Error('Failed to update user')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      logger.error('Error updating user:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={t('editModal.title', { username: user.username })}
      footer={
        <Div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('editModal.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {t('editModal.saving')}
              </>
            ) : (
              <>
                <Icon name="lucide:Save" className="mr-2" />
                {t('editModal.saveChanges')}
              </>
            )}
          </Button>
        </Div>
      }
    >
      <Div className="space-y-6">
        {/* User Info */}
        <Div>
          <H3>{t('editModal.userInfo.title')}</H3>
          <Div className="mt-2 space-y-1 text-sm">
            <P>
              <Span className="font-semibold">{t('editModal.userInfo.email')}</Span> {user.email}
            </P>
            <P>
              <Span className="font-semibold">{t('editModal.userInfo.username')}</Span>{' '}
              {user.username}
            </P>
            {user.firstName && (
              <P>
                <Span className="font-semibold">{t('editModal.userInfo.name')}</Span>{' '}
                {user.firstName} {user.lastName}
              </P>
            )}
            <P>
              <Span className="font-semibold">{t('editModal.userInfo.created')}</Span>{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </P>
          </Div>
        </Div>

        {/* Verification Status */}
        <Div>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={isVerified}
              onCheckedChange={checked => setIsVerified(checked as boolean)}
            />
            {t('editModal.emailVerified')}
          </Label>
        </Div>

        {/* Global Roles (Superadmin only) */}
        <Div>
          <H3 className="mb-3">{t('editModal.globalRoles.title')}</H3>
          <P className="text-sm text-muted-foreground mb-2">
            {t('editModal.globalRoles.description')}
          </P>
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_GLOBAL_ROLES.map(role => {
              const disabled = !isSuperAdmin
              return (
                <Label key={role} className="flex items-center gap-2">
                  <Checkbox
                    checked={globalRoles.includes(role)}
                    onCheckedChange={() => toggleGlobalRole(role)}
                    disabled={disabled}
                  />
                  <Span className="capitalize font-semibold text-destructive">{role}</Span>
                  {disabled && <Icon name="lucide:Lock" className="text-muted-foreground" />}
                </Label>
              )
            })}
          </Div>
        </Div>

        {/* Apps and App-Specific Roles */}
        <Div>
          <H3 className="mb-3">{t('editModal.appAccess.title')}</H3>
          <P className="text-sm text-muted-foreground mb-3">
            {t('editModal.appAccess.description')}
          </P>
          <Div className="space-y-4">
            {ALL_APPS.map(app => {
              const hasAccess = apps.includes(app)
              return (
                <Div key={app} className="border rounded-lg p-4">
                  {/* App Checkbox */}
                  <Label className="flex items-center gap-2 mb-3">
                    <Checkbox checked={hasAccess} onCheckedChange={() => toggleApp(app)} />
                    <Span className="capitalize font-semibold">{app}</Span>
                  </Label>

                  {/* App-Specific Roles (only if app is checked) */}
                  {hasAccess && (
                    <Div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_APP_ROLES.map(role => (
                        <Label key={role} className="flex items-center gap-2">
                          <Checkbox
                            checked={appRoles[app]?.includes(role) || false}
                            onCheckedChange={() => toggleAppRole(app, role)}
                          />
                          <Span className="capitalize text-sm">{role}</Span>
                        </Label>
                      ))}
                    </Div>
                  )}
                </Div>
              )
            })}
          </Div>
        </Div>

        {/* Inherited Permissions */}
        {inheritedPermissions.size > 0 && (
          <Div>
            <H3 className="mb-3">{t('editModal.inheritedPermissions')}</H3>
            <Div className="flex flex-wrap gap-1">
              {Array.from(inheritedPermissions).map(perm => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </Div>
          </Div>
        )}

        {/* Inherited Features */}
        {inheritedFeatures.size > 0 && (
          <Div>
            <H3 className="mb-3">{t('editModal.inheritedFeatures')}</H3>
            <Div className="flex flex-wrap gap-1">
              {Array.from(inheritedFeatures).map(feat => (
                <Badge key={feat} variant="default" className="text-xs">
                  {feat}
                </Badge>
              ))}
            </Div>
          </Div>
        )}

        {/* Error Display */}
        {error && (
          <Div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
            <P className="font-medium">{t('editModal.errorSaving')}</P>
            <P className="text-sm mt-1">{error}</P>
          </Div>
        )}
      </Div>
    </Modal>
  )
}
