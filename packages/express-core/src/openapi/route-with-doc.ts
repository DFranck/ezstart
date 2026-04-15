import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { RequestHandler, Router } from 'express'
import { ZodTypeAny } from 'zod'
import { openApiCompatible } from './openapi-compatible.js'
import { apiErrorSchema } from './z-object-helper.js'
type RouteDocOptions = {
  summary: string
  tags?: string[]
  bodySchema?: ZodTypeAny
  querySchema?: ZodTypeAny
  paramsSchema?: ZodTypeAny
  responseSchema?: ZodTypeAny
  status?: number
  extraResponses?: {
    [statusCode: number]: {
      description: string
      schema?: ZodTypeAny
    }
  }
}

export function createRouterWithDoc(registry: OpenAPIRegistry, router: Router, basePath = '') {
  // When a basePath is provided, mount a dedicated sub-router so every handler
  // registered through this helper is reachable at `basePath + path` in Express
  // AND documented at the same path in OpenAPI. Without this, handlers were
  // registered directly on `router` (ignoring basePath) causing the real URL
  // to drift from the documented one.
  // Retro-compat: when basePath is empty/'/', we keep registering directly on
  // the caller-provided `router` (unchanged behavior).
  const hasBasePath = basePath !== '' && basePath !== '/'
  const targetRouter: Router = hasBasePath ? Router({ mergeParams: true }) : router
  if (hasBasePath) {
    router.use(basePath, targetRouter)
  }

  function addRouteWithDoc(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    middlewares: RequestHandler[],
    options: RouteDocOptions
  ) {
    const fullPath = basePath + path
    const requestDoc: Record<string, unknown> = {}
    // ✅ BODY
    if (options.bodySchema) {
      requestDoc.body = {
        content: {
          'application/json': {
            schema: openApiCompatible(options.bodySchema, `${options.summary}Request`),
          },
        },
      }
    }

    // ✅ QUERY → directement un ZodObject
    if (options.querySchema) {
      requestDoc.query = openApiCompatible(options.querySchema, `${options.summary}Query`)
    }

    // ✅ PARAMS → directement un ZodObject
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
    // Ajoute 422 si bodySchema
    if (options.bodySchema && !options.extraResponses?.[422]) {
      responses[422] = {
        description: 'Validation error (invalid request body)',
        content: {
          'application/json': { schema: apiErrorSchema },
        },
      }
    }

    // Ajoute 400 si query/params schema
    if ((options.querySchema || options.paramsSchema) && !options.extraResponses?.[400]) {
      responses[400] = {
        description: 'Bad request (invalid query or params)',
        content: {
          'application/json': { schema: apiErrorSchema },
        },
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
      content: {
        'application/json': {
          schema: apiErrorSchema,
        },
      },
    }

    registry.registerPath({
      method,
      path: fullPath,
      tags: options.tags ?? ['API'],
      summary: options.summary,
      request: Object.keys(requestDoc).length ? requestDoc : undefined,
      responses,
    })
    ;(targetRouter[method] as (...args: unknown[]) => void)(path, ...middlewares)
  }

  return {
    get: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc('get', path, args as RequestHandler[], opts)
    },
    post: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc('post', path, args as RequestHandler[], opts)
    },
    put: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc('put', path, args as RequestHandler[], opts)
    },
    patch: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc('patch', path, args as RequestHandler[], opts)
    },
    delete: (path: string, ...args: [...RequestHandler[], RouteDocOptions]) => {
      const opts = args.pop() as RouteDocOptions
      addRouteWithDoc('delete', path, args as RequestHandler[], opts)
    },
  }
}
