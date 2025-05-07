import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
