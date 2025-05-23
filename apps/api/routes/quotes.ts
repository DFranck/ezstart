import { Router } from 'express';
import {
  addQuoteController,
  getAllQuotesController,
} from '../controllers/quotes';
const router = Router();

router.get('/', getAllQuotesController);
router.post('/', addQuoteController);

export default router;
