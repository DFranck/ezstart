'use client'

import { Div, H2, Img, Input, Label, P } from '@ezstart/ui/components'
import type { Dispatch, SetStateAction } from 'react'
import type { AdminUser, AuthUsersSectionTexts } from '../types.js'
import type { EditUserModalState } from './state.js'

interface ProfileSectionProps {
  user: AdminUser
  state: EditUserModalState
  setState: Dispatch<SetStateAction<EditUserModalState>>
  saving: boolean
  t: Required<AuthUsersSectionTexts>
}

/**
 * Profile sub-section of `<EditUserModal>`: firstName / lastName / email +
 * read-only avatar with deep-link explanation.
 *
 * @internal
 */
export function ProfileSection({ user, state, setState, saving, t }: ProfileSectionProps) {
  return (
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
  )
}
