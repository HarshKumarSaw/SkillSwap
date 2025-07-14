import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Force use of the external database URL exclusively - ignore environment variables
const EXTERNAL_DATABASE_URL = "postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8";

console.log('USING EXTERNAL DATABASE:', EXTERNAL_DATABASE_URL);

export const pool = new Pool({ 
  connectionString: EXTERNAL_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });