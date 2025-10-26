import { z } from 'zod'

/**
 * Workspace Member Role
 * - owner: Full control of workspace
 * - admin: Can manage members and settings
 * - member: Can create/edit projects
 * - viewer: Read-only access
 */
export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>

/**
 * Workspace Member
 */
export const WorkspaceMemberSchema = z.object({
  userId: z.string().describe('User ID from EZAuth'),
  role: WorkspaceRoleSchema.default('member'),
  joinedAt: z.coerce.date().default(() => new Date()),
})
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>

/**
 * Workspace Status
 */
export const WorkspaceStatusSchema = z.enum(['active', 'suspended', 'archived'])
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>

/**
 * Workspace Settings
 */
export const WorkspaceSettingsSchema = z.object({
  allowPublicProjects: z.boolean().default(false).describe('Allow public projects visible to all members'),
  requireApprovalForNewMembers: z.boolean().default(true).describe('Require admin approval for new members'),
  maxProjects: z.number().optional().describe('Maximum number of projects (for paid plans)'),
  maxMembers: z.number().optional().describe('Maximum number of members (for paid plans)'),
})
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>

/**
 * Workspace
 * Multi-tenant container for projects and members
 */
export const WorkspaceSchema = z.object({
  _id: z.string().optional().describe('MongoDB ObjectId'),
  name: z.string().min(1).max(100).describe('Workspace name (e.g., "Acme Inspections")'),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).describe('URL-friendly slug (e.g., "acme-inspections")'),
  description: z.string().max(500).optional().describe('Workspace description'),

  // Ownership
  ownerId: z.string().describe('User ID of workspace owner (from EZAuth)'),
  members: z.array(WorkspaceMemberSchema).default([]).describe('Workspace members with roles'),

  // Status
  status: WorkspaceStatusSchema.default('active'),

  // Settings
  settings: WorkspaceSettingsSchema.default({}),

  // Branding (optional)
  logoUrl: z.string().url().optional().describe('Workspace logo URL'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('Primary brand color (hex)'),

  // Metadata
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

/**
 * Create Workspace Request
 */
export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  settings: WorkspaceSettingsSchema.partial().optional(),
})
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>

/**
 * Update Workspace Request
 */
export const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: WorkspaceSettingsSchema.partial().optional(),
  logoUrl: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: WorkspaceStatusSchema.optional(),
})
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>

/**
 * Add Workspace Member Request
 */
export const AddWorkspaceMemberRequestSchema = z.object({
  userId: z.string().describe('User ID to invite'),
  role: WorkspaceRoleSchema.default('member'),
})
export type AddWorkspaceMemberRequest = z.infer<typeof AddWorkspaceMemberRequestSchema>

/**
 * Update Workspace Member Request
 */
export const UpdateWorkspaceMemberRequestSchema = z.object({
  role: WorkspaceRoleSchema,
})
export type UpdateWorkspaceMemberRequest = z.infer<typeof UpdateWorkspaceMemberRequestSchema>

/**
 * List Workspaces Query
 */
export const ListWorkspacesQuerySchema = z.object({
  status: WorkspaceStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})
export type ListWorkspacesQuery = z.infer<typeof ListWorkspacesQuerySchema>

/**
 * Workspace with Member Count
 */
export const WorkspaceWithStatsSchema = WorkspaceSchema.extend({
  memberCount: z.number(),
  projectCount: z.number(),
  currentUserRole: WorkspaceRoleSchema.optional(),
})
export type WorkspaceWithStats = z.infer<typeof WorkspaceWithStatsSchema>
