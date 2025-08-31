import { Router } from 'express';
import { createCompany, deleteCompany, getCompanies, getCompanyById, getCompaniesByUserId, restoreCompany, updateCompany } from '../controllers/company/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Protected routes with authentication
router.get('/', authMiddleware, getCompanies);
router.get('/:id', authMiddleware, getCompanyById);
router.post('/', authMiddleware, createCompany);
router.post('/:id/restore', authMiddleware, restoreCompany);
router.put('/:id', authMiddleware, updateCompany);
router.delete('/:id', authMiddleware, deleteCompany);

// Legacy route (keep for backward compatibility)
router.get('/user/:userId', getCompaniesByUserId);

export default router;