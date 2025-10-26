import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// 🔒 CRITICAL: Load .env.test to prevent tests from touching production MongoDB
config({ path: resolve(__dirname, '.env.test') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    hookTimeout: 60000,
    testTimeout: 10000,
    pool: 'forks', // Use forks instead of threads
    poolOptions: {
      forks: {
        singleFork: true, // Run tests in a single fork
      },
    },
    // 🔒 Force NODE_ENV=test to ensure no production connections
    env: {
      NODE_ENV: 'test',
    },
  },
})
