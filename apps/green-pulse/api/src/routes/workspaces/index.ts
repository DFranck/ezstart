import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../middleware/auth.js'

// Import all action routers and registries
import listWorkspacesRouter, { listWorkspacesRegistry } from './listWorkspaces.js'
import getWorkspaceByIdRouter, { getWorkspaceByIdRegistry } from './getWorkspaceById.js'
import createWorkspaceRouter, { createWorkspaceRegistry } from './createWorkspace.js'
import updateWorkspaceRouter, { updateWorkspaceRegistry } from './updateWorkspace.js'
import deleteWorkspaceRouter, { deleteWorkspaceRegistry } from './deleteWorkspace.js'
import addWorkspaceMemberRouter, { addWorkspaceMemberRegistry } from './addWorkspaceMember.js'
import updateWorkspaceMemberRouter, { updateWorkspaceMemberRegistry } from './updateWorkspaceMember.js'
import removeWorkspaceMemberRouter, { removeWorkspaceMemberRegistry } from './removeWorkspaceMember.js'

// Export array of registries
export const workspaceRegistries = [
  listWorkspacesRegistry,
  getWorkspaceByIdRegistry,
  createWorkspaceRegistry,
  updateWorkspaceRegistry,
  deleteWorkspaceRegistry,
  addWorkspaceMemberRegistry,
  updateWorkspaceMemberRegistry,
  removeWorkspaceMemberRegistry,
]

// Combine all routers — all workspace routes require authentication
const router: any = Router()
router.use(authMiddleware)

router.use('/', listWorkspacesRouter)
router.use('/', getWorkspaceByIdRouter)
router.use('/', createWorkspaceRouter)
router.use('/', updateWorkspaceRouter)
router.use('/', deleteWorkspaceRouter)
router.use('/', addWorkspaceMemberRouter)
router.use('/', updateWorkspaceMemberRouter)
router.use('/', removeWorkspaceMemberRouter)

export default router
