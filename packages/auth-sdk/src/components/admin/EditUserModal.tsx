'use client'

import { Button, Div, Modal, Spinner } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { toast } from '@ezstart/ui/utils'
import { useCallback, useEffect, useState } from 'react'
import { type AdminUser, type AuthUsersSectionTexts } from './types.js'
import {
  buildPatchBody,
  type EditUserModalState,
  stateFromUser,
  type UpdateUserResponse,
} from './edit-user/state.js'
import { ProfileSection } from './edit-user/ProfileSection.js'
import { RolesSection } from './edit-user/RolesSection.js'
import { StatusSection } from './edit-user/StatusSection.js'

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

const INITIAL_STATE: EditUserModalState = {
  firstName: '',
  lastName: '',
  email: '',
  globalRoles: [],
  appRoles: {},
  isVerified: false,
  isActive: true,
  mustChangePassword: false,
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
  const [state, setState] = useState<EditUserModalState>(INITIAL_STATE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset state whenever the selected user changes — happens both on open
  // and on close (defensive: prevents stale data leaking to the next user).
  useEffect(() => {
    if (user) {
      setState(stateFromUser(user))
      setError('')
    }
  }, [user])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const body = buildPatchBody(user, state, {
        ...(emailVerificationLocale ? { emailVerificationLocale } : {}),
        ...(emailVerificationApp ? { emailVerificationApp } : {}),
      })

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

        <ProfileSection user={user} state={state} setState={setState} saving={saving} t={t} />

        {/* Section divider */}
        <Div className="h-px bg-border" />

        <RolesSection state={state} setState={setState} saving={saving} t={t} />

        {/* Section divider */}
        <Div className="h-px bg-border" />

        <StatusSection state={state} setState={setState} saving={saving} t={t} />
      </Div>
    </Modal>
  )
}
