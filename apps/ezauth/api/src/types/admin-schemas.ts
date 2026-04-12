/**
 * Shared Zod schemas for admin routes (list-users, get-user, update-user).
 *
 * Extracted to dedupe the three copies of the user-response / error schemas
 * that were living in each admin route file.
 */

import { z } from 'zod'

/**
 * Canonical admin-view user schema.
 * Excludes `passwordHash` (never leak from admin endpoints).
 * Drops legacy `roles` — consumers rely on `globalRoles` + `appRoles`.
 */
export const adminUserSchema = z.object({
  _id: z.string().describe('User unique identifier'),
  email: z.string().describe('User email address'),
  username: z.string().optional().describe('Username'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  avatar: z.string().optional().describe('Avatar URL'),
  isVerified: z.boolean().optional().describe('Email verification status'),
  globalRoles: z.array(z.string()).describe('Global roles (cross-app)'),
  appRoles: z.record(z.string(), z.array(z.string())).describe('Per-app roles mapping'),
  permissions: z.array(z.string()).describe('User permissions'),
  features: z.array(z.string()).describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),
  lastActiveAt: z.string().nullable().optional().describe('Last activity date ISO string'),
  createdAt: z.string().describe('Creation date ISO string'),
  updatedAt: z.string().describe('Last update date ISO string'),
})

export type AdminUser = z.infer<typeof adminUserSchema>

/** Standard pagination meta (matches `sendSuccess`'s `meta` shape). */
export const paginationMetaSchema = z.object({
  total: z.number().describe('Total number of items'),
  limit: z.number().describe('Items per page'),
  offset: z.number().describe('Zero-based offset'),
})

/** Standard admin error payload. */
export const adminErrorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Additional error details'),
})
