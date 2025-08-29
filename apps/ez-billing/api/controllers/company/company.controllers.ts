import { CreateCompany, createCompanySchema } from '@ez-billing/types';
import { Request, Response } from 'express';
import { CompanyModel } from '../../models/company.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

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

export const createCompany = async (req: Request, res: Response) => {
  try {
    const validated = createCompanySchema.parse(req.body);
    const company = new CompanyModel(validated);
    await company.save();
    res.status(201).json({ company: toApiObject(company) });
  } catch (error: any) {
    console.error('Error creating company:', error);
    res.status(400).json({ error: error.message || 'Failed to create company' });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = createCompanySchema.partial().parse(req.body);
    
    const company = await CompanyModel.findByIdAndUpdate(id, validated, { new: true });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ company: toApiObject(company) });
  } catch (error: any) {
    console.error('Error updating company:', error);
    res.status(400).json({ error: error.message || 'Failed to update company' });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company = await CompanyModel.findByIdAndDelete(id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};