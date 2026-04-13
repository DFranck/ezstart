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
  appToPrefix,
  KNOWN_APP_PREFIXES,
  type LoadEnvOptions,
  type KnownAppPrefix,
} from './secrets-loader.js'
