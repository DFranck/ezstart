/**
 * @deprecated Renamed to `EditUserModal` — the modal now edits profile fields
 * (firstName / lastName / email / avatar read-only) + roles + status toggles
 * (isVerified / isActive / mustChangePassword) instead of just roles.
 *
 * This file is a backwards-compatible re-export so external imports of
 * `EditRolesModal` keep working. Prefer `EditUserModal` in new code.
 *
 * @internal
 */
export { EditUserModal as EditRolesModal } from './EditUserModal.js'
export type { EditUserModalProps as EditRolesModalProps } from './EditUserModal.js'
