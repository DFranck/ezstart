/**
 * Test stub for the Next.js `server-only` package. The real package throws
 * at import time when imported from a non-RSC context (Vitest, Jest, plain
 * Node) — this no-op stub lets server-side modules (e.g.
 * `@ezstart/auth-sdk/server` barrel) be imported by API test suites without
 * requiring a `vi.mock('server-only')` call in every test file.
 *
 * Wired in `createVitestConfig` via `resolve.alias['server-only']`.
 */
export {}
