import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// 🔒 CRITICAL: Load .env.test to prevent tests from touching production MongoDB
config({ path: resolve(__dirname, '.env.test') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for tests with database operations
    hookTimeout: 30000, // 30 seconds for setup/teardown
    // 🔒 Force NODE_ENV=test to ensure no production connections
    env: {
      NODE_ENV: 'test',
    },
  },
})
