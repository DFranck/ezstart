import mongoose from 'mongoose'

/**
 * Seed a collection with test data
 * Generic helper for seeding any MongoDB collection
 */
export async function seedCollection<T extends Record<string, unknown>>(
  collectionName: string,
  data: T[]
): Promise<void> {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection not ready')
  }

  const collection = mongoose.connection.db?.collection(collectionName)

  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`)
  }

  if (data.length > 0) {
    // Cast needed: MongoDB's insertMany expects OptionalUnlessRequiredId which can't be expressed generically
    await collection.insertMany(data as any[])
  }
}

/**
 * Count documents in a collection
 * Useful for assertions
 */
export async function countDocuments(collectionName: string): Promise<number> {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection not ready')
  }

  const collection = mongoose.connection.db?.collection(collectionName)

  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`)
  }

  return collection.countDocuments()
}
