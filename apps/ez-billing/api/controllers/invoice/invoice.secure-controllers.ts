import { Request, Response } from 'express';
import { CreateInvoice, GetInvoicesQuery, UpdateInvoice } from '@ez-billing/types';
import {
  createInvoiceService,
  getInvoiceByIdService,
  getInvoicesService,
  hardDeleteInvoiceService,
  restoreInvoiceService,
  softDeleteInvoiceService,
  updateInvoiceService,
} from '../../services/invoice';
import { markInvoiceAsPaidService } from '../../services/invoice/invoice.custom.services';
import { AuthRequest } from '../../types/auth';
import { validateBillingAction, BillingPermissionError } from '../../utils/billing-permissions';

export async function createSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const invoiceData: CreateInvoice = req.body;

    // Ensure userId in body matches authenticated user
    if (invoiceData.userId && invoiceData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot create invoice for another user'
      });
    }

    // Force userId to match authenticated user
    const secureInvoiceData = { ...invoiceData, userId };

    const invoice = await createInvoiceService(secureInvoiceData);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error in createSecureInvoiceController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create invoice'
    });
  }
}

export async function getSecureInvoicesController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const query = { ...req.query, userId } as GetInvoicesQuery & { userId: string };
    const invoices = await getInvoicesService(query);

    res.json(invoices);
  } catch (error) {
    console.error('Error in getSecureInvoicesController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve invoices'
    });
  }
}

export async function getSecureInvoiceByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const invoice = await getInvoiceByIdService(id);

    if (!invoice || invoice.userId !== userId) {
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to access it'
      });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error in getSecureInvoiceByIdController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve invoice'
    });
  }
}

export async function updateSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const updateData: UpdateInvoice = req.body;

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot change invoice ownership'
      });
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id);
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to update it'
      });
    }

    // Validate that this invoice can be edited
    try {
      validateBillingAction(existingInvoice, 'invoice', 'edit');
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message
        });
      }
      throw error;
    }

    const invoice = await updateInvoiceService(id, updateData);

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice does not exist'
      });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error in updateSecureInvoiceController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update invoice'
    });
  }
}

export async function softDeleteSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id);
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to delete it'
      });
    }

    // Validate that this invoice can be deleted
    try {
      validateBillingAction(existingInvoice, 'invoice', 'delete');
    } catch (error) {
      if (error instanceof BillingPermissionError) {
        return res.status(403).json({
          error: 'Action forbidden',
          message: error.message
        });
      }
      throw error;
    }

    const invoice = await softDeleteInvoiceService(id);

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice does not exist'
      });
    }

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error in softDeleteSecureInvoiceController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete invoice'
    });
  }
}

export async function restoreSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // For restore, we need to check the invoice even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const invoice = await restoreInvoiceService(id);

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice does not exist'
      });
    }

    // Verify ownership after restore
    if (invoice.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteInvoiceService(id);
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to restore it'
      });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error in restoreSecureInvoiceController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to restore invoice'
    });
  }
}

export async function hardDeleteSecureInvoiceController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // First verify the invoice belongs to the user (even if deleted)
    const existingInvoice = await getInvoiceByIdService(id);
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to delete it'
      });
    }

    const invoice = await hardDeleteInvoiceService(id);

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice does not exist'
      });
    }

    res.json({
      message: 'Invoice permanently deleted',
      invoice
    });
  } catch (error) {
    console.error('Error in hardDeleteSecureInvoiceController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to permanently delete invoice'
    });
  }
}

export async function markInvoiceAsPaidSecureController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await getInvoiceByIdService(id);
    if (!existingInvoice || existingInvoice.userId !== userId) {
      return res.status(404).json({
        error: 'Invoice not found or access denied',
        message: 'Invoice does not exist or you do not have permission to mark it as paid'
      });
    }

    const result = await markInvoiceAsPaidService(id);

    if (!result) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'Invoice does not exist'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in markInvoiceAsPaidSecureController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mark invoice as paid'
    });
  }
}