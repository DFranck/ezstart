// packages/api-core/src/swagger-crud-factory.ts
import { Router } from 'express';
import { OpenAPIRegistry, openApiCompatible } from './openapi';
import { ZodTypeAny } from 'zod';

export type CrudConfig = {
  resource: string;               // ex: 'Client'
  basePath: string;               // ex: '/clients'
  createSchema: ZodTypeAny;       // schéma input pour POST & PUT
  outputSchema: ZodTypeAny;       // schéma output (liste/unique)
  controllers: {
    create: any;
    list: any;
    getById: any;
    update: any;
    softDelete: any;
    hardDelete?: any;
    restore?: any;
  };
};

export function registerCrudRoutes(router: Router, registry: OpenAPIRegistry, cfg: CrudConfig) {
  const { resource, basePath, createSchema, outputSchema, controllers } = cfg;

  // ✅ Swagger docs dynamiques
  registry.registerPath({
    method: 'post',
    path: basePath,
    tags: [resource],
    summary: `Create a ${resource}`,
    request: {
      body: {
        content: {
          'application/json': {
            schema: openApiCompatible(createSchema, `${resource}Create`),
          },
        },
      },
    },
    responses: {
      201: {
        description: `${resource} created successfully`,
        content: {
          'application/json': {
            schema: openApiCompatible(outputSchema, resource),
          },
        },
      },
    },
  });

  // ✅ Ajout réel des routes Express
  router.post(basePath, controllers.create);
  router.get(basePath, controllers.list);
  router.get(`${basePath}/:id`, controllers.getById);
  router.put(`${basePath}/:id`, controllers.update);
  router.delete(`${basePath}/:id`, controllers.softDelete);

  if (controllers.restore) {
    router.post(`${basePath}/:id/restore`, controllers.restore);
  }
  if (controllers.hardDelete) {
    router.delete(`${basePath}/:id/hard-delete`, controllers.hardDelete);
  }
}
