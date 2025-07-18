#!/usr/bin/env node

/**
 * SkillSwap Database Backup Script
 * Generates SQL dump and JSON exports for database migration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '../backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

async function createBackupDirectory() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

async function createSQLDump() {
  console.log('Creating PostgreSQL dump...');
  
  const dumpFile = path.join(BACKUP_DIR, `skillswap-${TIMESTAMP}.sql`);
  
  try {
    // Use pg_dump to create complete database backup
    const command = `pg_dump "${DATABASE_URL}" > "${dumpFile}"`;
    await execAsync(command);
    
    console.log(`✅ SQL dump created: ${dumpFile}`);
    return dumpFile;
  } catch (error) {
    console.error('❌ Failed to create SQL dump:', error.message);
    throw error;
  }
}

async function exportTableData() {
  console.log('Exporting table data as JSON...');
  
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const tables = [
    'users',
    'skills', 
    'user_skills_offered',
    'user_skills_wanted',
    'swap_requests',
    'swap_ratings',
    'notifications'
  ];
  
  const exports = {};
  
  try {
    for (const table of tables) {
      console.log(`  Exporting ${table}...`);
      
      let query = `SELECT * FROM ${table}`;
      
      // Sanitize user data (remove passwords)
      if (table === 'users') {
        query = `SELECT id, name, email, bio, location, profile_photo, availability, 
                        is_public, rating, role, created_at 
                 FROM users WHERE COALESCE(is_banned, false) = false`;
      }
      
      const result = await pool.query(query);
      exports[table] = result.rows;
      console.log(`    ✅ ${result.rows.length} records exported`);
    }
    
    // Save JSON export
    const jsonFile = path.join(BACKUP_DIR, `skillswap-data-${TIMESTAMP}.json`);
    await fs.writeFile(jsonFile, JSON.stringify(exports, null, 2));
    console.log(`✅ JSON export created: ${jsonFile}`);
    
    return jsonFile;
  } catch (error) {
    console.error('❌ Failed to export table data:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function generateRestoreScript() {
  console.log('Generating restore script...');
  
  const restoreScript = `#!/bin/bash

# SkillSwap Database Restoration Script
# Usage: ./restore-database.sh <NEW_DATABASE_URL>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <NEW_DATABASE_URL>"
    echo "Example: $0 postgresql://user:pass@host:port/database"
    exit 1
fi

NEW_DATABASE_URL="$1"
BACKUP_FILE="skillswap-${TIMESTAMP}.sql"

echo "🔄 Restoring SkillSwap database..."
echo "Source: $BACKUP_FILE"
echo "Target: $NEW_DATABASE_URL"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Restore database
echo "📥 Restoring database from SQL dump..."
psql "$NEW_DATABASE_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restoration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with the new DATABASE_URL"
    echo "2. Test the application: npm run dev"
    echo "3. Verify all data is present and functional"
else
    echo "❌ Database restoration failed!"
    exit 1
fi
`;
  
  const scriptFile = path.join(BACKUP_DIR, 'restore-database.sh');
  await fs.writeFile(scriptFile, restoreScript);
  
  // Make script executable
  try {
    await execAsync(`chmod +x "${scriptFile}"`);
  } catch (error) {
    console.log('Note: Could not make script executable (Windows/permission issue)');
  }
  
  console.log(`✅ Restore script created: ${scriptFile}`);
  return scriptFile;
}

async function generateSummaryReport() {
  console.log('Generating backup summary...');
  
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Get table counts
    const tableQueries = [
      "SELECT 'users' as table_name, COUNT(*) as count FROM users",
      "SELECT 'skills' as table_name, COUNT(*) as count FROM skills",
      "SELECT 'user_skills_offered' as table_name, COUNT(*) as count FROM user_skills_offered",
      "SELECT 'user_skills_wanted' as table_name, COUNT(*) as count FROM user_skills_wanted",
      "SELECT 'swap_requests' as table_name, COUNT(*) as count FROM swap_requests",
      "SELECT 'swap_ratings' as table_name, COUNT(*) as count FROM swap_ratings"
    ].join(' UNION ALL ');
    
    const result = await pool.query(tableQueries + ' ORDER BY count DESC');
    
    const summary = `# SkillSwap Database Backup Summary
Generated: ${new Date().toISOString()}
Database: ${DATABASE_URL.split('@')[1] || 'Hidden for security'}

## Data Statistics
${result.rows.map(row => `- **${row.table_name}**: ${row.count} records`).join('\n')}

## Backup Files
- \`skillswap-${TIMESTAMP}.sql\` - Complete PostgreSQL dump
- \`skillswap-data-${TIMESTAMP}.json\` - Structured data export
- \`restore-database.sh\` - Restoration script

## Restoration Instructions

### Option 1: Complete SQL Restore (Recommended)
\`\`\`bash
# 1. Create new database (Neon, Supabase, Railway, etc.)
# 2. Get the new DATABASE_URL
# 3. Run restoration
./restore-database.sh "postgresql://user:pass@host:port/newdb"
\`\`\`

### Option 2: Manual Restore
\`\`\`bash
# 1. Install PostgreSQL client tools
# 2. Restore manually
psql "NEW_DATABASE_URL" < skillswap-${TIMESTAMP}.sql
\`\`\`

### Option 3: Schema + JSON Data
\`\`\`bash
# 1. Set up new database with schema
npm run db:push
# 2. Import data (requires custom script - see JSON file)
\`\`\`

## Security Notes
- User passwords have been excluded from JSON export
- Original SQL dump contains all data including hashed passwords
- Update SESSION_SECRET when migrating to new database
- Generate new admin passwords after restoration

## Verification Checklist
After restoration:
- [ ] Check all table counts match above statistics
- [ ] Test user authentication (create new test user)
- [ ] Verify skill categories and mappings
- [ ] Test swap request functionality
- [ ] Confirm profile photos load correctly
- [ ] Check admin dashboard access

## Support
If restoration fails:
1. Check PostgreSQL version compatibility
2. Verify connection string format
3. Ensure sufficient database permissions
4. Contact database provider support if needed

---
Backup created with SkillSwap Platform v1.0
`;
    
    const summaryFile = path.join(BACKUP_DIR, `BACKUP_SUMMARY_${TIMESTAMP}.md`);
    await fs.writeFile(summaryFile, summary);
    console.log(`✅ Backup summary created: ${summaryFile}`);
    
    return { summary, counts: result.rows };
  } catch (error) {
    console.error('❌ Failed to generate summary:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🗄️ SkillSwap Database Backup Starting...\n');
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  try {
    await createBackupDirectory();
    
    const [sqlFile, jsonFile, scriptFile] = await Promise.all([
      createSQLDump(),
      exportTableData(),
      generateRestoreScript()
    ]);
    
    const { counts } = await generateSummaryReport();
    
    console.log('\n🎉 Backup completed successfully!');
    console.log('\nFiles created:');
    console.log(`📄 SQL Dump: ${path.basename(sqlFile)}`);
    console.log(`📊 JSON Data: ${path.basename(jsonFile)}`);
    console.log(`🔧 Restore Script: ${path.basename(scriptFile)}`);
    console.log(`📋 Summary: BACKUP_SUMMARY_${TIMESTAMP}.md`);
    
    console.log('\nData backed up:');
    counts.forEach(row => {
      console.log(`  ${row.table_name}: ${row.count} records`);
    });
    
    console.log(`\n📂 All files saved to: ${BACKUP_DIR}`);
    console.log('\n⚠️  Important: Store backup files in a secure location!');
    console.log('💡 Next: Test restoration process with a new database');
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);