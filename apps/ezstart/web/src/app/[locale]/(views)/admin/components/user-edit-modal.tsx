'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
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
import { useState } from 'react'

interface UserEditModalProps {
  user: AuthUser
  currentUser: AuthUser | null
  rbac: ReturnType<typeof useRBAC>
  onClose: () => void
  onSave: () => void
}

const ALL_ROLES = ['superadmin', 'admin', 'manager', 'beta-tester', 'client']
const ALL_APPS = ['ezbill', 'tower-defense', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd']

export function UserEditModal({ user, currentUser, rbac, onClose, onSave }: UserEditModalProps) {
  const [roles, setRoles] = useState<string[]>(user.roles || [])
  const [apps, setApps] = useState<string[]>(user.apps || [])
  const [customPermissions, setCustomPermissions] = useState<string[]>(user.permissions || [])
  const [customFeatures, setCustomFeatures] = useState<string[]>(user.features || [])
  const [isVerified, setIsVerified] = useState(user.isVerified)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSuperAdmin = rbac.hasRole('superadmin')

  // Calculate inherited permissions and features from roles
  const inheritedPermissions = new Set<string>()
  const inheritedFeatures = new Set<string>()

  roles.forEach((role) => {
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
    const roleFeats = ROLE_FEATURES[role as keyof typeof ROLE_FEATURES] || []
    rolePerms.forEach((p) => inheritedPermissions.add(p))
    roleFeats.forEach((f) => inheritedFeatures.add(f))
  })

  const toggleRole = (role: string) => {
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role))
    } else {
      setRoles([...roles, role])
    }
  }

  const toggleApp = (app: string) => {
    if (apps.includes(app)) {
      setApps(apps.filter((a) => a !== app))
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
          roles,
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
    } catch (err: any) {
      setError(err.message)
      console.error('Error updating user:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={`Edit User: ${user.username}`}
      footer={
        <Div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="lucide:Save" className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </Div>
      }
    >
      <Div className="space-y-6">
        {/* User Info */}
        <Div>
          <H3>User Information</H3>
          <Div className="mt-2 space-y-1 text-sm">
            <P>
              <Span className="font-semibold">Email:</Span> {user.email}
            </P>
            <P>
              <Span className="font-semibold">Username:</Span> {user.username}
            </P>
            {user.firstName && (
              <P>
                <Span className="font-semibold">Name:</Span> {user.firstName} {user.lastName}
              </P>
            )}
            <P>
              <Span className="font-semibold">Created:</Span>{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </P>
          </Div>
        </Div>

        {/* Verification Status */}
        <Div>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={isVerified}
              onCheckedChange={(checked) => setIsVerified(checked as boolean)}
            />
            Email Verified
          </Label>
        </Div>

        {/* Roles */}
        <Div>
          <H3 className="mb-3">Roles</H3>
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_ROLES.map((role) => {
              const disabled = role === 'superadmin' && !isSuperAdmin
              return (
                <Label key={role} className="flex items-center gap-2">
                  <Checkbox
                    checked={roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    disabled={disabled}
                  />
                  <Span className="capitalize">{role}</Span>
                  {disabled && <Icon name="lucide:Lock" className="text-muted-foreground" />}
                </Label>
              )
            })}
          </Div>
        </Div>

        {/* Apps */}
        <Div>
          <H3 className="mb-3">Applications Access</H3>
          <Div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_APPS.map((app) => (
              <Label key={app} className="flex items-center gap-2">
                <Checkbox checked={apps.includes(app)} onCheckedChange={() => toggleApp(app)} />
                <Span className="capitalize">{app}</Span>
              </Label>
            ))}
          </Div>
        </Div>

        {/* Inherited Permissions */}
        {inheritedPermissions.size > 0 && (
          <Div>
            <H3 className="mb-3">Inherited Permissions (from roles)</H3>
            <Div className="flex flex-wrap gap-1">
              {Array.from(inheritedPermissions).map((perm) => (
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
            <H3 className="mb-3">Inherited Features (from roles)</H3>
            <Div className="flex flex-wrap gap-1">
              {Array.from(inheritedFeatures).map((feat) => (
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
            <P className="font-medium">Error saving changes</P>
            <P className="text-sm mt-1">{error}</P>
          </Div>
        )}
      </Div>
    </Modal>
  )
}
