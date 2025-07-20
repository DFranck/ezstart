import mongoose from 'mongoose';

export async function connectToMongo(dbName: string) {
  const MONGO_URL =
    process.env.MONGO_URL || `mongodb://localhost:27017/${dbName}`;

  try {
    await mongoose.connect(MONGO_URL);
    console.log(`✅ Connected to MongoDB → ${mongoose.connection.name}`);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1);
  }
}
