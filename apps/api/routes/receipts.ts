import { Router } from 'express';
const router = Router();

// GET /api/receipts
router.get('/', (req, res) => {
  res.json([{ id: 1, amount: 150 }]);
});

export default router;
