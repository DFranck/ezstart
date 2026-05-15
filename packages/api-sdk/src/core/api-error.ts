/**
 * Re-export of {@link ApiError} from `@ezstart/api-contracts`.
 *
 * The class moved to api-contracts in v1.1.0 so that both clients
 * (`@ezstart/api-sdk`, `@ezstart/auth-sdk`, `@ezstart/pay-sdk`) and the
 * server framework (`@ezstart/api-core`) can throw and catch the exact same
 * class without creating a backward dependency.
 *
 * This re-export preserves the original import path
 * (`@ezstart/api-sdk/core` → `ApiError`) so existing call sites keep working.
 * It will be kept indefinitely for back-compat; new code should prefer
 * `import { ApiError } from '@ezstart/api-contracts'`.
 *
 * @see {@link https://github.com/DFranck/ezstart/blob/master/packages/api-contracts/src/api-error.ts}
 */
export { ApiError } from '@ezstart/api-contracts'
