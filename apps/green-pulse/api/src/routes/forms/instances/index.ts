/**
 * Form Instances Sub-Router
 * Aggregates all form instance actions
 */

import { Router } from '@ezstart/express-core'
import listFormInstancesRouter, { listFormInstancesRegistry } from './listFormInstances.js'
import getFormInstanceByIdRouter, { getFormInstanceByIdRegistry } from './getFormInstanceById.js'
import createFormInstanceRouter, { createFormInstanceRegistry } from './createFormInstance.js'
import updateFormInstanceRouter, { updateFormInstanceRegistry } from './updateFormInstance.js'
import submitFormInstanceRouter, { submitFormInstanceRegistry } from './submitFormInstance.js'
import deleteFormInstanceRouter, { deleteFormInstanceRegistry } from './deleteFormInstance.js'

export const formInstanceRegistries = [
  listFormInstancesRegistry,
  getFormInstanceByIdRegistry,
  createFormInstanceRegistry,
  updateFormInstanceRegistry,
  submitFormInstanceRegistry,
  deleteFormInstanceRegistry,
]

const router: import('express').Router = Router()

router
  .use('/', listFormInstancesRouter) // GET /instances
  .use('/', getFormInstanceByIdRouter) // GET /instances/:id
  .use('/', createFormInstanceRouter) // POST /instances
  .use('/', updateFormInstanceRouter) // PUT /instances/:id
  .use('/', submitFormInstanceRouter) // POST /instances/:id/submit
  .use('/', deleteFormInstanceRouter) // DELETE /instances/:id

export default router
