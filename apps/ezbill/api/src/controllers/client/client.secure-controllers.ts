import { Request, Response } from 'express';
import { BillingClient } from '@ezbill/types';
import { logger } from '@ezstart/logger/server';
import { sendSuccess, sendError } from '@ezstart/express-core';
import {
  createClientService,
  getClientByIdService,
  getClientsService,
  getClientsPaginatedService,
  updateClientService,
  softDeleteClientService,
  restoreClientService,
  hardDeleteClientService,
} from '../../services/client/index.js';

/**
 * Secure controller to create a client
 * Ensures userId matches authenticated user
 */
export async function createSecureClientController(req: Request, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const clientData: BillingClient = req.body;

    // Ensure userId in body matches authenticated user
    if (clientData.userId && clientData.userId !== userId) {
      return sendError(res, 'Cannot create client for another user', 403);
    }

    // Force userId to match authenticated user
    const secureClientData = { ...clientData, userId };

    const client = await createClientService(secureClientData);

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    logger.error('Error in createSecureClientController:', error);
    sendError(res, 'Failed to create client');
  }
}

/**
 * Secure controller to get all clients for authenticated user
 * Only returns clients belonging to the authenticated user
 */
export async function getSecureClientsController(req: Request, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const query = { ...req.query, userId };
    const result = await getClientsPaginatedService(query);

    sendSuccess(res, result);
  } catch (error) {
    logger.error('Error in getSecureClientsController:', error);
    sendError(res, 'Failed to retrieve clients');
  }
}

/**
 * Secure controller to get client by ID
 * Only returns client if it belongs to the authenticated user
 */
export async function getSecureClientByIdController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const client = await getClientByIdService(id, userId);

    if (!client) {
      return sendError(res, 'Client not found or access denied', 404);
    }

    sendSuccess(res, client);
  } catch (error) {
    logger.error('Error in getSecureClientByIdController:', error);
    sendError(res, 'Failed to retrieve client');
  }
}

/**
 * Secure controller to update client
 * Only updates client if it belongs to the authenticated user
 */
export async function updateSecureClientController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }
    const updateData: Partial<BillingClient> = req.body;

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return sendError(res, 'Cannot change client ownership', 403);
    }

    const client = await updateClientService(id, updateData, userId);

    if (!client) {
      return sendError(res, 'Client not found or access denied', 404);
    }

    sendSuccess(res, client);
  } catch (error) {
    logger.error('Error in updateSecureClientController:', error);
    sendError(res, 'Failed to update client');
  }
}

/**
 * Secure controller to delete client (soft or hard based on permanent query param)
 * Only deletes client if it belongs to the authenticated user
 */
export async function softDeleteSecureClientController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    if (permanent === 'true') {
      // Hard delete
      const client = await hardDeleteClientService(id, userId);

      if (!client) {
        return sendError(res, 'Client not found or access denied', 404);
      }

      sendSuccess(res, client, { message: 'Client permanently deleted' });
    } else {
      // Soft delete
      const client = await softDeleteClientService(id, userId);

      if (!client) {
        return sendError(res, 'Client not found or access denied', 404);
      }

      sendSuccess(res, client);
    }
  } catch (error) {
    logger.error('Error in softDeleteSecureClientController:', error);
    sendError(res, 'Failed to delete client');
  }
}

/**
 * Secure controller to restore client
 * Only restores client if it belongs to the authenticated user
 */
export async function restoreSecureClientController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const client = await restoreClientService(id, userId);

    if (!client) {
      return sendError(res, 'Client not found or access denied', 404);
    }

    sendSuccess(res, client);
  } catch (error) {
    logger.error('Error in restoreSecureClientController:', error);
    sendError(res, 'Failed to restore client');
  }
}

/**
 * Secure controller to hard delete client
 * Only deletes client if it belongs to the authenticated user
 */
export async function hardDeleteSecureClientController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const client = await hardDeleteClientService(id, userId);

    if (!client) {
      return sendError(res, 'Client not found or access denied', 404);
    }

    sendSuccess(res, client, { message: 'Client permanently deleted' });
  } catch (error) {
    logger.error('Error in hardDeleteSecureClientController:', error);
    sendError(res, 'Failed to permanently delete client');
  }
}
