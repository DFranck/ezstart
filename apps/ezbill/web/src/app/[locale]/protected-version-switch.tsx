'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/auth-sdk'
import { VersionSwitch } from '@ezstart/ui/components'

/**
 * VersionSwitch with RBAC protection
 * Only visible for manager, admin, and superadmin roles
 */
export default function ProtectedVersionSwitch() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user, 'ezbill')

  // Only show for authorized users
  if (!rbac.hasAnyRole(['manager', 'admin', 'superadmin'])) {
    return null
  }

  return <VersionSwitch v1Label="V1" v2Label="V2" position="bottom-left" />
}
