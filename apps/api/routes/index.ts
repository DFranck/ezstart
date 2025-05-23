import { Router } from 'express';
import quotesRoutes from './quotes';
import receiptsRoutes from './receipts';
import billsRoutes from './bills';

const router = Router();

router.use('/quotes', quotesRoutes);
router.use('/receipts', receiptsRoutes);
router.use('/bills', billsRoutes);

export default router;
