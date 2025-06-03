import mongoose from 'mongoose';

export async function connectToDb() {
  const MONGO_URL =
    process.env.MONGO_URL || 'mongodb://localhost:27017/ezbilling';
  try {
    await mongoose.connect(MONGO_URL);

    console.log('✅ Connected to MongoDB:', {
      db: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1);
  }
}
