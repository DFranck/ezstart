import { Router } from '@ezstart/express-core'
import listProjectsRouter, { listProjectsRegistry } from './listProjects.js'
import getProjectByIdRouter, { getProjectByIdRegistry } from './getProjectById.js'
import createProjectRouter, { createProjectRegistry } from './createProject.js'
import updateProjectRouter, { updateProjectRegistry } from './updateProject.js'
import deleteProjectByIdRouter, { deleteProjectByIdRegistry } from './deleteProjectById.js'
import addProjectMemberRouter, { addProjectMemberRegistry } from './addProjectMember.js'
import updateProjectMemberRouter, { updateProjectMemberRegistry } from './updateProjectMember.js'
import removeProjectMemberRouter, { removeProjectMemberRegistry } from './removeProjectMember.js'
import getProjectFormsRouter, { getProjectFormsRegistry } from './getProjectForms.js'

// Export all registries as an array
export const projectRegistries = [
  listProjectsRegistry,
  getProjectByIdRegistry,
  createProjectRegistry,
  updateProjectRegistry,
  deleteProjectByIdRegistry,
  addProjectMemberRegistry,
  updateProjectMemberRegistry,
  removeProjectMemberRegistry,
  getProjectFormsRegistry,
]

// Combine all routers
const router: import('express').Router = Router()

router.use('/', listProjectsRouter)
router.use('/', getProjectByIdRouter)
router.use('/', createProjectRouter)
router.use('/', updateProjectRouter)
router.use('/', deleteProjectByIdRouter)
router.use('/', addProjectMemberRouter)
router.use('/', updateProjectMemberRouter)
router.use('/', removeProjectMemberRouter)
router.use('/', getProjectFormsRouter)

export default router
