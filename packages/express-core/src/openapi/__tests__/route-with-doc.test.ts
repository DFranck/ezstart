import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express, { Router, type IRouter } from 'express'
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createRouterWithDoc } from '../route-with-doc.js'

type RegisteredPathEntry = {
  type: 'route'
  path: string
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
}

/**
 * Collect every registered (method, path) tuple in an Express router, walking
 * sub-routers that were mounted via `router.use(prefix, subRouter)`.
 */
function collectRoutes(router: IRouter, prefix = ''): RegisteredPathEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack: unknown[] = (router as any).stack ?? []
  const entries: RegisteredPathEntry[] = []

  for (const layer of stack) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = layer as any
    if (l.route) {
      // Leaf route: l.route.path is relative to the current router
      const methods = Object.keys(l.route.methods) as RegisteredPathEntry['method'][]
      for (const method of methods) {
        entries.push({ type: 'route', method, path: prefix + l.route.path })
      }
    } else if (l.name === 'router' && l.handle?.stack) {
      // Nested sub-router mounted via router.use(basePath, subRouter)
      // Express builds a regex from the mount path — extract the human form
      // from `l.regexp.fast_slash` (true means mounted on '/') or fall back to
      // parsing the regex source.
      let mountPath = ''
      if (!l.regexp?.fast_slash) {
        const regexSource = String(l.regexp)
        // Match patterns like /^\/basepath\/?(?=\/|$)/i
        const match = regexSource.match(/^\/\^\\?\/([^\\?]+)/)
        if (match && match[1]) {
          mountPath = '/' + match[1].replace(/\\\//g, '/')
        }
      }
      entries.push(...collectRoutes(l.handle, prefix + mountPath))
    }
  }

  return entries
}

function getRegistryPaths(registry: OpenAPIRegistry): Array<{ method: string; path: string }> {
  return registry.definitions
    .filter(d => d.type === 'route')
    .map(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const route = (d as any).route
      return { method: route.method, path: route.path }
    })
}

describe('createRouterWithDoc', () => {
  it('mounts handlers on the raw path when no basePath is provided (retro-compat)', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createRouterWithDoc(registry, router)

    docRouter.get(
      '/foo',
      (_req, res) => {
        res.json({ ok: true, route: '/foo' })
      },
      { summary: 'Get foo', tags: ['Test'] }
    )

    const app = express()
    app.use(router)

    const res = await request(app).get('/foo')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: '/foo' })

    const registryPaths = getRegistryPaths(registry)
    expect(registryPaths).toContainEqual({ method: 'get', path: '/foo' })
  })

  it('mounts handlers under basePath when basePath is provided (bug fix)', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createRouterWithDoc(registry, router, '/configs')

    docRouter.get(
      '/',
      (_req, res) => {
        res.json({ ok: true, route: '/configs/' })
      },
      { summary: 'List configs', tags: ['Configs'] }
    )

    const app = express()
    app.use(router)

    const resAtConfigs = await request(app).get('/configs/')
    expect(resAtConfigs.status).toBe(200)
    expect(resAtConfigs.body).toEqual({ ok: true, route: '/configs/' })

    // Express treats /configs and /configs/ as the same route when a sub-router
    // is mounted at /configs — both must reach the handler.
    const resAtConfigsNoSlash = await request(app).get('/configs')
    expect(resAtConfigsNoSlash.status).toBe(200)

    // Before the fix, the handler was mounted on `/` directly on the parent
    // router, so GET / would succeed. After the fix it must 404.
    const resAtRoot = await request(app).get('/')
    expect(resAtRoot.status).toBe(404)
  })

  it('preserves path parameters declared on the inner path when basePath is set', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createRouterWithDoc(registry, router, '/configs')

    docRouter.get(
      '/:id',
      (req, res) => {
        res.json({ ok: true, id: req.params.id })
      },
      { summary: 'Get config by id', tags: ['Configs'] }
    )

    const app = express()
    app.use(router)

    const res = await request(app).get('/configs/abc123')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, id: 'abc123' })

    // Sanity: collecting the internal router stack must report /configs/:id
    const routes = collectRoutes(router)
    expect(routes).toContainEqual({ type: 'route', method: 'get', path: '/configs/:id' })
  })

  it('registers the OpenAPI path as basePath + path in every case', () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createRouterWithDoc(registry, router, '/configs')

    docRouter.get('/', (_req, res) => res.end(), { summary: 'A', tags: ['T'] })
    docRouter.post('/', (_req, res) => res.end(), { summary: 'B', tags: ['T'] })
    docRouter.get('/:id', (_req, res) => res.end(), { summary: 'C', tags: ['T'] })
    docRouter.patch('/:id', (_req, res) => res.end(), { summary: 'D', tags: ['T'] })
    docRouter.delete('/:id', (_req, res) => res.end(), { summary: 'E', tags: ['T'] })

    const paths = getRegistryPaths(registry)
    expect(paths).toEqual(
      expect.arrayContaining([
        { method: 'get', path: '/configs/' },
        { method: 'post', path: '/configs/' },
        { method: 'get', path: '/configs/:id' },
        { method: 'patch', path: '/configs/:id' },
        { method: 'delete', path: '/configs/:id' },
      ])
    )
  })

  it('is equivalent to passing basePath="" when basePath="/"', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createRouterWithDoc(registry, router, '/')

    docRouter.get(
      '/foo',
      (_req, res) => {
        res.json({ ok: true })
      },
      { summary: 'Foo', tags: ['Test'] }
    )

    const app = express()
    app.use(router)

    // With basePath='/', no sub-router is mounted; handler is directly on /foo.
    const res = await request(app).get('/foo')
    expect(res.status).toBe(200)
  })
})
