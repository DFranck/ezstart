import { createVitestConfig } from '@ezstart/test-utils'

// 🔒 CRITICAL: Centralized test protection
// Prevents tests from EVER touching production MongoDB
export default createVitestConfig({
  dbName: 'ezstart-monitoring',
  extend: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
