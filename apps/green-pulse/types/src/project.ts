import { z } from 'zod'

/**
 * Project status
 */
export const ProjectStatusSchema = z.enum(['active', 'completed', 'archived', 'cancelled'])
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

/**
 * User role in a project
 */
export const ProjectRoleSchema = z.enum(['owner', 'editor', 'viewer'])
export type ProjectRole = z.infer<typeof ProjectRoleSchema>

/**
 * Project member with permissions
 */
export const ProjectMemberSchema = z.object({
  userId: z.string().describe('User ID'),
  role: ProjectRoleSchema,
  addedAt: z.date(),
  addedBy: z.string().optional().describe('User ID who added this member'),
})
export type ProjectMember = z.infer<typeof ProjectMemberSchema>

/**
 * Project - represents a case/dossier (e.g., "Inspection of Company X")
 * Contains multiple forms and can be shared with multiple users
 * Belongs to a workspace for multi-tenant isolation
 */
export const ProjectSchema = z.object({
  _id: z.string().optional(),

  // Workspace association (multi-tenant)
  workspaceId: z.string().describe('Workspace this project belongs to'),

  // Basic info
  name: z.string().describe('Project name (e.g., "Inspection ABC Corp")'),
  description: z.string().optional(),

  // Company/entity being inspected (optional metadata)
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companySector: z.string().optional(),

  // Ownership & permissions
  ownerId: z.string().describe('User who created the project'),
  members: z.array(ProjectMemberSchema).default([]).describe('Users with access to this project'),

  // Status & metadata
  status: ProjectStatusSchema.default('active'),
  tags: z.array(z.string()).optional(),

  // Form configs assigned to this project
  formConfigIds: z.array(z.string()).default([]).describe('Form templates to use'),

  // Audit
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
})
export type Project = z.infer<typeof ProjectSchema>

/**
 * Request to create a new project
 */
export const CreateProjectRequestSchema = z.object({
  workspaceId: z.string().describe('Workspace to create project in'),
  name: z.string().describe('Project name (e.g., "Inspection ABC Corp")'),
  description: z.string().optional().describe('Detailed project description'),
  companyName: z.string().optional().describe('Name of company being inspected or evaluated'),
  companyAddress: z.string().optional().describe('Address of the company'),
  companySector: z.string().optional().describe('Industry sector of the company'),
  formConfigIds: z.array(z.string()).optional().describe('Form template IDs to use in this project'),
  tags: z.array(z.string()).optional().describe('Tags for categorizing and searching projects'),
})
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>

/**
 * Request to update a project
 */
export const UpdateProjectRequestSchema = z.object({
  name: z.string().optional().describe('Updated project name'),
  description: z.string().optional().describe('Updated project description'),
  companyName: z.string().optional().describe('Updated company name'),
  companyAddress: z.string().optional().describe('Updated company address'),
  companySector: z.string().optional().describe('Updated company industry sector'),
  status: ProjectStatusSchema.optional().describe('Updated project status (active, completed, archived, cancelled)'),
  formConfigIds: z.array(z.string()).optional().describe('Updated list of form template IDs'),
  tags: z.array(z.string()).optional().describe('Updated tags for categorization'),
})
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>

/**
 * Request to add a member to a project
 */
export const AddProjectMemberRequestSchema = z.object({
  userId: z.string().describe('User ID to add as project member'),
  role: ProjectRoleSchema.describe('Role to assign (owner, editor, viewer)'),
})
export type AddProjectMemberRequest = z.infer<typeof AddProjectMemberRequestSchema>

/**
 * Request to update member role
 */
export const UpdateProjectMemberRequestSchema = z.object({
  userId: z.string().describe('User ID whose role to update'),
  role: ProjectRoleSchema.describe('New role to assign (owner, editor, viewer)'),
})
export type UpdateProjectMemberRequest = z.infer<typeof UpdateProjectMemberRequestSchema>
