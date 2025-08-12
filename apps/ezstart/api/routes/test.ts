import { createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core'
import { z } from '@ezstart/types'
import express from 'express'

export const testsRegistry = new OpenAPIRegistry()
const router = express.Router()

const docRouter = createRouterWithDoc(testsRegistry, router)

const responseSchema = z.object({
  message: z.string().describe('Confirmation message'),
  timestamp: z.string().describe('ISO timestamp'),
})

docRouter.get(
  '/test',
  (req, res) => {
    res.json({
      message: '✅ Test route is working!',
      timestamp: new Date().toISOString(),
    })
  },
  {
    summary: 'Test route',
    tags: ['System'],
    responseSchema,
  }
)

export default router
