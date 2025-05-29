import cors from 'cors';
import express from 'express';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
