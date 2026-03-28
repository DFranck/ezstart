import { CreateUser, createUserSchema } from '@ezbill/types';
import { Request, Response } from 'express';
import { UserModel } from '../../models/user.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { logger } from '@ezstart/logger/server';
import { sendSuccess, sendError } from '@ezstart/express-core';

export const createUser = async (req: Request, res: Response) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, result.error.errors[0]?.message || 'Validation failed', 400);
    }

    // Check if username already exists
    const existingUser = await UserModel.findOne({ username: result.data.username });
    if (existingUser) {
      return sendError(res, 'Username already exists', 400);
    }

    const user = new UserModel(result.data);
    await user.save();

    res.status(201).json({ success: true, data: toApiObject(user) });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    sendError(res, error.message || 'Failed to create user', 400);
  }
};

export const getUserByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      return sendError(res, 'Username is required', 400);
    }

    const user = await UserModel.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, toApiObject(user));
  } catch (error: any) {
    logger.error('Error getting user:', error);
    sendError(res, error.message || 'Failed to get user', 400);
  }
};
