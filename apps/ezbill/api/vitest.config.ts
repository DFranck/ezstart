import { createVitestConfig } from '@ezstart/test-utils'

// 🔒 CRITICAL: Centralized test protection
// Prevents tests from EVER touching production MongoDB
export default createVitestConfig({
  dbName: 'ezbilling',
  extend: {
    include: ['src/__tests__/**/*.test.ts'],
    hookTimeout: 60000,
    testTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
