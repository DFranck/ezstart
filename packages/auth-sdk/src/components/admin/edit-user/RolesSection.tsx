'use client'

import { Checkbox, Div, H2, Label, P } from '@ezstart/ui/components'
import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  ADMIN_APP_ROLES,
  ADMIN_GLOBAL_ROLES,
  type AuthUsersSectionTexts,
  getAdminRoleLabel,
} from '../types.js'
import type { EditUserModalState } from './state.js'

interface RolesSectionProps {
  state: EditUserModalState
  setState: Dispatch<SetStateAction<EditUserModalState>>
  saving: boolean
  t: Required<AuthUsersSectionTexts>
}

/**
 * Roles sub-section of `<EditUserModal>`: global roles + per-app roles.
 *
 * @internal
 */
export function RolesSection({ state, setState, saving, t }: RolesSectionProps) {
  const handleGlobalRoleToggle = useCallback(
    (role: string) => {
      setState(prev => ({
        ...prev,
        globalRoles: prev.globalRoles.includes(role)
          ? prev.globalRoles.filter(r => r !== role)
          : [...prev.globalRoles, role],
      }))
    },
    [setState]
  )

  const handleAppRoleToggle = useCallback(
    (app: string, role: string) => {
      setState(prev => {
        const current = prev.appRoles[app] || []
        const updated = current.includes(role)
          ? current.filter(r => r !== role)
          : [...current, role]
        return { ...prev, appRoles: { ...prev.appRoles, [app]: updated } }
      })
    },
    [setState]
  )

  const appNames = Object.keys(state.appRoles || {})

  return (
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
            <Label className="text-sm font-medium">{t.appRolesLabel.replace('{app}', app)}</Label>
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
  )
}
