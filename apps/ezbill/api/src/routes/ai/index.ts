/**
 * AI Routes - Invoice/Quote extraction and assistance
 */
import { Router } from 'express'
import { extractInvoiceData } from './extractInvoiceData.js'

const router = Router()

// POST /api/ai/extract-invoice-data
router.post('/extract-invoice-data', extractInvoiceData)

export default router
