import mongoose from 'mongoose';

export async function connectToMongo(dbName: string) {
  const MONGO_URL =
    process.env.MONGO_URL || `mongodb://localhost:27017/${dbName}`;

  console.log(`🔌 [MongoDB] Connecting to database: ${dbName}`);
  console.log(`🔌 [MongoDB] MONGO_URL exists: ${!!process.env.MONGO_URL}`);

  try {
    await mongoose.connect(MONGO_URL);
    console.log(`✅ Connected to MongoDB → ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`❌ [MongoDB] Failed to connect with MONGO_URL:`, err instanceof Error ? err.message : err);
    console.log(`🔌 [MongoDB] Trying fallback: localhost:27017/${dbName}`);

    try {
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
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
