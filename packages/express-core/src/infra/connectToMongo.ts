import mongoose from 'mongoose';

/**
 * Flag to track if connection is being established
 * Prevents multiple simultaneous connection attempts
 */
let isConnecting = false;

/**
 * Unified MongoDB connection function for the entire monorepo.
 *
 * Features:
 * - Singleton pattern (shared connection instance)
 * - Auto-detects Atlas vs localhost
 * - Fallback to localhost if MONGO_URL missing
 * - Connection pooling and timeouts
 * - Automatic ping test
 * - Unified logs across all APIs
 *
 * @param dbName - Database name (used for localhost fallback and logs)
 * @returns Promise<Mongoose> - The shared mongoose instance
 */
export async function connectToMongo(dbName: string): Promise<typeof mongoose> {
  // Already connected - return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Connection in progress - wait for it to complete
  if (isConnecting) {
    await mongoose.connection.asPromise();
    return mongoose;
  }

  isConnecting = true;

  const MONGO_URL = process.env.MONGO_URL || `mongodb://localhost:27017/${dbName}`;

  // Detect connection source
  const connectionSource = process.env.MONGO_URL
    ? (MONGO_URL.includes('mongodb.net') || MONGO_URL.includes('cloud.mongodb.com') ? 'Atlas' : 'custom')
    : 'localhost';

  console.log(`🔌 [MongoDB] Connecting to database: ${dbName} (${connectionSource})`);

  // Disable buffering for fail-fast behavior
  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 30000); // 30s instead of 10s

  // MongoDB connection options to prevent buffering timeout
  const options = {
    serverSelectionTimeoutMS: 30000, // 30s timeout for initial connection
    socketTimeoutMS: 45000, // 45s timeout for socket operations
    maxPoolSize: 10, // Max connection pool size
    minPoolSize: 2, // Min connection pool size
    connectTimeoutMS: 30000, // 30s timeout for connection establishment
  };

  try {
    await mongoose.connect(MONGO_URL, options);

    // Test the connection with a ping
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log(`✅ [MongoDB] Connected to '${mongoose.connection.name}' (read/write ready)`);
    } else {
      console.log(`✅ [MongoDB] Connected to '${mongoose.connection.name}'`);
    }

    isConnecting = false;
    return mongoose;
  } catch (err) {
    console.error(`❌ [MongoDB] Failed to connect:`, err instanceof Error ? err.message : err);

    // Fallback to localhost only if MONGO_URL was provided (avoid double localhost attempt)
    if (process.env.MONGO_URL) {
      console.log(`🔌 [MongoDB] Trying fallback: localhost:27017/${dbName}`);

      try {
        await mongoose.connect(`mongodb://localhost:27017/${dbName}`, options);

        if (mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
          console.log(`✅ [MongoDB] Connected to '${mongoose.connection.name}' (read/write ready)`);
        }

        isConnecting = false;
        return mongoose;
      } catch (fallbackErr) {
        console.error('❌ [MongoDB] Fallback connection also failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }

    console.error('💥 [MongoDB] Cannot start API without database connection');
    isConnecting = false;
    process.exit(1);
  }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use connectToMongo() instead
 */
export async function getMongo(): Promise<typeof mongoose> {
  console.warn('⚠️ [Deprecated] getMongo() is deprecated, use connectToMongo("dbname") instead');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL environment variable is required when using getMongo()');
  }

  // Extract DB name from MONGO_URL or use 'default'
  const dbName = process.env.MONGO_URL.split('/').pop()?.split('?')[0] || 'default';
  return connectToMongo(dbName);
}
