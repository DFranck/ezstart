/**
 * Abstract database connector contract.
 *
 * The core has zero knowledge of MongoDB, Postgres, Redis, etc. Consumers
 * that need a database inject an implementation that conforms to this shape.
 * `createBaseApiServer` will `await connector.connect()` on boot when provided
 * and close it on graceful shutdown via `connector.disconnect()`.
 *
 * @example
 * ```ts
 * import type { DbConnector } from '@ezstart/api-core'
 *
 * const myConnector: DbConnector<{ users: typeof UserModel }> = {
 *   async connect() { /* ... *\/ },
 *   async disconnect() { /* ... *\/ },
 *   get isConnected() { return true },
 *   get models() { return { users: UserModel } },
 * }
 * ```
 */
export interface DbConnector<TModels = unknown> {
  connect(): Promise<void>
  disconnect(): Promise<void>
  readonly models: TModels
  readonly isConnected: boolean
}
