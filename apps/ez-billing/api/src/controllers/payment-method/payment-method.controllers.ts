import { CreatePaymentMethod, createPaymentMethodSchema } from '@ez-billing/types';
import { Request, Response } from 'express';
import { PaymentMethodModel } from '../../models/payment-method.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { AuthRequest } from '../../types/auth.js';

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    const { includeDeleted, deletedOnly } = req.query;
    
    let deletedAtFilter = {};
    if (deletedOnly === 'true') {
      deletedAtFilter = { deletedAt: { $ne: null } };
    } else if (includeDeleted !== 'true') {
      deletedAtFilter = { deletedAt: null };
    }
    
    const paymentMethods = await PaymentMethodModel.find({ 
      userId: req.userId, 
      ...deletedAtFilter 
    }).sort({ createdAt: -1 });
    
    res.json(paymentMethods.map(toApiObject));
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

export const getPaymentMethodById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethodModel.findOne({ _id: id, userId: req.userId, deletedAt: null });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or access denied', message: 'Payment method does not exist or you do not have permission to access it' });
    }
    
    res.json(toApiObject(paymentMethod));
  } catch (error: any) {
    console.error('Error fetching payment method:', error);
    res.status(500).json({ error: 'Failed to fetch payment method' });
  }
};

export const createPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createPaymentMethodSchema.parse({ ...req.body, userId: req.userId });
    
    // If this is set as default, unset other default payment methods
    if (validated.isDefault) {
      await PaymentMethodModel.updateMany(
        { userId: req.userId, isDefault: true },
        { isDefault: false }
      );
    }
    
    const paymentMethod = new PaymentMethodModel(validated);
    await paymentMethod.save();
    res.status(201).json(toApiObject(paymentMethod));
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    res.status(400).json({ error: error.message || 'Failed to create payment method' });
  }
};

export const updatePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = createPaymentMethodSchema.partial().parse({ ...req.body, userId: req.userId });
    
    // If this is being set as default, unset other default payment methods
    if (validated.isDefault) {
      await PaymentMethodModel.updateMany(
        { userId: req.userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }
    
    const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      validated,
      { new: true }
    );
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or access denied', message: 'Payment method does not exist or you do not have permission to update it' });
    }
    
    res.json(toApiObject(paymentMethod));
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    res.status(400).json({ error: error.message || 'Failed to update payment method' });
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // Hard delete
      const paymentMethod = await PaymentMethodModel.findOneAndDelete({ _id: id, userId: req.userId });
      
      if (!paymentMethod) {
        return res.status(404).json({ error: 'Payment method not found or access denied', message: 'Payment method does not exist or you do not have permission to delete it' });
      }
      
      res.json({ message: 'Payment method permanently deleted' });
    } else {
      // Soft delete
      const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
        { _id: id, userId: req.userId, deletedAt: null },
        { deletedAt: new Date().toISOString() },
        { new: true }
      );
      
      if (!paymentMethod) {
        return res.status(404).json({ error: 'Payment method not found or access denied', message: 'Payment method does not exist or you do not have permission to delete it' });
      }
      
      res.json(toApiObject(paymentMethod));
    }
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
};

export const restorePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
      { _id: id, userId: req.userId, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or access denied', message: 'Payment method does not exist or you do not have permission to restore it' });
    }
    
    res.json(toApiObject(paymentMethod));
  } catch (error: any) {
    console.error('Error restoring payment method:', error);
    res.status(500).json({ error: 'Failed to restore payment method' });
  }
};