import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

// Helper to get authenticated userId with runtime check
export function getAuthenticatedUserId(req: AuthRequest): string {
  if (!req.userId) {
    throw new Error('Authentication required: userId is missing');
  }
  return req.userId;
}