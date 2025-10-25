import { defineConfig } from 'vitest/config'

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
  },
})
