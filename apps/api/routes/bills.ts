import { Router } from 'express';
const router = Router();

// GET /api/bills
router.get('/', (req, res) => {
  res.json([{ id: 1, dueDate: '2024-06-01' }]);
});

export default router;
