import {
  CreateQuote,
  GetQuotesQuery,
  UpdateQuote,
  addLineItemSchema,
  assignClientSchema,
  convertQuoteToInvoiceSchema,
  removeLineItemSchema,
} from '@ezbill/types'
import { Response } from 'express'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import {
  acceptQuoteService,
  addLineItemToQuoteService,
  assignClientToQuoteService,
  convertQuoteToInvoiceService,
  createQuoteService,
  getQuoteByIdService,
  getQuotesPaginatedService,
  hardDeleteQuoteService,
  rejectQuoteService,
  removeLineItemToQuoteService,
  restoreQuoteService,
  softDeleteQuoteService,
  updateQuoteService,
} from '../../services/quote/index.js'
import { AuthRequest, getAuthenticatedUserId } from '../../types/auth.js'
import { BillingPermissionError, validateBillingAction } from '../../utils/billing-permissions.js'

export async function createSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req)

    logger.debug('Controller received request body:', JSON.stringify(req.body, null, 2))

    const quoteData: CreateQuote = req.body

    logger.debug('Controller quoteData:', JSON.stringify(quoteData, null, 2))

    // Ensure userId in body matches authenticated user
    if (quoteData.userId && quoteData.userId !== userId) {
      return sendError(res, 'Cannot create quote for another user', 403)
    }

    // Force userId to match authenticated user
    const secureQuoteData = { ...quoteData, userId }

    logger.debug('Controller secureQuoteData:', JSON.stringify(secureQuoteData, null, 2))

    const quote = await createQuoteService(secureQuoteData)

    res.status(201)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in createSecureQuoteController:', error)
    sendError(res, 'Failed to create quote')
  }
}

export async function getSecureQuotesController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const query = { ...req.query, userId } as GetQuotesQuery & { userId: string }
    const result = await getQuotesPaginatedService(query)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('Error in getSecureQuotesController:', error)
    sendError(res, 'Failed to retrieve quotes')
  }
}

export async function getSecureQuoteByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const quote = await getQuoteByIdService(id)

    if (!quote || quote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in getSecureQuoteByIdController:', error)
    sendError(res, 'Failed to retrieve quote')
  }
}

export async function updateSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const updateData: UpdateQuote = req.body

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return sendError(res, 'Cannot change quote ownership', 403)
    }

    // First verify the quote belongs to the user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    // Validate that this quote can be edited
    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const quote = await updateQuoteService(id, updateData)

    if (!quote) {
      return sendError(res, 'Quote not found', 404)
    }

    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in updateSecureQuoteController:', error)
    sendError(res, 'Failed to update quote')
  }
}

export async function softDeleteSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // First verify the quote belongs to the user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    // Validate that this quote can be deleted
    try {
      validateBillingAction(existingQuote, 'quote', 'delete')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const quote = await softDeleteQuoteService(id)

    if (!quote) {
      return sendError(res, 'Quote not found', 404)
    }

    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in softDeleteSecureQuoteController:', error)
    sendError(res, 'Failed to delete quote')
  }
}

export async function restoreSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // For restore, we need to check the quote even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const quote = await restoreQuoteService(id)

    if (!quote) {
      return sendError(res, 'Quote not found', 404)
    }

    // Verify ownership after restore
    if (quote.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteQuoteService(id)
      return sendError(res, 'Quote not found or access denied', 404)
    }

    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in restoreSecureQuoteController:', error)
    sendError(res, 'Failed to restore quote')
  }
}

export async function hardDeleteSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // First verify the quote belongs to the user (even if deleted)
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    const quote = await hardDeleteQuoteService(id)

    if (!quote) {
      return sendError(res, 'Quote not found', 404)
    }

    sendSuccess(res, quote, { message: 'Quote permanently deleted' })
  } catch (error) {
    logger.error('Error in hardDeleteSecureQuoteController:', error)
    sendError(res, 'Failed to permanently delete quote')
  }
}

// Custom actions - all secured with userId validation

export async function assignClientToSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    // Validate can edit
    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const parseClient = assignClientSchema.safeParse(req.body)
    if (!parseClient.success) {
      return sendValidationError(res, 'Validation error', parseClient.error.errors)
    }

    const quote = await assignClientToQuoteService(id, parseClient.data.clientId)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in assignClientToSecureQuoteController:', error)
    sendError(res, 'Failed to assign client to quote')
  }
}

export async function addLineItemToSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user and can be edited
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const parseItem = addLineItemSchema.safeParse(req.body)
    if (!parseItem.success) {
      return sendValidationError(res, 'Validation error', parseItem.error.errors)
    }

    const quote = await addLineItemToQuoteService(id, parseItem.data)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in addLineItemToSecureQuoteController:', error)
    sendError(res, 'Failed to add line item to quote')
  }
}

export async function removeLineItemFromSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user and can be edited
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const parseItem = removeLineItemSchema.safeParse(req.body)
    if (!parseItem.success) {
      return sendValidationError(res, 'Validation error', parseItem.error.errors)
    }

    const quote = await removeLineItemToQuoteService(id, parseItem.data.itemId)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in removeLineItemFromSecureQuoteController:', error)
    sendError(res, 'Failed to remove line item from quote')
  }
}

export async function acceptSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'accept')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const quote = await acceptQuoteService(id)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in acceptSecureQuoteController:', error)
    sendError(res, 'Failed to accept quote')
  }
}

export async function rejectSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'reject')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const quote = await rejectQuoteService(id)
    sendSuccess(res, quote)
  } catch (error) {
    logger.error('Error in rejectSecureQuoteController:', error)
    sendError(res, 'Failed to reject quote')
  }
}

export async function convertQuoteToInvoiceSecureController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return sendError(res, 'Quote not found or access denied', 404)
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'convertToInvoice')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return sendError(res, error.message, 403)
      }
      throw error
    }

    const parseBody = convertQuoteToInvoiceSchema.safeParse(req.body)
    if (!parseBody.success) {
      return sendValidationError(res, 'Validation error', parseBody.error.errors)
    }

    const invoice = await convertQuoteToInvoiceService(id, parseBody.data)
    if (!invoice) {
      return sendError(res, 'Quote not found or already deleted', 404)
    }

    res.status(201)
    sendSuccess(res, invoice)
  } catch (error: any) {
    logger.error('Error in convertQuoteToInvoiceSecureController:', error)
    sendError(res, error.message || 'Failed to convert quote to invoice')
  }
}
