import { Router } from 'express';
import billsRoutes from './bills';
import quotesRoutes from './quotes';
import receiptsRoutes from './receipts';

const router = Router();

router.use('/quotes', quotesRoutes);
router.use('/receipts', receiptsRoutes);
router.use('/bills', billsRoutes);

export default router;
