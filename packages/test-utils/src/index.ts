// MongoDB setup
export {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
  getTestDatabaseUri,
} from './mongodb.js'

// Vitest configuration (🔒 CRITICAL for test isolation)
export { createVitestConfig, type VitestConfigOptions } from './createVitestConfig.js'

// Factories
export { createTestUser, createTestUsers, type TestUser } from './factories/user.js'

// Helpers
export { seedCollection, countDocuments } from './helpers/seed.js'
