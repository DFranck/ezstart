import { Request, Response } from 'express';
import { CreateReceipt, GetReceiptsQuery, UpdateReceipt } from '@ezbill/types';
import {
  createReceiptService,
  getReceiptByIdService,
  getReceiptsService,
  hardDeleteReceiptService,
  restoreReceiptService,
  softDeleteReceiptService,
  updateReceiptService,
} from '../../services/receipt/index.js';
import { AuthRequest } from '../../types/auth.js';

export async function createSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const receiptData: CreateReceipt = req.body;

    // Ensure userId in body matches authenticated user
    if (receiptData.userId && receiptData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot create receipt for another user'
      });
    }

    // Force userId to match authenticated user
    const secureReceiptData = { ...receiptData, userId };

    const receipt = await createReceiptService(secureReceiptData);

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Error in createSecureReceiptController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create receipt'
    });
  }
}

export async function getSecureReceiptsController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const query = { ...req.query, userId } as GetReceiptsQuery & { userId: string };
    const receipts = await getReceiptsService(query);

    res.json(receipts);
  } catch (error) {
    console.error('Error in getSecureReceiptsController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve receipts'
    });
  }
}

export async function getSecureReceiptByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const receipt = await getReceiptByIdService(id);

    if (!receipt || receipt.userId !== userId) {
      return res.status(404).json({
        error: 'Receipt not found or access denied',
        message: 'Receipt does not exist or you do not have permission to access it'
      });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error in getSecureReceiptByIdController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve receipt'
    });
  }
}

export async function updateSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const updateData: UpdateReceipt = req.body;

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot change receipt ownership'
      });
    }

    // First verify the receipt belongs to the user
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return res.status(404).json({
        error: 'Receipt not found or access denied',
        message: 'Receipt does not exist or you do not have permission to update it'
      });
    }

    const receipt = await updateReceiptService(id, updateData);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: 'Receipt does not exist'
      });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error in updateSecureReceiptController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update receipt'
    });
  }
}

export async function softDeleteSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // First verify the receipt belongs to the user
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return res.status(404).json({
        error: 'Receipt not found or access denied',
        message: 'Receipt does not exist or you do not have permission to delete it'
      });
    }

    const receipt = await softDeleteReceiptService(id);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: 'Receipt does not exist'
      });
    }

    res.json(receipt); // Return deleted receipt with deletedAt timestamp
  } catch (error) {
    console.error('Error in softDeleteSecureReceiptController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete receipt'
    });
  }
}

export async function restoreSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // For restore, we need to check the receipt even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const receipt = await restoreReceiptService(id);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: 'Receipt does not exist'
      });
    }

    // Verify ownership after restore
    if (receipt.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteReceiptService(id);
      return res.status(404).json({
        error: 'Receipt not found or access denied',
        message: 'Receipt does not exist or you do not have permission to restore it'
      });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error in restoreSecureReceiptController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to restore receipt'
    });
  }
}

export async function hardDeleteSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // First verify the receipt belongs to the user (even if deleted)
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return res.status(404).json({
        error: 'Receipt not found or access denied',
        message: 'Receipt does not exist or you do not have permission to delete it'
      });
    }

    const receipt = await hardDeleteReceiptService(id);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: 'Receipt does not exist'
      });
    }

    res.json({
      message: 'Receipt permanently deleted',
      receipt
    });
  } catch (error) {
    console.error('Error in hardDeleteSecureReceiptController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to permanently delete receipt'
    });
  }
}