import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  try {
    console.log(
      "🔗 Connecting to MongoDB:",
      process.env.MONGODB_URI ? "URI Present" : "Missing"
    );
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
      cached.promise = mongoose
        .connect(MONGODB_URI, {
          bufferCommands: false,
        })
        .then((mongoose) => mongoose);
    }
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
}
