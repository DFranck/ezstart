import {
  CreatePaymentMethod,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from '@ezbill/types'
import { Request, Response } from 'express'
import { PaymentMethodModel } from '../../models/payment-method.js'
import { toApiObject } from '../../utils/mongoose/to-api-object.js'
import { AuthRequest } from '../../types/auth.js'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError } from '@ezstart/express-core'

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    const { includeDeleted, deletedOnly } = req.query
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    let deletedAtFilter = {}
    if (deletedOnly === 'true') {
      deletedAtFilter = { deletedAt: { $ne: null } }
    } else if (includeDeleted !== 'true') {
      deletedAtFilter = { deletedAt: null }
    }

    const filter = { userId: req.userId, ...deletedAtFilter }
    const skip = (page - 1) * limit

    const [paymentMethods, total] = await Promise.all([
      PaymentMethodModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentMethodModel.countDocuments(filter),
    ])

    sendSuccess(res, paymentMethods.map(toApiObject), {
      total,
      limit,
      offset: skip,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    logger.error('Error fetching payment methods:', error)
    sendError(res, 'Failed to fetch payment methods')
  }
}

export const getPaymentMethodById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const paymentMethod = await PaymentMethodModel.findOne({
      _id: id,
      userId: req.userId,
      deletedAt: null,
    })

    if (!paymentMethod) {
      return sendError(res, 'Payment method not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(paymentMethod))
  } catch (error: unknown) {
    logger.error('Error fetching payment method:', error)
    sendError(res, 'Failed to fetch payment method')
  }
}

export const createPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const result = createPaymentMethodSchema.safeParse({ ...req.body, userId: req.userId })
    if (!result.success) {
      return sendError(res, result.error.errors[0]?.message || 'Validation failed', 400)
    }

    // If this is set as default, unset other default payment methods
    if (result.data.isDefault) {
      await PaymentMethodModel.updateMany(
        { userId: req.userId, isDefault: true },
        { isDefault: false }
      )
    }

    const paymentMethod = new PaymentMethodModel(result.data)
    await paymentMethod.save()
    res.status(201)
    sendSuccess(res, toApiObject(paymentMethod))
  } catch (error: unknown) {
    logger.error('Error creating payment method:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to create payment method', 400)
  }
}

export const updatePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = updatePaymentMethodSchema.safeParse({ ...req.body, userId: req.userId })
    if (!result.success) {
      return sendError(res, result.error.errors[0]?.message || 'Validation failed', 400)
    }

    // If this is being set as default, unset other default payment methods
    if (result.data.isDefault) {
      await PaymentMethodModel.updateMany(
        { userId: req.userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      )
    }

    const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      result.data,
      { new: true }
    )
    if (!paymentMethod) {
      return sendError(res, 'Payment method not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(paymentMethod))
  } catch (error: unknown) {
    logger.error('Error updating payment method:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to update payment method', 400)
  }
}

export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { permanent } = req.query

    if (permanent === 'true') {
      // Hard delete
      const paymentMethod = await PaymentMethodModel.findOneAndDelete({
        _id: id,
        userId: req.userId,
      })

      if (!paymentMethod) {
        return sendError(res, 'Payment method not found or access denied', 404)
      }

      sendSuccess(res, null, { message: 'Payment method permanently deleted' })
    } else {
      // Soft delete
      const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
        { _id: id, userId: req.userId, deletedAt: null },
        { deletedAt: new Date().toISOString() },
        { new: true }
      )

      if (!paymentMethod) {
        return sendError(res, 'Payment method not found or access denied', 404)
      }

      sendSuccess(res, toApiObject(paymentMethod))
    }
  } catch (error: unknown) {
    logger.error('Error deleting payment method:', error)
    sendError(res, 'Failed to delete payment method')
  }
}

export const restorePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const paymentMethod = await PaymentMethodModel.findOneAndUpdate(
      { _id: id, userId: req.userId, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    )

    if (!paymentMethod) {
      return sendError(res, 'Payment method not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(paymentMethod))
  } catch (error: unknown) {
    logger.error('Error restoring payment method:', error)
    sendError(res, 'Failed to restore payment method')
  }
}
