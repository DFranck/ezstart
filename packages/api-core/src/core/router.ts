/**
 * `createDocRouter` — build an Express router that records every registered
 * route in an `OpenAPIRegistry` and mounts handlers under the documented
 * path when a `basePath` is provided.
 *
 * Port of `createRouterWithDoc` from `@ezstart/express-core`, including the
 * sub-router mount fix that keeps Express paths in sync with OpenAPI docs.
 */

import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { z, type ZodTypeAny } from 'zod'
import { openApiCompatible } from './internal/openapi-helpers.js'

/** HTTP methods supported by the doc router. */
export type DocMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Describe the OpenAPI metadata of a single route.
 */
export type RouteDocOptions = {
  summary: string
  tags?: string[]
  bodySchema?: ZodTypeAny
  querySchema?: ZodTypeAny
  paramsSchema?: ZodTypeAny
  responseSchema?: ZodTypeAny
  /** Default `200`. Used as the key of the success response entry. */
  status?: number
  /** Additional responses keyed by status code. */
  extraResponses?: Record<number, { description: string; schema?: ZodTypeAny }>
}

/**
 * Error-shaped schema used for `4xx` / `5xx` entries. Mirrors the contract
 * emitted by `sendError` so Swagger UI shows the right example.
 */
const errorResponseSchema: ZodTypeAny = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
    retryAfter: z.number().optional(),
  }),
})

/**
 * Public surface of the doc-enabled router.
 */
export type DocRouter = {
  [method in DocMethod]: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => void
}

/**
 * Build a router that dual-writes to Express + an `OpenAPIRegistry`.
 *
 * When `basePath` is provided and non-empty, a dedicated sub-router is
 * mounted under it — guaranteeing the Express route and the documented
 * OpenAPI path match.
 *
 * @example
 * ```ts
 * import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
 * import { Router } from 'express'
 * import { createDocRouter } from '@ezstart/api-core'
 *
 * const registry = new OpenAPIRegistry()
 * const router = Router()
 * const docRouter = createDocRouter(registry, router, '/items')
 *
 * docRouter.get('/', listItems, { summary: 'List items', tags: ['Items'] })
 * ```
 */
export function createDocRouter(
  registry: OpenAPIRegistry,
  router: ExpressRouter,
  basePath = ''
): DocRouter {
  const hasBasePath = basePath !== '' && basePath !== '/'
  const targetRouter: ExpressRouter = hasBasePath ? Router({ mergeParams: true }) : router
  if (hasBasePath) {
    router.use(basePath, targetRouter)
  }

  function addRouteWithDoc(
    method: DocMethod,
    path: string,
    middlewares: RequestHandler[],
    options: RouteDocOptions
  ): void {
    const fullPath = basePath + path
    const requestDoc: Record<string, unknown> = {}

    if (options.bodySchema) {
      requestDoc.body = {
        content: {
          'application/json': {
            schema: openApiCompatible(options.bodySchema, `${options.summary}Request`),
          },
        },
      }
    }

    if (options.querySchema) {
      requestDoc.query = openApiCompatible(options.querySchema, `${options.summary}Query`)
    }

    if (options.paramsSchema) {
      requestDoc.params = openApiCompatible(options.paramsSchema, `${options.summary}Params`)
    }

    const responses: Record<
      number,
      { description: string; content?: Record<string, { schema: ZodTypeAny }> }
    > = {
      [options.status ?? 200]: {
        description: 'Success',
        content: options.responseSchema
          ? {
              'application/json': {
                schema: openApiCompatible(options.responseSchema, `${options.summary}Response`),
              },
            }
          : undefined,
      },
    }

    if (options.bodySchema && !options.extraResponses?.[422]) {
      responses[422] = {
        description: 'Validation error (invalid request body)',
        content: { 'application/json': { schema: errorResponseSchema } },
      }
    }

    if ((options.querySchema || options.paramsSchema) && !options.extraResponses?.[400]) {
      responses[400] = {
        description: 'Bad request (invalid query or params)',
        content: { 'application/json': { schema: errorResponseSchema } },
      }
    }

    if (options.extraResponses) {
      for (const [codeStr, resp] of Object.entries(options.extraResponses)) {
        const code = Number(codeStr)
        responses[code] = {
          description: resp.description,
          content: resp.schema
            ? {
                'application/json': {
                  schema: openApiCompatible(resp.schema, `${options.summary}Response${code}`),
                },
              }
            : undefined,
        }
      }
    }

    responses[500] ??= {
      description: 'Server error',
      content: { 'application/json': { schema: errorResponseSchema } },
    }

    registry.registerPath({
      method,
      path: fullPath,
      tags: options.tags ?? ['API'],
      summary: options.summary,
      request: Object.keys(requestDoc).length ? requestDoc : undefined,
      responses,
    })

    const routerMethod = targetRouter[method] as (
      path: string,
      ...handlers: RequestHandler[]
    ) => ExpressRouter
    routerMethod.call(targetRouter, path, ...middlewares)
  }

  function buildMethod(method: DocMethod) {
    return (path: string, ...args: [...RequestHandler[], RouteDocOptions]): void => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc(method, path, args as RequestHandler[], opts)
    }
  }

  return {
    get: buildMethod('get'),
    post: buildMethod('post'),
    put: buildMethod('put'),
    patch: buildMethod('patch'),
    delete: buildMethod('delete'),
  }
}
