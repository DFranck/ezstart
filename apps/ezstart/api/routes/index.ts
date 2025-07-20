import express, { Router } from 'express';

const router: Router = express.Router();

router.get('/test', (_, res) => {
  res.json({
    message: '✅ Test route is working!',
    timestamp: new Date().toISOString(),
  });
});

export default router;
