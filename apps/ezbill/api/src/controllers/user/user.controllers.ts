import { CreateUser, createUserSchema } from '@ezbill/types';
import { Request, Response } from 'express';
import { UserModel } from '../../models/user.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { logger } from '@ezstart/logger/server';

export const createUser = async (req: Request, res: Response) => {
  try {
    const validated = createUserSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await UserModel.findOne({ username: validated.username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new UserModel(validated);
    await user.save();

    res.status(201).json({ user: toApiObject(user) });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    res.status(400).json({ error: error.message || 'Failed to create user' });
  }
};

export const getUserByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const user = await UserModel.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: toApiObject(user) });
  } catch (error: any) {
    logger.error('Error getting user:', error);
    res.status(400).json({ error: error.message || 'Failed to get user' });
  }
};