import express from 'express';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/api', routes);
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
