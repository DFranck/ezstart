import { Request, Response } from 'express';
import { CreateReceipt, GetReceiptsQuery, UpdateReceipt } from '@ezbill/types';
import { logger } from '@ezstart/logger/server';
import { sendSuccess, sendError } from '@ezstart/express-core';
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
      return sendError(res, 'Authentication required', 401);
    }

    const receiptData: CreateReceipt = req.body;

    // Ensure userId in body matches authenticated user
    if (receiptData.userId && receiptData.userId !== userId) {
      return sendError(res, 'Cannot create receipt for another user', 403);
    }

    // Force userId to match authenticated user
    const secureReceiptData = { ...receiptData, userId };

    const receipt = await createReceiptService(secureReceiptData);

    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    logger.error('Error in createSecureReceiptController:', error);
    sendError(res, 'Failed to create receipt');
  }
}

export async function getSecureReceiptsController(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const query = { ...req.query, userId } as GetReceiptsQuery & { userId: string };
    const receipts = await getReceiptsService(query);

    sendSuccess(res, receipts);
  } catch (error) {
    logger.error('Error in getSecureReceiptsController:', error);
    sendError(res, 'Failed to retrieve receipts');
  }
}

export async function getSecureReceiptByIdController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const receipt = await getReceiptByIdService(id);

    if (!receipt || receipt.userId !== userId) {
      return sendError(res, 'Receipt not found or access denied', 404);
    }

    sendSuccess(res, receipt);
  } catch (error) {
    logger.error('Error in getSecureReceiptByIdController:', error);
    sendError(res, 'Failed to retrieve receipt');
  }
}

export async function updateSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const updateData: UpdateReceipt = req.body;

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return sendError(res, 'Cannot change receipt ownership', 403);
    }

    // First verify the receipt belongs to the user
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return sendError(res, 'Receipt not found or access denied', 404);
    }

    const receipt = await updateReceiptService(id, updateData);

    if (!receipt) {
      return sendError(res, 'Receipt not found', 404);
    }

    sendSuccess(res, receipt);
  } catch (error) {
    logger.error('Error in updateSecureReceiptController:', error);
    sendError(res, 'Failed to update receipt');
  }
}

export async function softDeleteSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // First verify the receipt belongs to the user
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return sendError(res, 'Receipt not found or access denied', 404);
    }

    const receipt = await softDeleteReceiptService(id);

    if (!receipt) {
      return sendError(res, 'Receipt not found', 404);
    }

    sendSuccess(res, receipt);
  } catch (error) {
    logger.error('Error in softDeleteSecureReceiptController:', error);
    sendError(res, 'Failed to delete receipt');
  }
}

export async function restoreSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // For restore, we need to check the receipt even if it's deleted
    // so we'll verify ownership after restoring or modify the service to check ownership
    const receipt = await restoreReceiptService(id);

    if (!receipt) {
      return sendError(res, 'Receipt not found', 404);
    }

    // Verify ownership after restore
    if (receipt.userId !== userId) {
      // If user doesn't own it, soft delete it again and deny access
      await softDeleteReceiptService(id);
      return sendError(res, 'Receipt not found or access denied', 404);
    }

    sendSuccess(res, receipt);
  } catch (error) {
    logger.error('Error in restoreSecureReceiptController:', error);
    sendError(res, 'Failed to restore receipt');
  }
}

export async function hardDeleteSecureReceiptController(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // First verify the receipt belongs to the user (even if deleted)
    const existingReceipt = await getReceiptByIdService(id);
    if (!existingReceipt || existingReceipt.userId !== userId) {
      return sendError(res, 'Receipt not found or access denied', 404);
    }

    const receipt = await hardDeleteReceiptService(id);

    if (!receipt) {
      return sendError(res, 'Receipt not found', 404);
    }

    sendSuccess(res, receipt, { message: 'Receipt permanently deleted' });
  } catch (error) {
    logger.error('Error in hardDeleteSecureReceiptController:', error);
    sendError(res, 'Failed to permanently delete receipt');
  }
}
