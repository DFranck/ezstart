/**
 * Server-only entry for `@ezstart/config`.
 *
 * Anything that touches Node built-ins (`fs`, `path`, `process`) at module
 * eval time MUST be exposed here — never from the package root — to keep the
 * client bundle free of `async_hooks` / `fs` resolution errors.
 */

export {
  loadSharedEnv,
  maskedEnv,
  findMonorepoRoot,
  type LoadEnvOptions,
} from './secrets-loader.js'
