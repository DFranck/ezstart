import { noInlinePaginationSchema } from '../rules/no-inline-pagination-schema.js'
import { ruleTester } from './rule-tester.js'

const SRC_FILE = '/repo/apps/myapp/api/src/routes/list.ts'
const TEST_FILE = '/repo/apps/myapp/api/src/__tests__/list.test.ts'
const CONTRACTS_FILE = '/repo/packages/api-contracts/src/pagination.ts'

ruleTester.run('no-inline-pagination-schema', noInlinePaginationSchema, {
  valid: [
    // Importing the canonical schema — the correct pattern.
    {
      filename: SRC_FILE,
      code: `
        import { PaginationQuerySchema } from '@ezstart/api-contracts'
        import { z } from 'zod'
        const schema = PaginationQuerySchema.extend({
          status: z.enum(['active', 'inactive']).optional(),
        })
      `,
    },
    // Canonical schema file itself — exempt.
    {
      filename: CONTRACTS_FILE,
      code: `
        import { z } from 'zod'
        export const PaginationQuerySchema = z.object({
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).default(0),
        })
      `,
    },
    // Test files — exempt (document vulnerable patterns).
    {
      filename: TEST_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce.number().min(1).max(100).default(20),
        })
      `,
    },
    // Non-pagination Zod fields — should NOT trigger.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          hours: z.coerce.number().min(1).max(168).default(24),
          stars: z.coerce.number().min(2).max(5).optional(),
        })
      `,
    },
    // Pagination field but value is not a z.coerce.number chain — passthrough.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.number().int(),
          offset: z.string(),
        })
      `,
    },
    // Page-based pagination (1-based) — exempt (different pattern).
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        })
      `,
    },
  ],
  invalid: [
    // Single-line inline limit schema.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce.number().min(1).max(100).default(20),
        })
      `,
      errors: [{ messageId: 'inlinePagination', data: { field: 'limit' } }],
    },
    // Single-line inline offset schema.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          offset: z.coerce.number().min(0).default(0),
        })
      `,
      errors: [{ messageId: 'inlinePagination', data: { field: 'offset' } }],
    },
    // Both limit and offset.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).default(0),
        })
      `,
      errors: [
        { messageId: 'inlinePagination', data: { field: 'limit' } },
        { messageId: 'inlinePagination', data: { field: 'offset' } },
      ],
    },
    // Multi-line chain.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .openapi({ description: 'Items per page' }),
        })
      `,
      errors: [{ messageId: 'inlinePagination', data: { field: 'limit' } }],
    },
    // No max() — even worse (DoS surface). Still detected.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce.number().default(50),
        })
      `,
      errors: [{ messageId: 'inlinePagination', data: { field: 'limit' } }],
    },
    // Optional pagination too.
    {
      filename: SRC_FILE,
      code: `
        import { z } from 'zod'
        const schema = z.object({
          limit: z.coerce.number().int().positive().max(100).optional(),
        })
      `,
      errors: [{ messageId: 'inlinePagination', data: { field: 'limit' } }],
    },
  ],
})
