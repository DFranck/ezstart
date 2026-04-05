import { Router } from '@ezstart/express-core'
import { sendSuccess } from '@ezstart/express-core'
import { TEST_PRODUCTS } from '../config/test-products.js'
import { Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

router.get('/test-products', (_, res) => {
  sendSuccess(res, TEST_PRODUCTS)
})

export default router
