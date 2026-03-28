/**
 * POST /api/monsters/import — Trigger import from SWARFARM
 * GET /api/monsters — List monsters with filters
 * GET /api/monsters/by-build/:archetype — Monsters by build archetype
 * GET /api/monsters/for-rune — Monsters matching rune archetypes
 */

import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { importMonsters } from '../services/monster-import-service.js'
import { getMonsterModel } from '../models/monster.js'

const router: any = Router()

// POST /import — Trigger SWARFARM import
router.post('/import', async (_req: any, res: any) => {
  try {
    const count = await importMonsters()
    res.json({
      success: true,
      data: { imported: count },
    })
  } catch (error) {
    console.error('[import-monsters] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import monsters',
    })
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
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.errors,
      })
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

    res.json({
      success: true,
      data: {
        monsters,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('[list-monsters] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list monsters',
    })
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

    res.json({
      success: true,
      data: { archetype, count: monsters.length, monsters },
    })
  } catch (error) {
    console.error('[monsters-by-build] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch monsters by build',
    })
  }
})

// GET /for-rune?archetypes=speed-dps,cleave — Monsters matching rune archetypes
router.get('/for-rune', async (req: any, res: any) => {
  try {
    const archetypesParam = req.query.archetypes as string
    if (!archetypesParam) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "archetypes" is required (comma-separated)',
      })
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

    res.json({
      success: true,
      data: {
        archetypes,
        count: monsters.length,
        monsters,
      },
    })
  } catch (error) {
    console.error('[monsters-for-rune] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch monsters for rune',
    })
  }
})

export default router
