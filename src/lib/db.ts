// MongoDB connection singleton — safe to import in any server-side module.
// Uses a module-level cache so Next.js hot-reload / Vercel serverless
// doesn't open a new connection on every invocation.

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI && process.env.NODE_ENV === "production") {
  console.error("[DB] MONGODB_URI env var is not set — database features disabled");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Attach to global so hot-reload doesn't lose the connection in dev
declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
global.__mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return null;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    cache.promise = null;
    console.error("[DB] Connection failed:", err);
    return null;
  }
}
