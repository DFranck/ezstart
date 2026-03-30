/**
 * AI Routes - Invoice/Quote extraction and assistance
 */
import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.js'
import { extractInvoiceData } from './extractInvoiceData.js'

const router = Router()

// POST /api/ai/extract-invoice-data
router.post('/extract-invoice-data', authMiddleware, extractInvoiceData)

export default router
