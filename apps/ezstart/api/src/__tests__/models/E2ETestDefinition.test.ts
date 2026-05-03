import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setupTestDatabase } from '@ezstart/test-utils'
import {
  getE2ETestDefinitionModel,
  type IE2ETestDefinition,
} from '../../models/E2ETestDefinition.js'
import type { Model } from 'mongoose'

describe('E2ETestDefinition Model', () => {
  let DefinitionModel: Model<IE2ETestDefinition>

  beforeAll(async () => {
    await setupTestDatabase()
    DefinitionModel = await getE2ETestDefinitionModel()
    try {
      await DefinitionModel.collection.dropIndexes()
    } catch {
      // ignore
    }
    await DefinitionModel.createIndexes()
  })

  beforeEach(async () => {
    await DefinitionModel.deleteMany({})
  })

  it('creates a definition with all required fields', async () => {
    const def = await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing page renders',
      routesExercised: ['/en'],
      filesExercised: ['apps/ezauth/web/src/app/[locale]/page.tsx'],
      cadence: 'when-feature-touched',
      priority: 'P0',
    })
    expect(def.testId).toBe('ezauth.public.landing')
    expect(def.app).toBe('ezauth')
    expect(def.priority).toBe('P0')
  })

  it('rejects invalid app enum', async () => {
    const doc = new DefinitionModel({
      testId: 'foo.public.bar',
      app: 'not-an-app',
      feature: 'bar',
      category: 'public',
      description: 'x',
    })
    await expect(doc.validate()).rejects.toThrow()
  })

  it('rejects invalid status (priority) enum', async () => {
    const doc = new DefinitionModel({
      testId: 'foo.public.bar',
      app: 'ezauth',
      feature: 'bar',
      category: 'public',
      description: 'x',
      priority: 'P9',
    })
    await expect(doc.validate()).rejects.toThrow()
  })

  it('enforces unique testId', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing page renders',
    })
    await expect(
      DefinitionModel.create({
        testId: 'ezauth.public.landing',
        app: 'ezauth',
        feature: 'landing',
        category: 'public',
        description: 'duplicate',
      })
    ).rejects.toThrow()
  })

  it('upsert is idempotent (same testId twice updates instead of inserting)', async () => {
    await DefinitionModel.findOneAndUpdate(
      { testId: 'ezauth.public.landing' },
      {
        $set: {
          app: 'ezauth',
          feature: 'landing',
          category: 'public',
          description: 'first',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    await DefinitionModel.findOneAndUpdate(
      { testId: 'ezauth.public.landing' },
      {
        $set: {
          app: 'ezauth',
          feature: 'landing',
          category: 'public',
          description: 'second',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    const count = await DefinitionModel.countDocuments({ testId: 'ezauth.public.landing' })
    expect(count).toBe(1)
    const found = await DefinitionModel.findOne({ testId: 'ezauth.public.landing' })
    expect(found?.description).toBe('second')
  })
})
