import express, { Router } from 'express';
import {
  addQuoteController,
  generateQuotePdfController,
  getAllQuotesController,
} from '../controllers/quotes';
const router: Router = express.Router();

router.get('/', getAllQuotesController);
router.post('/', addQuoteController);
router.post('/:id/pdf', generateQuotePdfController);

export default router;
