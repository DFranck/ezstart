import { Request, Response } from 'express'
import { CreateInvoice, GetInvoicesQuery, UpdateInvoice } from '@ezbill/types'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError } from '@ezstart/express-core'
import {
  createInvoiceService,
  getInvoiceByIdService,
  getInvoicesPaginatedService,
  hardDeleteInvoiceService,
  restoreInvoiceService,
  softDeleteInvoiceService,
  updateInvoiceService,
} from '../../services/invoice/index.js'
import { markInvoiceAsPaidService } from '../../services/invoice/invoice.custom.services.js'
import { AuthRequest } from '../../types/auth.js'
import { validateBillingAction, BillingPermissionError } from '../../utils/billing-permissions.js'

export async function createSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const invoiceData: CreateInvoice = req.body

    // Ensure userId in body matches authenticated user
    if (invoiceData.userId && invoiceData.userId !== userId) {
      return sendError(res, 'Cannot create invoice for another user', 403)
    }

    // Force userId to match authenticated user
    const secureInvoiceData = { ...invoiceData, userId }

    const invoice = await createInvoiceService(secureInvoiceData)

    res.status(201)
    sendSuccess(res, invoice)
  } catch (error) {
    logger.error('Error in createSecureInvoiceController:', error)
    sendError(res, 'Failed to create invoice')
  }
}

export async function getSecureInvoicesController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const query = { ...req.query, userId } as GetInvoicesQuery & { userId: string }
    const result = await getInvoicesPaginatedService(query)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('Error in getSecureInvoicesController:', error)
    sendError(res, 'Failed to retrieve invoices')
  }
}

export async function getSecureInvoiceByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const invoice = await getInvoiceByIdService(id)

    if (!invoice || invoice.userId !== userId) {
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    sendSuccess(res, invoice)
  } catch (error) {
    logger.error('Error in getSecureInvoiceByIdController:', error)
    sendError(res, 'Failed to retrieve invoice')
  }
}

export async function updateSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const updateData: UpdateInvoice = req.body

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return sendError(res, 'Cannot change invoice ownership', 403)
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id)
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    // Validate that this invoice can be edited
    try {
      validateBillingAction(existingInvoice, 'invoice', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const invoice = await updateInvoiceService(id, updateData)

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404)
    }

    sendSuccess(res, invoice)
  } catch (error) {
    logger.error('Error in updateSecureInvoiceController:', error)
    sendError(res, 'Failed to update invoice')
  }
}

export async function softDeleteSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id)
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    // Validate that this invoice can be deleted
    try {
      validateBillingAction(existingInvoice, 'invoice', 'delete')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const invoice = await softDeleteInvoiceService(id)

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404)
    }

    sendSuccess(res, invoice)
  } catch (error) {
    logger.error('Error in softDeleteSecureInvoiceController:', error)
    sendError(res, 'Failed to delete invoice')
  }
}

export async function restoreSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // For restore, we need to check the invoice even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const invoice = await restoreInvoiceService(id)

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404)
    }

    // Verify ownership after restore
    if (invoice.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteInvoiceService(id)
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    sendSuccess(res, invoice)
  } catch (error) {
    logger.error('Error in restoreSecureInvoiceController:', error)
    sendError(res, 'Failed to restore invoice')
  }
}

export async function hardDeleteSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // First verify the invoice belongs to the user (even if deleted)
    const existingInvoice = await getInvoiceByIdService(id)
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    const invoice = await hardDeleteInvoiceService(id)

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404)
    }

    sendSuccess(res, invoice, { message: 'Invoice permanently deleted' })
  } catch (error) {
    logger.error('Error in hardDeleteSecureInvoiceController:', error)
    sendError(res, 'Failed to permanently delete invoice')
  }
}

export async function markInvoiceAsPaidSecureController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id)
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return sendError(res, 'Invoice not found or access denied', 404)
    }

    const result = await markInvoiceAsPaidService(id, req.body)

    if (!result) {
      return sendError(res, 'Invoice not found', 404)
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('Error in markInvoiceAsPaidSecureController:', error)
    sendError(res, 'Failed to mark invoice as paid')
  }
}
