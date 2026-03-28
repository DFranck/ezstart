/**
 * OpenAPI registries for Game Analyzer API
 *
 * Centralizes all route documentation in one place.
 * Each registry is passed to startServer() for /docs generation.
 */

import { OpenAPIRegistry } from '@ezstart/express-core'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false),
        error: z.string(),
      }),
    },
  },
})

// ---------------------------------------------------------------------------
// Scans registry
// ---------------------------------------------------------------------------

export const scansRegistry = new OpenAPIRegistry()

// POST /scan
scansRegistry.registerPath({
  method: 'post',
  path: '/scan',
  tags: ['Scans'],
  summary: 'Upload and scan a rune image',
  description: 'Upload a rune screenshot with OCR analysis. Supports main image, alt image, full image, and individual zone crops.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().describe('Main rune screenshot (required)'),
            gameType: z.enum(['summoners-war', 'nikke']).describe('Target game'),
            profile: z.enum(['early', 'mid', 'late']).optional().describe('Player progression profile (default: mid)'),
            benchMode: z.boolean().optional().describe('Run all OCR presets for comparison'),
            imageAlt: z.string().optional().describe('Alternative image for fallback OCR'),
            imageFull: z.string().optional().describe('Full-size screenshot'),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Scan completed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().describe('Scan ID'),
              gameType: z.string(),
              status: z.enum(['completed', 'failed']),
              result: z.any().describe('OCR + analysis result'),
            }),
          }),
        },
      },
    },
    400: errorResponse('Missing image or invalid request body'),
    500: errorResponse('Server error during scan processing'),
  },
})

// GET /scans
scansRegistry.registerPath({
  method: 'get',
  path: '/scans',
  tags: ['Scans'],
  summary: 'List scan history',
  description: 'Returns paginated scan history, most recent first. Supports filtering by game type and status.',
  request: {
    query: z.object({
      gameType: z.enum(['summoners-war', 'nikke']).optional().describe('Filter by game'),
      status: z.enum(['completed', 'failed']).optional().describe('Filter by scan status'),
      limit: z.string().optional().describe('Max results (default: 50)'),
      offset: z.string().optional().describe('Skip N results (default: 0)'),
    }),
  },
  responses: {
    200: {
      description: 'Scan list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(z.any()).describe('Array of scan objects'),
            meta: z.object({
              total: z.number(),
              limit: z.number(),
              offset: z.number(),
            }),
          }),
        },
      },
    },
    500: errorResponse('Failed to fetch scans'),
  },
})

// GET /scans/:id
scansRegistry.registerPath({
  method: 'get',
  path: '/scans/{id}',
  tags: ['Scans'],
  summary: 'Get scan detail',
  description: 'Returns full scan data including OCR text, parsed rune data, and analysis.',
  request: {
    params: z.object({
      id: z.string().describe('Scan ID'),
    }),
  },
  responses: {
    200: {
      description: 'Scan detail',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.any().describe('Full scan object'),
          }),
        },
      },
    },
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to fetch scan'),
  },
})

// DELETE /scans/:id
scansRegistry.registerPath({
  method: 'delete',
  path: '/scans/{id}',
  tags: ['Scans'],
  summary: 'Delete a scan',
  request: {
    params: z.object({
      id: z.string().describe('Scan ID'),
    }),
  },
  responses: {
    200: {
      description: 'Scan deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ deleted: z.literal(true) }),
          }),
        },
      },
    },
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to delete scan'),
  },
})

// POST /scans/:id/reanalyze
scansRegistry.registerPath({
  method: 'post',
  path: '/scans/{id}/reanalyze',
  tags: ['Scans'],
  summary: 'Re-analyze an existing scan',
  description: 'Re-runs the parser and analyzer on existing OCR text. Useful after parser/analyzer updates.',
  request: {
    params: z.object({
      id: z.string().describe('Scan ID'),
    }),
    query: z.object({
      profile: z.enum(['early', 'mid', 'late']).optional().describe('Player profile for re-analysis'),
    }),
  },
  responses: {
    200: {
      description: 'Re-analysis complete',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.any().describe('Updated scan object'),
          }),
        },
      },
    },
    400: errorResponse('Scan has no raw text to re-analyze'),
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to re-analyze scan'),
  },
})

// POST /scans/:id/feedback
scansRegistry.registerPath({
  method: 'post',
  path: '/scans/{id}/feedback',
  tags: ['Scans'],
  summary: 'Submit feedback on a scan',
  description: 'Rate whether the scan analysis was correct.',
  request: {
    params: z.object({
      id: z.string().describe('Scan ID'),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            opinion: z.enum(['agree', 'disagree']).describe('Was the analysis correct?'),
            comment: z.string().optional().describe('Optional comment'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Feedback saved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.any().describe('Updated scan object'),
          }),
        },
      },
    },
    400: errorResponse('opinion must be agree or disagree'),
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to submit feedback'),
  },
})

// ---------------------------------------------------------------------------
// Monsters registry
// ---------------------------------------------------------------------------

export const monstersRegistry = new OpenAPIRegistry()

// POST /monsters/import
monstersRegistry.registerPath({
  method: 'post',
  path: '/monsters/import',
  tags: ['Monsters'],
  summary: 'Import monsters from SWARFARM',
  description: 'Triggers a full import of monster data from the SWARFARM API.',
  responses: {
    200: {
      description: 'Import completed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ imported: z.number().describe('Number of monsters imported') }),
          }),
        },
      },
    },
    500: errorResponse('Failed to import monsters'),
  },
})

// GET /monsters
monstersRegistry.registerPath({
  method: 'get',
  path: '/monsters',
  tags: ['Monsters'],
  summary: 'List monsters',
  description: 'Paginated monster list with filtering by element, archetype, stars, etc.',
  request: {
    query: z.object({
      element: z.enum(['fire', 'water', 'wind', 'light', 'dark']).optional().describe('Filter by element'),
      archetype: z.enum(['attack', 'defense', 'support', 'hp']).optional().describe('Filter by archetype'),
      buildArchetype: z.string().optional().describe('Filter by build archetype'),
      stars: z.string().optional().describe('Filter by natural stars (2-5)'),
      search: z.string().optional().describe('Search by name'),
      page: z.string().optional().describe('Page number (default: 1)'),
      limit: z.string().optional().describe('Results per page (default: 50, max: 100)'),
    }),
  },
  responses: {
    200: {
      description: 'Monster list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              monsters: z.array(z.any()),
              pagination: z.object({
                page: z.number(),
                limit: z.number(),
                total: z.number(),
                totalPages: z.number(),
              }),
            }),
          }),
        },
      },
    },
    400: errorResponse('Invalid query parameters'),
    500: errorResponse('Failed to list monsters'),
  },
})

// GET /monsters/by-build/:archetype
monstersRegistry.registerPath({
  method: 'get',
  path: '/monsters/by-build/{archetype}',
  tags: ['Monsters'],
  summary: 'Monsters by build archetype',
  description: 'Returns all monsters matching a specific build archetype (e.g., speed-dps, cleave).',
  request: {
    params: z.object({
      archetype: z.string().describe('Build archetype name'),
    }),
  },
  responses: {
    200: {
      description: 'Matching monsters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              archetype: z.string(),
              count: z.number(),
              monsters: z.array(z.any()),
            }),
          }),
        },
      },
    },
    500: errorResponse('Failed to fetch monsters by build'),
  },
})

// GET /monsters/for-rune
monstersRegistry.registerPath({
  method: 'get',
  path: '/monsters/for-rune',
  tags: ['Monsters'],
  summary: 'Monsters matching rune archetypes',
  description: 'Returns top monsters that match given rune archetypes. Prioritizes nat4+, obtainable monsters.',
  request: {
    query: z.object({
      archetypes: z.string().describe('Comma-separated list of rune archetypes'),
    }),
  },
  responses: {
    200: {
      description: 'Matching monsters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              archetypes: z.array(z.string()),
              count: z.number(),
              monsters: z.array(z.any()),
            }),
          }),
        },
      },
    },
    400: errorResponse('Query parameter "archetypes" is required'),
    500: errorResponse('Failed to fetch monsters for rune'),
  },
})

// ---------------------------------------------------------------------------
// Config registry
// ---------------------------------------------------------------------------

export const configRegistry = new OpenAPIRegistry()

// GET /config/:gameType
configRegistry.registerPath({
  method: 'get',
  path: '/config/{gameType}',
  tags: ['Config'],
  summary: 'List game configs',
  description: 'Returns all layout configurations for a game type.',
  request: {
    params: z.object({
      gameType: z.enum(['summoners-war', 'nikke']).describe('Game type'),
    }),
  },
  responses: {
    200: {
      description: 'Config list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(z.any()).describe('Array of config objects'),
          }),
        },
      },
    },
    500: errorResponse('Failed to fetch game configs'),
  },
})

// GET /config/:gameType/:layoutName
configRegistry.registerPath({
  method: 'get',
  path: '/config/{gameType}/{layoutName}',
  tags: ['Config'],
  summary: 'Get a specific layout config',
  request: {
    params: z.object({
      gameType: z.enum(['summoners-war', 'nikke']).describe('Game type'),
      layoutName: z.string().describe('Layout name'),
    }),
  },
  responses: {
    200: {
      description: 'Config detail (data is null if not found)',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.any().nullable(),
          }),
        },
      },
    },
    500: errorResponse('Failed to fetch game config'),
  },
})

// PUT /config/:gameType/:layoutName
configRegistry.registerPath({
  method: 'put',
  path: '/config/{gameType}/{layoutName}',
  tags: ['Config'],
  summary: 'Save or update a layout config',
  description: 'Creates or updates an OCR layout configuration (zones, masks, ROI, presets).',
  request: {
    params: z.object({
      gameType: z.enum(['summoners-war', 'nikke']).describe('Game type'),
      layoutName: z.string().describe('Layout name'),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            displayName: z.string().optional().describe('Human-readable name'),
            bestPresets: z.array(z.string()).optional().describe('Best OCR presets for this layout'),
            zones: z.any().optional().describe('Zone definitions'),
            masks: z.any().optional().describe('Mask definitions'),
            roi: z.any().optional().describe('Region of interest'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Config saved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.any().describe('Updated config object'),
          }),
        },
      },
    },
    400: errorResponse('gameType and layoutName are required'),
    500: errorResponse('Failed to save game config'),
  },
})

// DELETE /config/:gameType/:layoutName
configRegistry.registerPath({
  method: 'delete',
  path: '/config/{gameType}/{layoutName}',
  tags: ['Config'],
  summary: 'Delete a layout config',
  request: {
    params: z.object({
      gameType: z.enum(['summoners-war', 'nikke']).describe('Game type'),
      layoutName: z.string().describe('Layout name'),
    }),
  },
  responses: {
    200: {
      description: 'Config deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ deleted: z.literal(true) }),
          }),
        },
      },
    },
    404: errorResponse('Layout not found'),
    500: errorResponse('Failed to delete layout'),
  },
})

// ---------------------------------------------------------------------------
// Bench registry
// ---------------------------------------------------------------------------

export const benchRegistry = new OpenAPIRegistry()

// POST /bench
benchRegistry.registerPath({
  method: 'post',
  path: '/bench',
  tags: ['Bench'],
  summary: 'OCR benchmark',
  description: 'Runs all OCR presets in parallel on an uploaded image and returns comparison results.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().describe('Rune screenshot to benchmark'),
            gameType: z.enum(['summoners-war', 'nikke']).optional().describe('Game type (default: summoners-war)'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Benchmark results',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            benchId: z.string(),
            results: z.array(z.object({
              preset: z.string(),
              confidence: z.number(),
              substats: z.number(),
              success: z.boolean(),
              processingTimeMs: z.number(),
            })),
            bestPreset: z.string().nullable(),
            image: z.object({
              width: z.number(),
              height: z.number(),
            }),
          }),
        },
      },
    },
    400: errorResponse('Missing image or invalid request body'),
    500: errorResponse('Bench failed'),
  },
})
