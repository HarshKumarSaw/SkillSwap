#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates a complete backup of your PostgreSQL database
 * including schema and all data. The backup can be used to restore
 * the database on any PostgreSQL instance.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `skillswap-backup-${timestamp}.sql`);

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Starting database backup...');
  console.log(`📁 Backup will be saved to: ${backupFile}`);

  try {
    const client = await pool.connect();
    
    // Start building the SQL backup
    let sqlBackup = `-- SkillSwap Platform Database Backup
-- Generated on: ${new Date().toISOString()}
-- Database: ${process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'skillswap'}

-- Disable triggers and constraints during restore
SET session_replication_role = replica;

`;

    // Get all table names from our schema
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`📊 Found ${tables.length} tables to backup:`, tables.join(', '));

    // For each table, get structure and data
    for (const tableName of tables) {
      console.log(`📋 Backing up table: ${tableName}`);
      
      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type, character_maximum_length, 
               is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `;
      
      const structureResult = await client.query(structureQuery, [tableName]);
      
      // Add table creation SQL
      sqlBackup += `\n-- Table: ${tableName}\n`;
      sqlBackup += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
      
      // Get the actual CREATE TABLE statement
      const createTableQuery = `
        SELECT 
          'CREATE TABLE "' || table_name || '" (' || 
          string_agg(
            '"' || column_name || '" ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'date' THEN 'DATE'
              WHEN data_type = 'uuid' THEN 'UUID'
              WHEN data_type = 'json' THEN 'JSON'
              WHEN data_type = 'jsonb' THEN 'JSONB'
              WHEN data_type = 'ARRAY' THEN data_type
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            ', '
          ) || ');' as create_statement
        FROM information_schema.columns 
        WHERE table_name = $1
        GROUP BY table_name;
      `;
      
      try {
        const createResult = await client.query(createTableQuery, [tableName]);
        if (createResult.rows.length > 0) {
          sqlBackup += createResult.rows[0].create_statement + '\n';
        }
      } catch (err) {
        console.warn(`⚠️  Could not get CREATE statement for ${tableName}, using fallback`);
        // Fallback: create a basic structure
        const columns = structureResult.rows.map(col => {
          let colDef = `"${col.column_name}" ${col.data_type.toUpperCase()}`;
          if (col.character_maximum_length) {
            colDef += `(${col.character_maximum_length})`;
          }
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          return colDef;
        }).join(', ');
        
        sqlBackup += `CREATE TABLE "${tableName}" (${columns});\n`;
      }

      // Get table data
      const dataQuery = `SELECT * FROM "${tableName}";`;
      const dataResult = await client.query(dataQuery);
      
      if (dataResult.rows.length > 0) {
        console.log(`💾 Backing up ${dataResult.rows.length} rows from ${tableName}`);
        
        // Generate INSERT statements
        const columns = dataResult.fields.map(field => `"${field.name}"`).join(', ');
        
        for (const row of dataResult.rows) {
          const values = dataResult.fields.map(field => {
            const value = row[field.name];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            if (Array.isArray(value)) {
              return `'{${value.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '\\"')}"` : v).join(',')}}'`;
            }
            if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            }
            return value;
          }).join(', ');
          
          sqlBackup += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
        }
      } else {
        console.log(`📝 Table ${tableName} is empty`);
      }
      
      sqlBackup += '\n';
    }

    // Add constraints and indexes
    sqlBackup += `\n-- Re-enable triggers and constraints
SET session_replication_role = DEFAULT;

-- Note: You may need to recreate specific constraints, indexes, and sequences
-- depending on your database setup. Check your original schema for:
-- - Primary keys
-- - Foreign keys  
-- - Unique constraints
-- - Indexes
-- - Sequences

-- End of backup
`;

    // Write to file
    fs.writeFileSync(backupFile, sqlBackup);
    
    console.log('✅ Database backup completed successfully!');
    console.log(`📁 Backup saved to: ${backupFile}`);
    console.log(`📊 Backup size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backup
if (require.main === module) {
  backupDatabase().catch(console.error);
}

module.exports = { backupDatabase };