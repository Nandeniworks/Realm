import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realm';
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB connection unavailable (${error.message}). Running with in-memory fallback store.`);
    mongoose.set('bufferCommands', false);
  }
};
