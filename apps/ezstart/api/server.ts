import { connectToMongo, createApp, startServer } from '@ezstart/api-core';
import routes from './routes';

const app = createApp();

app.use('/api', routes);
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }));

connectToMongo('boilerplate')
  .then(() => startServer(app, './routes/index.ts', 5000))
  .catch((err) => {
    console.error('❌ Failed to start EzStart API', err);
    process.exit(1);
  });
