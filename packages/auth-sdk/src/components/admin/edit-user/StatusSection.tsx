'use client'

import { Div, H2, Label, P, Switch } from '@ezstart/ui/components'
import type { Dispatch, SetStateAction } from 'react'
import type { AuthUsersSectionTexts } from '../types.js'
import type { EditUserModalState } from './state.js'

interface StatusSectionProps {
  state: EditUserModalState
  setState: Dispatch<SetStateAction<EditUserModalState>>
  saving: boolean
  t: Required<AuthUsersSectionTexts>
}

/**
 * Status sub-section of `<EditUserModal>`: isVerified (force-verify) /
 * isActive (soft-delete toggle) / mustChangePassword (force re-set on next
 * login).
 *
 * @internal
 */
export function StatusSection({ state, setState, saving, t }: StatusSectionProps) {
  return (
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
  )
}
