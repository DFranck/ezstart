/**
 * Internal form-state types + delta-payload builder for `<EditUserModal>`.
 *
 * Extracted from the modal component so the main file stays under the
 * 400-line policy ceiling.
 *
 * @internal
 */

import type { AdminUser } from '../types.js'

export interface EditUserModalState {
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

export interface UpdateUserResponse {
  user: AdminUser
  message: string
  verificationEmailSent?: boolean
}

/** Hydrate the form state from the selected user. */
export function stateFromUser(user: AdminUser): EditUserModalState {
  return {
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
  }
}

export interface BuildPatchBodyOptions {
  emailVerificationLocale?: 'en' | 'fr' | 'vi'
  emailVerificationApp?: string
}

/**
 * Build a delta payload — only include fields the admin actually touched.
 * Sending the whole state would also re-write firstName/lastName when
 * unchanged, which still triggers the backend's audit log entry
 * (false-positive churn).
 */
export function buildPatchBody(
  user: AdminUser,
  state: EditUserModalState,
  options: BuildPatchBodyOptions = {}
): Record<string, unknown> {
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
  if (options.emailVerificationLocale)
    body.emailVerificationLocale = options.emailVerificationLocale
  if (options.emailVerificationApp) body.emailVerificationApp = options.emailVerificationApp
  return body
}
