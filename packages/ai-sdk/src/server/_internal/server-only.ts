/**
 * Safe server-only guard for @ezstart/ai-sdk/server.
 *
 * Replaces the bare `import 'server-only'` pattern. The `server-only` npm
 * package's default export THROWS at module load when imported outside
 * Next.js' `react-server` condition, which crashes raw-Node API services
 * (Express via `node dist/index.js`) at boot.
 *
 * Detection strategy:
 *   - **Node / Next.js Server Components / Vitest** → `process.versions.node`
 *     is defined → no-op (safe).
 *   - **Real browser bundle** (webpack/turbopack) → `process` is either
 *     undefined or stripped, so the guard throws to prevent provider
 *     API-key leaks. Also covers React Native and other JS hosts that
 *     lack a Node process object.
 *
 * Note: a bare `typeof window !== 'undefined'` check would false-positive
 * inside `jsdom` (the Vitest DOM environment used by SDK tests), so we
 * gate on the Node process instead.
 *
 * Files in `packages/ai-sdk/src/server/` import this module via a
 * relative path (e.g. `./` or `../_internal/server-only.js`) — never the
 * bare `'server-only'` package, which is no longer a dependency.
 *
 * @internal
 */
const isNode =
  typeof process !== 'undefined' &&
  process.versions != null &&
  typeof process.versions.node === 'string'

if (!isNode) {
  throw new Error(
    '@ezstart/ai-sdk/server cannot be imported from a Client Component or browser bundle. ' +
      'Use @ezstart/ai-sdk or @ezstart/ai-sdk/client instead.'
  )
}
export {}
