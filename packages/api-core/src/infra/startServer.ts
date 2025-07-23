import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

type StartServerOptions = {
  routes: express.Router;
  registries?: OpenAPIRegistry[];
  basePath?: string;
  serviceName?: string;
  port?: number;
};

export function startServer(app: express.Express, opts: StartServerOptions) {
  const {
    routes,
    registries = [],
    basePath = '/api',
    serviceName = 'API',
    port = 5000,
  } = opts;

  app.use(basePath, routes);

  app.get(`${basePath}/health`, (_, res) =>
    res.status(200).json({ status: 'ok' })
  );

  if (registries.length > 0) {
    const generator = new OpenApiGeneratorV3(
      registries.flatMap((r) => r.definitions)
    );

    const openApiDoc = generator.generateDocument({
      openapi: '3.0.0',
      info: {
        title: `${serviceName} API`,
        version: '1.0.0',
        description: `Auto-generated docs for ${serviceName}`,
      },
      servers: [{ url: basePath }],
    });
    app.use('/api', swaggerUi.serve, swaggerUi.setup(openApiDoc));
  }

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`🚀 ${serviceName} running on ${url}${basePath}`);
    if (registries.length > 0) console.log(`📖 Docs available at ${url}/api`);
  });
}
