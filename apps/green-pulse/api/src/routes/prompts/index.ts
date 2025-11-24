import { Router } from '@ezstart/express-core'
import listPromptsRouter, { listPromptsRegistry } from './prompts.list.js'
import getPromptRouter, { getPromptRegistry } from './prompts.get.js'
import createPromptRouter, { createPromptRegistry } from './prompts.create.js'
import updatePromptRouter, { updatePromptRegistry } from './prompts.update.js'
import deletePromptRouter, { deletePromptRegistry } from './prompts.delete.js'

const router: any = Router()

router.use(listPromptsRouter)
router.use(getPromptRouter)
router.use(createPromptRouter)
router.use(updatePromptRouter)
router.use(deletePromptRouter)

export const promptsRegistries = [
  listPromptsRegistry,
  getPromptRegistry,
  createPromptRegistry,
  updatePromptRegistry,
  deletePromptRegistry,
]

export default router
