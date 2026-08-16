/**
 * OpenAPI registries for Gacha Analyzer API
 *
 * Centralizes all route documentation in one place.
 * Each registry is passed to startServer() for /docs generation.
 */

import { OpenAPIRegistry } from '@ezstart/api-core'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false).describe('Always false for error responses'),
        error: z.string().describe('Human-readable error message'),
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
  description:
    'Upload a rune screenshot with OCR analysis. Supports main image, alt image, full image, and individual zone crops.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().describe('Main rune screenshot (required)'),
            gameType: z.enum(['summoners-war', 'nikke']).describe('Target game'),
            profile: z
              .enum(['early', 'mid', 'late'])
              .optional()
              .describe('Player progression profile (default: mid)'),
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
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                id: z.string().describe('Scan ID'),
                gameType: z.string().describe('Game identifier (e.g. summoners-war, nikke)'),
                status: z.enum(['completed', 'failed']).describe('Final scan status'),
                result: z.any().describe('OCR + analysis result'),
              })
              .describe('Scan response payload'),
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
  description:
    'Returns paginated scan history, most recent first. Supports filtering by game type and status.',
  request: {
    query: z.object({
      gameType: z
        .enum(['summoners-war', 'nikke'])
        .optional()
        .openapi({ description: 'Filter by game' }),
      status: z
        .enum(['completed', 'failed'])
        .optional()
        .openapi({ description: 'Filter by scan status' }),
      limit: z.string().optional().openapi({ description: 'Max results (default: 50)' }),
      offset: z.string().optional().openapi({ description: 'Skip N results (default: 0)' }),
    }),
  },
  responses: {
    200: {
      description: 'Scan list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z.array(z.any()).describe('Array of scan objects'),
            meta: z
              .object({
                total: z.number().describe('Total number of scans matching the filter'),
                limit: z.number().describe('Page size'),
                offset: z.number().describe('Pagination offset'),
              })
              .describe('Pagination metadata'),
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
      id: z.string().openapi({ description: 'Scan ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Scan detail',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
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
      id: z.string().openapi({ description: 'Scan ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Scan deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                deleted: z.literal(true).describe('Always true when the resource was deleted'),
              })
              .describe('Deletion confirmation payload'),
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
  description:
    'Re-runs the parser and analyzer on existing OCR text. Useful after parser/analyzer updates.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Scan ID' }),
    }),
    query: z.object({
      profile: z
        .enum(['early', 'mid', 'late'])
        .optional()
        .openapi({ description: 'Player profile for re-analysis' }),
    }),
  },
  responses: {
    200: {
      description: 'Re-analysis complete',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
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
      id: z.string().openapi({ description: 'Scan ID' }),
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
            success: z.literal(true).describe('Always true for success responses'),
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

// POST /scans/:id/report
scansRegistry.registerPath({
  method: 'post',
  path: '/scans/{id}/report',
  tags: ['Scans'],
  summary: 'Report a problem on a scan',
  description: 'Creates a new bug report on a scan. A scan can have multiple reports.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Scan ID' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            category: z
              .enum(['wrong-ocr', 'wrong-advice', 'wrong-gem', 'wrong-efficiency', 'other'])
              .describe('Report category'),
            description: z.string().describe('Problem description'),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Report created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z.any().describe('Updated scan object'),
          }),
        },
      },
    },
    400: errorResponse('Invalid category or missing description'),
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to create report'),
  },
})

// PATCH /scans/:id/report/:reportIndex
scansRegistry.registerPath({
  method: 'patch',
  path: '/scans/{id}/report/{reportIndex}',
  tags: ['Scans'],
  summary: 'Update a report status',
  description:
    'Update report status (open, in-progress, resolved). Resolution comment required when resolving.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Scan ID' }),
      reportIndex: z.string().openapi({ description: 'Report index in the reports array' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(['open', 'in-progress', 'resolved']).describe('New status'),
            resolution: z
              .string()
              .optional()
              .describe('Resolution comment (required when status is resolved)'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Report updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z.any().describe('Updated scan object'),
          }),
        },
      },
    },
    400: errorResponse('Invalid status or missing resolution'),
    404: errorResponse('Scan not found'),
    500: errorResponse('Failed to update report'),
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
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({ imported: z.number().describe('Number of monsters imported') })
              .describe('Import result payload'),
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
      element: z
        .enum(['fire', 'water', 'wind', 'light', 'dark'])
        .optional()
        .openapi({ description: 'Filter by element' }),
      archetype: z
        .enum(['attack', 'defense', 'support', 'hp'])
        .optional()
        .openapi({ description: 'Filter by archetype' }),
      buildArchetype: z.string().optional().openapi({ description: 'Filter by build archetype' }),
      stars: z.string().optional().openapi({ description: 'Filter by natural stars (2-5)' }),
      search: z.string().optional().openapi({ description: 'Search by name' }),
      page: z.string().optional().openapi({ description: 'Page number (default: 1)' }),
      limit: z
        .string()
        .optional()
        .openapi({ description: 'Results per page (default: 50, max: 100)' }),
    }),
  },
  responses: {
    200: {
      description: 'Monster list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                monsters: z.array(z.any()).describe('Array of monster objects'),
                pagination: z
                  .object({
                    page: z.number().describe('Current page number (1-based)'),
                    limit: z.number().describe('Page size'),
                    total: z.number().describe('Total number of monsters matching the filter'),
                    totalPages: z.number().describe('Total number of pages'),
                  })
                  .describe('Pagination metadata'),
              })
              .describe('Paginated monsters response payload'),
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
  description:
    'Returns all monsters matching a specific build archetype (e.g., speed-dps, cleave).',
  request: {
    params: z.object({
      archetype: z.string().openapi({ description: 'Build archetype name' }),
    }),
  },
  responses: {
    200: {
      description: 'Matching monsters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                archetype: z.string().describe('Build archetype that was queried'),
                count: z.number().describe('Number of monsters returned'),
                monsters: z.array(z.any()).describe('Array of monsters matching the archetype'),
              })
              .describe('Monsters-by-build response payload'),
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
  description:
    'Returns top monsters that match given rune archetypes. Prioritizes nat4+, obtainable monsters.',
  request: {
    query: z.object({
      archetypes: z.string().openapi({ description: 'Comma-separated list of rune archetypes' }),
    }),
  },
  responses: {
    200: {
      description: 'Matching monsters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                archetypes: z.array(z.string()).describe('Rune archetypes that were queried'),
                count: z.number().describe('Number of monsters returned'),
                monsters: z.array(z.any()).describe('Top monsters matching the given archetypes'),
              })
              .describe('Monsters-for-rune response payload'),
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
      gameType: z.enum(['summoners-war', 'nikke']).openapi({ description: 'Game type' }),
    }),
  },
  responses: {
    200: {
      description: 'Config list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
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
      gameType: z.enum(['summoners-war', 'nikke']).openapi({ description: 'Game type' }),
      layoutName: z.string().openapi({ description: 'Layout name' }),
    }),
  },
  responses: {
    200: {
      description: 'Config detail (data is null if not found)',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .any()
              .nullable()
              .describe('Config object (null when the layout does not exist)'),
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
      gameType: z.enum(['summoners-war', 'nikke']).openapi({ description: 'Game type' }),
      layoutName: z.string().openapi({ description: 'Layout name' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            displayName: z.string().optional().describe('Human-readable name'),
            bestPresets: z
              .array(z.string())
              .optional()
              .describe('Best OCR presets for this layout'),
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
            success: z.literal(true).describe('Always true for success responses'),
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
      gameType: z.enum(['summoners-war', 'nikke']).openapi({ description: 'Game type' }),
      layoutName: z.string().openapi({ description: 'Layout name' }),
    }),
  },
  responses: {
    200: {
      description: 'Config deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true).describe('Always true for success responses'),
            data: z
              .object({
                deleted: z.literal(true).describe('Always true when the resource was deleted'),
              })
              .describe('Deletion confirmation payload'),
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
  description:
    'Runs all OCR presets in parallel on an uploaded image and returns comparison results.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().describe('Rune screenshot to benchmark'),
            gameType: z
              .enum(['summoners-war', 'nikke'])
              .optional()
              .describe('Game type (default: summoners-war)'),
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
            success: z.literal(true).describe('Always true for success responses'),
            benchId: z.string().describe('Unique identifier for this benchmark run'),
            results: z
              .array(
                z.object({
                  preset: z.string().describe('OCR preset name'),
                  confidence: z.number().describe('OCR confidence percentage (0-100)'),
                  substats: z.number().describe('Number of substats successfully parsed'),
                  success: z.boolean().describe('Whether the parser succeeded on this preset'),
                  processingTimeMs: z.number().describe('Preprocess + OCR + parse duration in ms'),
                })
              )
              .describe('Per-preset benchmark results'),
            bestPreset: z
              .string()
              .nullable()
              .describe('Name of the best-performing preset (null when no results)'),
            image: z
              .object({
                width: z.number().describe('Input image width in pixels'),
                height: z.number().describe('Input image height in pixels'),
              })
              .describe('Input image metadata'),
          }),
        },
      },
    },
    400: errorResponse('Missing image or invalid request body'),
    500: errorResponse('Bench failed'),
  },
})
