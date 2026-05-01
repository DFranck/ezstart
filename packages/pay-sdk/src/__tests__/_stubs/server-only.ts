/**
 * Test stub for the Next.js `server-only` package. The real package throws
 * at import time when called from a non-RSC context (Vitest, jest, etc.) —
 * this no-op stub lets test files import server-side modules without
 * mocking `server-only` in every suite.
 *
 * Wired in `vitest.config.ts` via `resolve.alias['server-only']`.
 */
export {}
