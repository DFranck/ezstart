import { CreateCompany, createCompanySchema } from '@ezbill/types';
import { Request, Response } from 'express';
import { CompanyModel } from '../../models/company.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { AuthRequest } from '../../types/auth.js';

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const { includeDeleted, deletedOnly } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    let deletedAtFilter = {};
    if (deletedOnly === 'true') {
      deletedAtFilter = { deletedAt: { $ne: null } };
    } else if (includeDeleted !== 'true') {
      deletedAtFilter = { deletedAt: null };
    }

    const filter = { userId: req.userId, ...deletedAtFilter };
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      CompanyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CompanyModel.countDocuments(filter),
    ]);

    res.json({
      data: companies.map(toApiObject),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

export const getCompanyById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await CompanyModel.findOne({ _id: id, userId: req.userId, deletedAt: null });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied', message: 'Company does not exist or you do not have permission to access it' });
    }
    
    res.json(toApiObject(company));
  } catch (error: any) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};

export const getCompaniesByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const companies = await CompanyModel.find({ userId }).sort({ createdAt: -1 });
    res.json({ companies: companies.map(toApiObject) });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createCompanySchema.parse({ ...req.body, userId: req.userId });
    const company = new CompanyModel(validated);
    await company.save();
    res.status(201).json(toApiObject(company));
  } catch (error: any) {
    console.error('Error creating company:', error);
    res.status(400).json({ error: error.message || 'Failed to create company' });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = createCompanySchema.partial().parse({ ...req.body, userId: req.userId });
    
    const company = await CompanyModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      validated,
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied', message: 'Company does not exist or you do not have permission to update it' });
    }
    
    res.json(toApiObject(company));
  } catch (error: any) {
    console.error('Error updating company:', error);
    res.status(400).json({ error: error.message || 'Failed to update company' });
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // Hard delete
      const company = await CompanyModel.findOneAndDelete({ _id: id, userId: req.userId });
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found or access denied', message: 'Company does not exist or you do not have permission to delete it' });
      }
      
      res.json({ message: 'Company permanently deleted' });
    } else {
      // Soft delete
      const company = await CompanyModel.findOneAndUpdate(
        { _id: id, userId: req.userId, deletedAt: null },
        { deletedAt: new Date().toISOString() },
        { new: true }
      );
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found or access denied', message: 'Company does not exist or you do not have permission to delete it' });
      }
      
      res.json(toApiObject(company));
    }
  } catch (error: any) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

export const restoreCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await CompanyModel.findOneAndUpdate(
      { _id: id, userId: req.userId, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied', message: 'Company does not exist or you do not have permission to restore it' });
    }
    
    res.json(toApiObject(company));
  } catch (error: any) {
    console.error('Error restoring company:', error);
    res.status(500).json({ error: 'Failed to restore company' });
  }
};

