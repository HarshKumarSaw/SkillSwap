import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

/**
 * ⚠️ CRITICAL DATABASE CONFIGURATION ⚠️
 * 
 * This uses the EXCLUSIVE database connection string for this project.
 * 
 * IMPORTANT RULES:
 * - This is the ONLY database to be used for this project
 * - Uses DATABASE_URL environment variable containing the exclusive connection string
 * - NO local databases
 * - NO alternatives
 * - DO NOT CHANGE DATABASE CONNECTION WITHOUT EXPLICIT APPROVAL
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

console.log('🚨 USING EXCLUSIVE DATABASE:', process.env.DATABASE_URL);

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection timeout 5s
});
export const db = drizzle(pool, { schema });