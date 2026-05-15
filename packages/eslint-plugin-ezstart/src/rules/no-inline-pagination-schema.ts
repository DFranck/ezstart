import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Detects inline Zod pagination schemas and forces consumers to import the
 * canonical `PaginationQuerySchema` (or `CursorPaginationQuerySchema`) from
 * `@ezstart/api-contracts` instead.
 *
 * Why it matters: the canonical schema has hardened parsers (rejects hex,
 * scientific notation, booleans, arrays, whitespace-padded strings) and
 * uniform defaults (`limit` default 50, max 100; `offset` default 0, max
 * 10_000) per `standard-saas-data.md` §3. Inline duplicates bypass the
 * hardening — every consumer drift = a new DoS vector.
 *
 * Pattern detected: a Zod object literal where the property `limit` or
 * `offset` (or both) is assigned a chain starting with `z.coerce.number()`.
 * Example violations:
 *
 * - `z.object({ limit: z.coerce.number().min(1).max(100).default(20) })`
 * - `z.object({ offset: z.coerce.number().min(0).default(0) })`
 * - `z.object({ limit: z.coerce.number().int().min(1).max(100) })`
 *
 * Fix: replace the inline schema with
 * `PaginationQuerySchema.extend({ ...other fields })`.
 *
 * Files in `packages/api-contracts/` are exempt (the canonical schema must
 * be defined somewhere). Test files in `__tests__/` directories are also
 * exempt — they intentionally demonstrate vulnerable patterns.
 */
export const noInlinePaginationSchema = createRule({
  name: 'no-inline-pagination-schema',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline pagination Zod schemas; import PaginationQuerySchema from @ezstart/api-contracts instead.',
    },
    schema: [],
    messages: {
      inlinePagination:
        'Inline pagination schema for `{{field}}` detected. Import `PaginationQuerySchema` (or `CursorPaginationQuerySchema`) from `@ezstart/api-contracts` and call `.extend({ ... })` instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename()
    // Exempt the canonical schema definition itself
    if (
      filename.includes('packages/api-contracts/') ||
      filename.includes('packages\\api-contracts\\')
    ) {
      return {}
    }
    // Exempt test files that document vulnerable patterns
    if (filename.includes('__tests__') || filename.match(/\.test\.[cm]?[jt]sx?$/)) {
      return {}
    }

    /**
     * Walk a `MemberExpression`/`CallExpression` chain back to its root
     * identifier. Returns the leftmost object name in the chain, or `null`
     * if the chain does not start with an identifier.
     *
     * Example: for `z.coerce.number().int().min(1).max(100).default(20)`,
     * returns `'z'`.
     */
    function rootIdentifier(node: TSESTree.Node): string | null {
      let current: TSESTree.Node = node
      // Drill down through CallExpression callees and MemberExpression objects
      // until we hit an identifier or something unexpected.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (current) {
        if (current.type === 'CallExpression') {
          current = current.callee
        } else if (current.type === 'MemberExpression') {
          current = current.object
        } else if (current.type === 'Identifier') {
          return current.name
        } else {
          return null
        }
      }
      return null
    }

    /**
     * Check that the chain contains `.coerce.number()` somewhere — i.e. the
     * value is a `z.coerce.number()` chain (potentially wrapped in further
     * `.int().min().max().default().optional().describe()...` calls).
     */
    function chainContainsCoerceNumber(node: TSESTree.Node): boolean {
      let current: TSESTree.Node = node
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (current) {
        if (current.type === 'CallExpression') {
          // Look for `.number()` call where the callee is `<X>.coerce.number`
          if (
            current.callee.type === 'MemberExpression' &&
            !current.callee.computed &&
            current.callee.property.type === 'Identifier' &&
            current.callee.property.name === 'number' &&
            current.callee.object.type === 'MemberExpression' &&
            !current.callee.object.computed &&
            current.callee.object.property.type === 'Identifier' &&
            current.callee.object.property.name === 'coerce'
          ) {
            return true
          }
          current = current.callee
        } else if (current.type === 'MemberExpression') {
          current = current.object
        } else {
          return false
        }
      }
      return false
    }

    function isPaginationField(name: string): boolean {
      return name === 'limit' || name === 'offset'
    }

    /**
     * Determine whether the enclosing `z.object({...})` has a sibling `page`
     * property — that indicates page-based pagination (1-based) which is
     * intentionally different from the canonical `offset`-based schema.
     *
     * Returns `true` when a sibling `page` property exists, signalling we
     * should NOT flag this `limit` field.
     */
    function hasSiblingPageField(propertyNode: TSESTree.Property): boolean {
      const parent = propertyNode.parent
      if (!parent || parent.type !== 'ObjectExpression') return false
      for (const prop of parent.properties) {
        if (prop.type !== 'Property') continue
        if (prop.computed) continue
        const key = prop.key
        let propName: string | null = null
        if (key.type === 'Identifier') {
          propName = key.name
        } else if (key.type === 'Literal' && typeof key.value === 'string') {
          propName = key.value
        }
        if (propName === 'page') return true
      }
      return false
    }

    return {
      Property(node) {
        // Match `<field>: <expression>` in an object literal.
        if (node.computed) return
        const key = node.key
        let fieldName: string | null = null
        if (key.type === 'Identifier') {
          fieldName = key.name
        } else if (key.type === 'Literal' && typeof key.value === 'string') {
          fieldName = key.value
        }
        if (!fieldName || !isPaginationField(fieldName)) return

        // Value must be a chain rooted at an identifier (typically `z`) and
        // somewhere contain `.coerce.number()`.
        const value = node.value
        if (value.type !== 'CallExpression' && value.type !== 'MemberExpression') return

        const root = rootIdentifier(value)
        if (root === null) return
        // We care about chains rooted at `z` — that's the Zod builder.
        if (root !== 'z') return

        if (!chainContainsCoerceNumber(value)) return

        // Skip schemas that use page-based pagination (page+limit) — that's
        // an intentionally different pattern (1-based) from the canonical
        // offset-based schema. Those schemas need a separate canonicalisation.
        if (hasSiblingPageField(node)) return

        context.report({
          node: value,
          messageId: 'inlinePagination',
          data: { field: fieldName },
        })
      },
    }
  },
})
