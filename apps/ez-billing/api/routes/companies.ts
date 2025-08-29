import { Router } from 'express';
import { createCompany, deleteCompany, getCompaniesByUserId, updateCompany } from '../controllers/company/index.js';

const router = Router();

router.get('/user/:userId', getCompaniesByUserId);
router.post('/', createCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

export default router;