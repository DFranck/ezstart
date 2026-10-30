import { Router } from '@ezstart/api-core'
import submitContactRouter, { submitContactRegistry } from './submitContact.js'

const router: import('express').Router = Router()

router.use(submitContactRouter)

export const contactRegistries = [submitContactRegistry]

export default router
