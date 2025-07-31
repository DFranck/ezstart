import {
  connectToMongo,
  createApp,
  createSocketServer,
  startServer,
} from '@ezstart/api-core';
import routes, { globalRegistry } from './routes';

const app = createApp();

app.use('/api', routes);
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }));

connectToMongo('tower-defense')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      serviceName: 'EzStart',
      port: 8002,
      onHttpServerReady: (server) => {
        createSocketServer(server, {
          // here you can add socket.io logic
        });
      },
    })
  )
  .catch((err) => {
    console.error('❌ Failed to start EzStart API', err);
    process.exit(1);
  });
