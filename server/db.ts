import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

/**
 * ⚠️ CRITICAL DATABASE CONFIGURATION ⚠️
 * 
 * This is the EXCLUSIVE database connection string for this project.
 * 
 * Database: postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8
 * 
 * IMPORTANT RULES:
 * - This is the ONLY database to be used for this project
 * - NO environment variables should be used
 * - NO local databases
 * - NO alternatives
 * - This connection string is hardcoded intentionally for consistency
 * 
 * DO NOT CHANGE THIS CONNECTION STRING WITHOUT EXPLICIT APPROVAL
 */
const EXTERNAL_DATABASE_URL = "postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8";

console.log('🚨 USING EXCLUSIVE DATABASE:', EXTERNAL_DATABASE_URL);

export const pool = new Pool({ 
  connectionString: EXTERNAL_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });