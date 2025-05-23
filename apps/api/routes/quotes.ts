import { Router } from 'express';
const router = Router();

// GET /api/quotes
router.get('/', (req, res) => {
  res.json([{ id: 1, content: 'Test quote' }]);
});

// ...tes autres routes

export default router;
