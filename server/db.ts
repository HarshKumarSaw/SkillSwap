import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the external database URL provided by the user
const DATABASE_URL = "postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8";

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });