import { neon } from '@neondatabase/serverless';

// Singleton or factory for the DB client
export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database operations will be skipped or mocked.");
    return null;
  }
  return neon(process.env.DATABASE_URL);
};
