/**
 * POST /api/monsters/import — Trigger import from SWARFARM
 * GET /api/monsters — List monsters with filters
 * GET /api/monsters/by-build/:archetype — Monsters by build archetype
 * GET /api/monsters/for-rune — Monsters matching rune archetypes
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { z } from 'zod'
import { importMonsters } from '../services/monster-import-service.js'
import { getMonsterModel } from '../models/monster.js'

const router: any = Router()

// POST /import — Trigger SWARFARM import
router.post('/import', async (_req: any, res: any) => {
  try {
    const count = await importMonsters()
    return sendSuccess(res, { imported: count })
  } catch (error) {
    logger.error('[import-monsters] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to import monsters')
  }
})

// GET / — List monsters with filters
const listQuerySchema = z.object({
  element: z.enum(['fire', 'water', 'wind', 'light', 'dark']).optional(),
  archetype: z.enum(['attack', 'defense', 'support', 'hp']).optional(),
  buildArchetype: z.string().optional(),
  stars: z.coerce.number().min(2).max(5).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

router.get('/', async (req: any, res: any) => {
  try {
    const validation = listQuerySchema.safeParse(req.query)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid query parameters', validation.error.errors, 400)
    }

    const { element, archetype, buildArchetype, stars, search, page, limit } = validation.data
    const filter: Record<string, any> = {}

    if (element) filter.element = element
    if (archetype) filter.archetype = archetype
    if (buildArchetype) filter.buildArchetypes = buildArchetype
    if (stars) filter.naturalStars = stars
    if (search) filter.name = { $regex: search, $options: 'i' }

    const MonsterModel = await getMonsterModel()
    const skip = (page - 1) * limit

    const [monsters, total] = await Promise.all([
      MonsterModel.find(filter).sort({ naturalStars: -1, name: 1 }).skip(skip).limit(limit).lean(),
      MonsterModel.countDocuments(filter),
    ])

    return sendSuccess(res, { monsters }, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    logger.error('[list-monsters] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to list monsters')
  }
})

// GET /by-build/:archetype — Monsters by build archetype
router.get('/by-build/:archetype', async (req: any, res: any) => {
  try {
    const { archetype } = req.params
    const MonsterModel = await getMonsterModel()

    const monsters = await MonsterModel.find({ buildArchetypes: archetype })
      .sort({ naturalStars: -1, name: 1 })
      .lean()

    return sendSuccess(res, { archetype, count: monsters.length, monsters })
  } catch (error) {
    logger.error('[monsters-by-build] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to fetch monsters by build')
  }
})

// GET /for-rune?archetypes=speed-dps,cleave — Monsters matching rune archetypes
router.get('/for-rune', async (req: any, res: any) => {
  try {
    const archetypesParam = req.query.archetypes as string
    if (!archetypesParam) {
      return sendError(res, 'Query parameter "archetypes" is required (comma-separated)', 400)
    }

    const archetypes = archetypesParam.split(',').map((a: string) => a.trim())
    const MonsterModel = await getMonsterModel()

    // Prioritize nat4+, obtainable, and monsters matching multiple archetypes
    const monsters = await MonsterModel.aggregate([
      {
        $match: {
          buildArchetypes: { $in: archetypes },
          naturalStars: { $gte: 4 },
          obtainable: true,
        },
      },
      {
        $addFields: {
          matchCount: {
            $size: { $setIntersection: ['$buildArchetypes', archetypes] },
          },
        },
      },
      { $sort: { matchCount: -1, naturalStars: -1, name: 1 } },
      { $limit: 15 },
      { $project: { matchCount: 0 } },
    ])

    return sendSuccess(res, { archetypes, count: monsters.length, monsters })
  } catch (error) {
    logger.error('[monsters-for-rune] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to fetch monsters for rune')
  }
})

export default router
