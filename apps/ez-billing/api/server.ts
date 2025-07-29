import { connectToMongo, createApp, startServer } from '@ezstart/api-core';
import routes, { globalRegistry } from './routes';

export const app = createApp();

connectToMongo('ez-billing')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      serviceName: 'EzBilling',
      port: 8001,
    })
  )
  .catch((err) => {
    console.error('❌ Failed to start EzBilling API', err);
    process.exit(1);
  });
