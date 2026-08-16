import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express, { Router, type IRouter } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createDocRouter } from '../core/router.js'

type RegistryRouteDefinition = {
  type: 'route'
  route: { method: string; path: string }
}

function getRegistryPaths(registry: OpenAPIRegistry): Array<{ method: string; path: string }> {
  return (registry.definitions as RegistryRouteDefinition[])
    .filter(d => d.type === 'route')
    .map(d => ({ method: d.route.method, path: d.route.path }))
}

describe('createDocRouter', () => {
  it('mounts handlers on the raw path when no basePath is provided', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createDocRouter(registry, router)

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

    expect(getRegistryPaths(registry)).toContainEqual({ method: 'get', path: '/foo' })
  })

  it('mounts handlers under basePath via a sub-router (bug fix)', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createDocRouter(registry, router, '/configs')

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

    const resAtConfigsNoSlash = await request(app).get('/configs')
    expect(resAtConfigsNoSlash.status).toBe(200)

    const resAtRoot = await request(app).get('/')
    expect(resAtRoot.status).toBe(404)
  })

  it('preserves path parameters declared on the inner path when basePath is set', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createDocRouter(registry, router, '/configs')

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
  })

  it('registers the OpenAPI path as basePath + path for every method', () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createDocRouter(registry, router, '/configs')

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

  it('treats basePath="/" as equivalent to basePath="" (no sub-router mount)', async () => {
    const registry = new OpenAPIRegistry()
    const router: IRouter = Router()
    const docRouter = createDocRouter(registry, router, '/')

    docRouter.get(
      '/foo',
      (_req, res) => {
        res.json({ ok: true })
      },
      { summary: 'Foo', tags: ['Test'] }
    )

    const app = express()
    app.use(router)

    const res = await request(app).get('/foo')
    expect(res.status).toBe(200)
  })
})
