import { CreateCompany, createCompanySchema } from '@ezbill/types'
import { Request, Response } from 'express'
import { CompanyModel } from '../../models/company.js'
import { toApiObject } from '../../utils/mongoose/to-api-object.js'
import { AuthRequest } from '../../types/auth.js'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError } from '@ezstart/api-core'

export const getCompanies = async (req: AuthRequest, res: Response) => {
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

    const [companies, total] = await Promise.all([
      CompanyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CompanyModel.countDocuments(filter),
    ])

    sendSuccess(res, companies.map(toApiObject), {
      total,
      limit,
      offset: skip,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    logger.error('Error fetching companies:', error)
    sendError(res, 'Failed to fetch companies')
  }
}

export const getCompanyById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const company = await CompanyModel.findOne({ _id: id, userId: req.userId, deletedAt: null })

    if (!company) {
      return sendError(res, 'Company not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(company))
  } catch (error: unknown) {
    logger.error('Error fetching company:', error)
    sendError(res, 'Failed to fetch company')
  }
}

export const getCompaniesByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const companies = await CompanyModel.find({ userId }).sort({ createdAt: -1 })
    sendSuccess(res, companies.map(toApiObject))
  } catch (error: unknown) {
    logger.error('Error fetching companies:', error)
    sendError(res, 'Failed to fetch companies')
  }
}

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const result = createCompanySchema.safeParse({ ...req.body, userId: req.userId })
    if (!result.success) {
      return sendError(res, result.error.errors[0]?.message || 'Validation failed', 400)
    }
    const company = new CompanyModel(result.data)
    await company.save()
    res.status(201)
    sendSuccess(res, toApiObject(company))
  } catch (error: unknown) {
    logger.error('Error creating company:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to create company', 400)
  }
}

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = createCompanySchema.partial().safeParse({ ...req.body, userId: req.userId })
    if (!result.success) {
      return sendError(res, result.error.errors[0]?.message || 'Validation failed', 400)
    }

    const company = await CompanyModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      result.data,
      { new: true }
    )
    if (!company) {
      return sendError(res, 'Company not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(company))
  } catch (error: unknown) {
    logger.error('Error updating company:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to update company', 400)
  }
}

export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { permanent } = req.query

    if (permanent === 'true') {
      // Hard delete
      const company = await CompanyModel.findOneAndDelete({ _id: id, userId: req.userId })

      if (!company) {
        return sendError(res, 'Company not found or access denied', 404)
      }

      sendSuccess(res, null, { message: 'Company permanently deleted' })
    } else {
      // Soft delete
      const company = await CompanyModel.findOneAndUpdate(
        { _id: id, userId: req.userId, deletedAt: null },
        { deletedAt: new Date().toISOString() },
        { new: true }
      )

      if (!company) {
        return sendError(res, 'Company not found or access denied', 404)
      }

      sendSuccess(res, toApiObject(company))
    }
  } catch (error: unknown) {
    logger.error('Error deleting company:', error)
    sendError(res, 'Failed to delete company')
  }
}

export const restoreCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const company = await CompanyModel.findOneAndUpdate(
      { _id: id, userId: req.userId, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    )

    if (!company) {
      return sendError(res, 'Company not found or access denied', 404)
    }

    sendSuccess(res, toApiObject(company))
  } catch (error: unknown) {
    logger.error('Error restoring company:', error)
    sendError(res, 'Failed to restore company')
  }
}
