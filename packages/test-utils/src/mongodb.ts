import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongoServer: MongoMemoryServer | null = null

/**
 * Setup MongoDB Memory Server for testing
 * Creates an in-memory MongoDB instance for isolated tests
 */
export async function setupTestDatabase(): Promise<string> {
  if (mongoServer) {
    throw new Error('Test database already running. Call teardownTestDatabase() first.')
  }

  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
    },
  })
  const uri = mongoServer.getUri()

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false,
  })

  return uri
}

/**
 * Teardown MongoDB Memory Server
 * Closes connection and stops the server
 */
export async function teardownTestDatabase(): Promise<void> {
  if (!mongoServer) {
    return
  }

  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongoServer.stop()

  mongoServer = null
}

/**
 * Clean all collections in the test database
 * Useful for beforeEach() in tests
 */
export async function cleanDatabase(): Promise<void> {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection not ready')
  }

  const collections = await mongoose.connection.db?.collections()

  if (collections) {
    await Promise.all(collections.map(collection => collection.deleteMany({})))
  }
}

/**
 * Get current MongoDB test URI
 */
export function getTestDatabaseUri(): string {
  if (!mongoServer) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }

  return mongoServer.getUri()
}
