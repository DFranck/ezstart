import { Request, Response } from 'express';
import { BillingClient } from '@ez-billing/types';
import {
  createClientService,
  getClientByIdService,
  getClientsService,
  updateClientService,
  softDeleteClientService,
  restoreClientService,
  hardDeleteClientService,
} from '../../services/client';

/**
 * Secure controller to create a client
 * Ensures userId matches authenticated user
 */
export async function createSecureClientController(req: Request, res: Response) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const clientData: BillingClient = req.body;

    // Ensure userId in body matches authenticated user
    if (clientData.userId && clientData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot create client for another user'
      });
    }

    // Force userId to match authenticated user
    const secureClientData = { ...clientData, userId };

    const client = await createClientService(secureClientData);

    res.status(201).json(client);
  } catch (error) {
    console.error('Error in createSecureClientController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create client'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const query = { ...req.query, userId };
    const clients = await getClientsService(query);

    res.json(clients);
  } catch (error) {
    console.error('Error in getSecureClientsController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve clients'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const client = await getClientByIdService(id, userId);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found or access denied',
        message: 'Client does not exist or you do not have permission to access it'
      });
    }

    res.json(client);
  } catch (error) {
    console.error('Error in getSecureClientByIdController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve client'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    const updateData: Partial<BillingClient> = req.body;

    // Ensure userId in body matches authenticated user (if provided)
    if (updateData.userId && updateData.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot change client ownership'
      });
    }

    const client = await updateClientService(id, updateData, userId);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found or access denied',
        message: 'Client does not exist or you do not have permission to update it'
      });
    }

    res.json(client);
  } catch (error) {
    console.error('Error in updateSecureClientController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update client'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (permanent === 'true') {
      // Hard delete
      const client = await hardDeleteClientService(id, userId);
      
      if (!client) {
        return res.status(404).json({
          error: 'Client not found or access denied',
          message: 'Client does not exist or you do not have permission to delete it'
        });
      }
      
      res.json({ message: 'Client permanently deleted', client });
    } else {
      // Soft delete
      const client = await softDeleteClientService(id, userId);

      if (!client) {
        return res.status(404).json({
          error: 'Client not found or access denied',
          message: 'Client does not exist or you do not have permission to delete it'
        });
      }

      res.status(204).send(); // No content
    }
  } catch (error) {
    console.error('Error in softDeleteSecureClientController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete client'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const client = await restoreClientService(id, userId);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found or access denied',
        message: 'Client does not exist or you do not have permission to restore it'
      });
    }

    res.json(client);
  } catch (error) {
    console.error('Error in restoreSecureClientController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to restore client'
    });
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
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const client = await hardDeleteClientService(id, userId);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found or access denied',
        message: 'Client does not exist or you do not have permission to delete it'
      });
    }

    res.json({
      message: 'Client permanently deleted',
      client
    });
  } catch (error) {
    console.error('Error in hardDeleteSecureClientController:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to permanently delete client'
    });
  }
}