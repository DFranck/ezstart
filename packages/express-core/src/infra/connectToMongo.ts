import mongoose from 'mongoose';

export async function connectToMongo(dbName: string) {
  const MONGO_URL =
    process.env.MONGO_URL || `mongodb://localhost:27017/${dbName}`;

  console.log(`🔌 [MongoDB] Connecting to database: ${dbName}`);
  console.log(`🔌 [MongoDB] MONGO_URL exists: ${!!process.env.MONGO_URL}`);

  // Increase Mongoose buffer timeout (default 10s is too short for MongoDB Atlas free tier)
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
    console.log(`✅ Connected to MongoDB → ${mongoose.connection.name}`);

    // Test the connection with a ping
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log(`✅ [MongoDB] Connection verified with ping`);
    }
  } catch (err) {
    console.error(`❌ [MongoDB] Failed to connect with MONGO_URL:`, err instanceof Error ? err.message : err);
    console.log(`🔌 [MongoDB] Trying fallback: localhost:27017/${dbName}`);

    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`, options);
      console.log(
        `✅ Connected to MongoDB → mongodb://localhost:27017/${dbName}`
      );
    } catch (fallbackErr) {
      console.error('❌ [MongoDB] Fallback connection also failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      console.error('💥 [MongoDB] Cannot start API without database connection');
      process.exit(1);
    }
  }
}
