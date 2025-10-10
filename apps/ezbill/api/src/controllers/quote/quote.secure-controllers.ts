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
import {
  acceptQuoteService,
  addLineItemToQuoteService,
  assignClientToQuoteService,
  convertQuoteToInvoiceService,
  createQuoteService,
  getQuoteByIdService,
  getQuotesService,
  hardDeleteQuoteService,
  rejectQuoteService,
  removeLineItemToQuoteService,
  restoreQuoteService,
  softDeleteQuoteService,
  updateQuoteService,
} from '../../services/quote/index.js';
import { AuthRequest, getAuthenticatedUserId } from '../../types/auth.js';
import { BillingPermissionError, validateBillingAction } from '../../utils/billing-permissions.js';

export async function createSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req)

    console.log('🔍 Controller received request body:', JSON.stringify(req.body, null, 2))

    const quoteData: CreateQuote = req.body

    console.log('🔍 Controller quoteData:', JSON.stringify(quoteData, null, 2))

    // Ensure userId in body matches authenticated user
    if (quoteData.userId && quoteData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot create quote for another user',
      })
    }

    // Force userId to match authenticated user
    const secureQuoteData = { ...quoteData, userId }

    console.log('🔍 Controller secureQuoteData:', JSON.stringify(secureQuoteData, null, 2))

    const quote = await createQuoteService(secureQuoteData)

    res.status(201).json(quote)
  } catch (error) {
    console.error('Error in createSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create quote',
    })
  }
}

export async function getSecureQuotesController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    const query = { ...req.query, userId } as GetQuotesQuery & { userId: string }
    const quotes = await getQuotesService(query)

    res.json(quotes)
  } catch (error) {
    console.error('Error in getSecureQuotesController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve quotes',
    })
  }
}

export async function getSecureQuoteByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    const quote = await getQuoteByIdService(id)

    if (!quote || quote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to access it',
      })
    }

    res.json(quote)
  } catch (error) {
    console.error('Error in getSecureQuoteByIdController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve quote',
    })
  }
}

export async function updateSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    const updateData: UpdateQuote = req.body

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot change quote ownership',
      })
    }

    // First verify the quote belongs to the user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to update it',
      })
    }

    // Validate that this quote can be edited
    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const quote = await updateQuoteService(id, updateData)

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found',
        message: 'Quote does not exist',
      })
    }

    res.json(quote)
  } catch (error) {
    console.error('Error in updateSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update quote',
    })
  }
}

export async function softDeleteSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // First verify the quote belongs to the user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to delete it',
      })
    }

    // Validate that this quote can be deleted
    try {
      validateBillingAction(existingQuote, 'quote', 'delete')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const quote = await softDeleteQuoteService(id)

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found',
        message: 'Quote does not exist',
      })
    }

    res.status(204).send() // No content
  } catch (error) {
    console.error('Error in softDeleteSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete quote',
    })
  }
}

export async function restoreSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // For restore, we need to check the quote even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const quote = await restoreQuoteService(id)

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found',
        message: 'Quote does not exist',
      })
    }

    // Verify ownership after restore
    if (quote.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteQuoteService(id)
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to restore it',
      })
    }

    res.json(quote)
  } catch (error) {
    console.error('Error in restoreSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to restore quote',
    })
  }
}

export async function hardDeleteSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // First verify the quote belongs to the user (even if deleted)
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to delete it',
      })
    }

    const quote = await hardDeleteQuoteService(id)

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found',
        message: 'Quote does not exist',
      })
    }

    res.json({
      message: 'Quote permanently deleted',
      quote,
    })
  } catch (error) {
    console.error('Error in hardDeleteSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to permanently delete quote',
    })
  }
}

// Custom actions - all secured with userId validation

export async function assignClientToSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to modify it',
      })
    }

    // Validate can edit
    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const parseClient = assignClientSchema.safeParse(req.body)
    if (!parseClient.success) {
      return res.status(422).json({
        error: 'Validation error',
        details: parseClient.error.errors,
      })
    }

    const quote = await assignClientToQuoteService(id, parseClient.data.clientId)
    res.json(quote)
  } catch (error) {
    console.error('Error in assignClientToSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to assign client to quote',
    })
  }
}

export async function addLineItemToSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user and can be edited
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to modify it',
      })
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const parseItem = addLineItemSchema.safeParse(req.body)
    if (!parseItem.success) {
      return res.status(422).json({
        error: 'Validation error',
        details: parseItem.error.errors,
      })
    }

    const quote = await addLineItemToQuoteService(id, parseItem.data)
    res.json(quote)
  } catch (error) {
    console.error('Error in addLineItemToSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add line item to quote',
    })
  }
}

export async function removeLineItemFromSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user and can be edited
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to modify it',
      })
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'edit')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const parseItem = removeLineItemSchema.safeParse(req.body)
    if (!parseItem.success) {
      return res.status(422).json({
        error: 'Validation error',
        details: parseItem.error.errors,
      })
    }

    const quote = await removeLineItemToQuoteService(id, parseItem.data.itemId)
    res.json(quote)
  } catch (error) {
    console.error('Error in removeLineItemFromSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove line item from quote',
    })
  }
}

export async function acceptSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to modify it',
      })
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'accept')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const quote = await acceptQuoteService(id)
    res.json(quote)
  } catch (error) {
    console.error('Error in acceptSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to accept quote',
    })
  }
}

export async function rejectSecureQuoteController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to modify it',
      })
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'reject')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const quote = await rejectQuoteService(id)
    res.json(quote)
  } catch (error) {
    console.error('Error in rejectSecureQuoteController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reject quote',
    })
  }
}

export async function convertQuoteToInvoiceSecureController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Verify quote belongs to user
    const existingQuote = await getQuoteByIdService(id)
    if (!existingQuote || existingQuote.userId !== userId) {
      return res.status(404).json({
        error: 'Quote not found or access denied',
        message: 'Quote does not exist or you do not have permission to convert it',
      })
    }

    try {
      validateBillingAction(existingQuote, 'quote', 'convertToInvoice')
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message,
        })
      }
      throw error
    }

    const parseBody = convertQuoteToInvoiceSchema.safeParse(req.body)
    if (!parseBody.success) {
      return res.status(422).json({
        error: 'Validation error',
        details: parseBody.error.errors,
      })
    }

    const invoice = await convertQuoteToInvoiceService(id, parseBody.data)
    if (!invoice) {
      return res.status(404).json({
        error: 'Quote not found or already deleted',
      })
    }

    res.status(201).json(invoice)
  } catch (error: any) {
    console.error('Error in convertQuoteToInvoiceSecureController:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to convert quote to invoice',
    })
  }
}
