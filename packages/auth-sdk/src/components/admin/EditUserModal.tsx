'use client'

import {
  Button,
  Checkbox,
  Div,
  H2,
  Img,
  Input,
  Label,
  Modal,
  P,
  Spinner,
  Switch,
} from '@ezstart/ui/components'
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

export interface EditUserModalProps {
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
  /**
   * Optional locale to pass to the verification email template when the
   * admin changes the user's email. Defaults to backend resolution
   * (Accept-Language → user locale).
   */
  emailVerificationLocale?: 'en' | 'fr' | 'vi'
  /**
   * Optional app slug to brand the verification email when the admin
   * changes the user's email. Defaults to `'ezauth'`.
   */
  emailVerificationApp?: string
}

interface EditUserModalState {
  // Profile
  firstName: string
  lastName: string
  email: string
  // Roles
  globalRoles: string[]
  appRoles: Record<string, string[]>
  // Status
  isVerified: boolean
  isActive: boolean
  mustChangePassword: boolean
}

interface UpdateUserResponse {
  user: AdminUser
  message: string
  verificationEmailSent?: boolean
}

/**
 * Modal that lets a superadmin edit a user. Three sections:
 *
 * 1. Profile — firstName / lastName / email + read-only avatar with deep-link
 *    explanation
 * 2. Roles  — global roles + per-app roles (existing logic preserved)
 * 3. Status — isVerified (force-verify) / isActive (soft-delete toggle) /
 *    mustChangePassword (force re-set on next login)
 *
 * Email change side-effect: when the admin saves a new email, the backend
 * resets `isVerified` to false and sends a fresh verification link to the
 * new address. The response surfaces `verificationEmailSent: true` so we
 * toast a confirmation.
 *
 * Internal sub-component of `<AuthAdminDashboard>`.
 *
 * @internal
 */
export function EditUserModal({
  user,
  open,
  onOpenChange,
  onSaved,
  t,
  getToken,
  emailVerificationLocale,
  emailVerificationApp,
}: EditUserModalProps) {
  const [state, setState] = useState<EditUserModalState>({
    firstName: '',
    lastName: '',
    email: '',
    globalRoles: [],
    appRoles: {},
    isVerified: false,
    isActive: true,
    mustChangePassword: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset state whenever the selected user changes — happens both on open
  // and on close (defensive: prevents stale data leaking to the next user).
  useEffect(() => {
    if (user) {
      setState({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        globalRoles: [...(user.globalRoles || [])],
        appRoles: Object.fromEntries(
          Object.entries(user.appRoles || {}).map(([app, roles]) => [app, [...(roles || [])]])
        ),
        isVerified: user.isVerified ?? false,
        isActive: !user.deletedAt,
        mustChangePassword: user.mustChangePassword ?? false,
      })
      setError('')
    }
  }, [user])

  const handleGlobalRoleToggle = useCallback((role: string) => {
    setState(prev => ({
      ...prev,
      globalRoles: prev.globalRoles.includes(role)
        ? prev.globalRoles.filter(r => r !== role)
        : [...prev.globalRoles, role],
    }))
  }, [])

  const handleAppRoleToggle = useCallback((app: string, role: string) => {
    setState(prev => {
      const current = prev.appRoles[app] || []
      const updated = current.includes(role) ? current.filter(r => r !== role) : [...current, role]
      return { ...prev, appRoles: { ...prev.appRoles, [app]: updated } }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      // Build a delta payload — only send fields that the admin actually
      // touched. Sending the whole state would also re-write firstName/
      // lastName when they're unchanged, which would still trigger the
      // backend's audit log entry (false-positive churn).
      const body: Record<string, unknown> = {
        globalRoles: state.globalRoles,
        appRoles: state.appRoles,
      }
      if (state.firstName !== (user.firstName ?? '')) body.firstName = state.firstName
      if (state.lastName !== (user.lastName ?? '')) body.lastName = state.lastName
      if (state.email !== user.email) body.email = state.email
      if (state.isVerified !== (user.isVerified ?? false)) body.isVerified = state.isVerified
      const wasActive = !user.deletedAt
      if (state.isActive !== wasActive) body.isActive = state.isActive
      if (state.mustChangePassword !== (user.mustChangePassword ?? false)) {
        body.mustChangePassword = state.mustChangePassword
      }
      if (emailVerificationLocale) body.emailVerificationLocale = emailVerificationLocale
      if (emailVerificationApp) body.emailVerificationApp = emailVerificationApp

      const response = await apiCall<UpdateUserResponse>(`/admin/users/${user._id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body,
        getToken,
      })
      toast.success(t.editSuccess)
      if (response?.verificationEmailSent) {
        toast.info(t.emailChangeVerificationSent)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.editError
      setError(message)
      toast.error(t.editError)
    } finally {
      setSaving(false)
    }
  }, [
    user,
    state,
    onSaved,
    onOpenChange,
    t,
    getToken,
    emailVerificationLocale,
    emailVerificationApp,
  ])

  if (!user) return null

  const appNames = Object.keys(state.appRoles || {})

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="xl"
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

        {/* ─── Section 1: Profile ───────────────────────────────────────── */}
        <Div className="space-y-4">
          <H2 size="h5" className="font-semibold">
            {t.profileSectionTitle}
          </H2>

          <Div className="grid gap-4 sm:grid-cols-2">
            <Div className="space-y-2">
              <Label htmlFor="edit-user-firstName">{t.firstNameLabel}</Label>
              <Input
                id="edit-user-firstName"
                value={state.firstName}
                onChange={e => setState(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={saving}
              />
            </Div>
            <Div className="space-y-2">
              <Label htmlFor="edit-user-lastName">{t.lastNameLabel}</Label>
              <Input
                id="edit-user-lastName"
                value={state.lastName}
                onChange={e => setState(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={saving}
              />
            </Div>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="edit-user-email">{t.emailLabel}</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={state.email}
              onChange={e => setState(prev => ({ ...prev, email: e.target.value.trim() }))}
              disabled={saving}
            />
            <P className="text-xs text-muted-foreground">{t.emailChangeHint}</P>
          </Div>

          <Div className="space-y-2">
            <Label>{t.avatarLabel}</Label>
            <Div className="flex items-start gap-3">
              {user.avatar ? (
                <Img
                  src={user.avatar}
                  alt={user.email}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-border object-cover"
                />
              ) : (
                <Div
                  className="h-14 w-14 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground text-lg font-semibold"
                  aria-hidden="true"
                >
                  {(user.firstName?.[0] ?? user.email[0] ?? '?').toUpperCase()}
                </Div>
              )}
              <P className="text-xs text-muted-foreground flex-1">{t.avatarHelp}</P>
            </Div>
          </Div>
        </Div>

        {/* Section divider */}
        <Div className="h-px bg-border" />

        {/* ─── Section 2: Roles ─────────────────────────────────────────── */}
        <Div className="space-y-4">
          <H2 size="h5" className="font-semibold">
            {t.rolesSectionTitle}
          </H2>

          <Div className="space-y-3">
            <Label className="text-sm font-medium">{t.globalRolesLabel}</Label>
            <Div className="space-y-2">
              {ADMIN_GLOBAL_ROLES.map(role => (
                <Div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`global-${role}`}
                    checked={state.globalRoles.includes(role)}
                    onCheckedChange={() => handleGlobalRoleToggle(role)}
                    disabled={saving}
                  />
                  <Label htmlFor={`global-${role}`} className="cursor-pointer">
                    {getAdminRoleLabel(role, t)}
                  </Label>
                </Div>
              ))}
            </Div>
          </Div>

          {appNames.length > 0 ? (
            appNames.map(app => (
              <Div key={app} className="space-y-3">
                <Label className="text-sm font-medium">
                  {t.appRolesLabel.replace('{app}', app)}
                </Label>
                <Div className="space-y-2">
                  {ADMIN_APP_ROLES.map(role => (
                    <Div key={role} className="flex items-center gap-2">
                      <Checkbox
                        id={`${app}-${role}`}
                        checked={(state.appRoles[app] || []).includes(role)}
                        onCheckedChange={() => handleAppRoleToggle(app, role)}
                        disabled={saving}
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

        {/* Section divider */}
        <Div className="h-px bg-border" />

        {/* ─── Section 3: Status ────────────────────────────────────────── */}
        <Div className="space-y-4">
          <H2 size="h5" className="font-semibold">
            {t.statusSectionTitle}
          </H2>

          <Div className="space-y-4">
            <Div className="flex items-start justify-between gap-4">
              <Div className="space-y-1">
                <Label htmlFor="edit-user-isVerified" className="cursor-pointer">
                  {t.isVerifiedLabel}
                </Label>
                <P className="text-xs text-muted-foreground">{t.isVerifiedHelp}</P>
              </Div>
              <Switch
                id="edit-user-isVerified"
                checked={state.isVerified}
                onCheckedChange={checked => setState(prev => ({ ...prev, isVerified: checked }))}
                disabled={saving}
              />
            </Div>

            <Div className="flex items-start justify-between gap-4">
              <Div className="space-y-1">
                <Label htmlFor="edit-user-isActive" className="cursor-pointer">
                  {t.isActiveLabel}
                </Label>
                <P className="text-xs text-muted-foreground">{t.isActiveHelp}</P>
              </Div>
              <Switch
                id="edit-user-isActive"
                checked={state.isActive}
                onCheckedChange={checked => setState(prev => ({ ...prev, isActive: checked }))}
                disabled={saving}
              />
            </Div>

            <Div className="flex items-start justify-between gap-4">
              <Div className="space-y-1">
                <Label htmlFor="edit-user-mustChangePassword" className="cursor-pointer">
                  {t.mustChangePasswordLabel}
                </Label>
                <P className="text-xs text-muted-foreground">{t.mustChangePasswordHelp}</P>
              </Div>
              <Switch
                id="edit-user-mustChangePassword"
                checked={state.mustChangePassword}
                onCheckedChange={checked =>
                  setState(prev => ({ ...prev, mustChangePassword: checked }))
                }
                disabled={saving}
              />
            </Div>
          </Div>
        </Div>
      </Div>
    </Modal>
  )
}
