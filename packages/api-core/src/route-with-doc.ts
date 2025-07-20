// packages/api-core/src/route-with-doc.ts
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { RequestHandler, Router } from 'express';
import { ZodTypeAny } from 'zod';
import { openApiCompatible } from './openapi';

type RouteDocOptions = {
  summary: string;
  tags?: string[];
  bodySchema?: ZodTypeAny;
  querySchema?: ZodTypeAny;
  paramsSchema?: ZodTypeAny;
  responseSchema?: ZodTypeAny;
  status?: number;
};

export function createRouterWithDoc(registry: OpenAPIRegistry, router: Router) {
  function addRouteWithDoc(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    middlewares: RequestHandler[],
    options: RouteDocOptions
  ) {
    const requestDoc: any = {};

    // ✅ BODY
    if (options.bodySchema) {
      requestDoc.body = {
        content: {
          'application/json': {
            schema: openApiCompatible(
              options.bodySchema,
              `${options.summary}Request`
            ),
          },
        },
      };
    }

    // ✅ QUERY → directement un ZodObject
    if (options.querySchema) {
      requestDoc.query = openApiCompatible(
        options.querySchema,
        `${options.summary}Query`
      );
    }

    // ✅ PARAMS → directement un ZodObject
    if (options.paramsSchema) {
      requestDoc.params = openApiCompatible(
        options.paramsSchema,
        `${options.summary}Params`
      );
    }

    // 👉 Enregistrement Swagger
    registry.registerPath({
      method,
      path,
      tags: options.tags ?? ['API'],
      summary: options.summary,
      request: Object.keys(requestDoc).length ? requestDoc : undefined,
      responses: {
        [options.status ?? 200]: {
          description: 'Success',
          content: options.responseSchema
            ? {
                'application/json': {
                  schema: openApiCompatible(
                    options.responseSchema,
                    `${options.summary}Response`
                  ),
                },
              }
            : undefined,
        },
      },
    });

    // 👉 Ajout normal au router Express
    (router as any)[method](path, ...middlewares);
  }

  return {
    get: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions;
      addRouteWithDoc('get', path, args as RequestHandler[], opts);
    },
    post: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions;
      addRouteWithDoc('post', path, args as RequestHandler[], opts);
    },
    put: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions;
      addRouteWithDoc('put', path, args as RequestHandler[], opts);
    },
    delete: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions;
      addRouteWithDoc('delete', path, args as RequestHandler[], opts);
    },
  };
}
