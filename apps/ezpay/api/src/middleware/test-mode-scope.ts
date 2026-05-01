/**
 * Re-export of the agnostic `testModeScopePlugin` from `@ezstart/api-core`.
 *
 * The plugin body lived here historically as a duplicated copy of the
 * EZAuth twin. Both copies were byte-identical (modulo docstrings) and pure
 * plumbing — they have been promoted to `@ezstart/api-core` (which already
 * owns `getRequestContext` and the rest of the test/live partition stack).
 *
 * This shim is kept in place so existing imports (`../middleware/test-mode-
 * scope.js` from each model factory) keep working without a sweeping
 * refactor. New code SHOULD import directly from `@ezstart/api-core`.
 *
 * @module apps/ezpay/api/src/middleware/test-mode-scope
 */

export { testModeScopePlugin, type TestModeScopeOptions } from '@ezstart/api-core'
