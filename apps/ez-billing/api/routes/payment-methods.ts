import { Router } from 'express'
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getPaymentMethodById,
  restorePaymentMethod,
  updatePaymentMethod,
} from '../controllers/payment-method/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router()

// Protected routes with authentication
router.get('/', authMiddleware, getPaymentMethods)
router.get('/:id', authMiddleware, getPaymentMethodById)
router.post('/', authMiddleware, createPaymentMethod)
router.post('/:id/restore', authMiddleware, restorePaymentMethod)
router.put('/:id', authMiddleware, updatePaymentMethod)
router.delete('/:id', authMiddleware, deletePaymentMethod)

export default router