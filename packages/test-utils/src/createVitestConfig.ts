/**
 * 🔒 CRITICAL: Centralized Vitest configuration factory
 *
 * This factory ensures ALL tests are isolated from production MongoDB.
 * NEVER run tests without using this config!
 *
 * @example
 * ```typescript
 * // apps/[api]/vitest.config.ts
 * import { createVitestConfig } from '@ezstart/test-utils'
 *
 * export default createVitestConfig({
 *   dbName: 'ezauth', // Database name for test isolation
 * })
 * ```
 */

import { defineConfig, type UserConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

export interface VitestConfigOptions {
  /**
   * Database name for test isolation (e.g., 'ezauth', 'ezbilling')
   * Used to create localhost fallback if MongoMemoryServer fails
   */
  dbName: string

  /**
   * Additional Vitest config options to merge
   */
  extend?: UserConfig['test']
}

/**
 * Creates a secure Vitest configuration that:
 * 1. Forces NODE_ENV=test
 * 2. Uses localhost MongoDB as fallback (never production)
 * 3. Loads .env.test if it exists
 * 4. Prevents accidental production data deletion
 */
export function createVitestConfig(options: VitestConfigOptions) {
  const { dbName, extend = {} } = options

  // 🔒 CRITICAL: Try to load .env.test if it exists (optional)
  // This provides an extra safety layer
  try {
    const envTestPath = resolve(process.cwd(), '.env.test')
    config({ path: envTestPath })
  } catch {
    // .env.test is optional, fallback to environment variables
  }

  return defineConfig({
    test: {
      globals: true,
      environment: 'node',

      // 🔒 CRITICAL: Force test environment variables
      env: {
        NODE_ENV: 'test',
        // Fallback MongoDB URL if MongoMemoryServer fails
        // Uses localhost NEVER production!
        MONGO_URL: `mongodb://localhost:27017/${dbName}-test`,
        // Pin MongoMemoryServer binary version to use locally cached binary
        // Prevents MMS from downloading a newer version on every test run
        MONGOMS_VERSION: '7.0.14',
      },

      // Default timeouts for MongoDB operations
      testTimeout: 30000, // 30 seconds
      hookTimeout: 60000, // 60 seconds for setup/teardown

      // Merge with custom options
      ...extend,
    },
  })
}
