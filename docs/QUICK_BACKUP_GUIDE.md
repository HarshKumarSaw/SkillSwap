# 🚀 Quick Database Backup Guide (Option 1)

> **Ready-to-use solution for immediate database backup and restoration**

## 📦 What You Get

Your backup system includes:
- **SQL Dump Script**: Complete database backup
- **JSON Export**: Human-readable data export  
- **Restore Script**: Automated restoration process
- **Documentation**: Step-by-step instructions

## ⚡ Quick Backup (1-Minute Setup)

### Method 1: Automated Script (Recommended)
```bash
# 1. Install script dependencies
cd scripts
npm install

# 2. Run backup (creates all files)
npm run backup
```

### Method 2: Manual SQL Dump (Simple)
```bash
# Create backup directory
mkdir -p backups

# Generate SQL dump
pg_dump $DATABASE_URL > backups/skillswap-$(date +%Y-%m-%d).sql
```

## 📂 Files Created

After running the backup script, you'll have:

```
backups/
├── skillswap-2025-01-18.sql         # Complete database dump
├── skillswap-data-2025-01-18.json   # Structured data export
├── restore-database.sh              # Restoration script
└── BACKUP_SUMMARY_2025-01-18.md     # Backup report
```

## 🔄 Restoration Process

### When Your Database Expires

1. **Get New Database**
   - Sign up for new provider (Neon, Supabase, Railway)
   - Create PostgreSQL database
   - Copy the connection URL

2. **Run Restoration**
   ```bash
   # Make script executable (Linux/Mac)
   chmod +x backups/restore-database.sh
   
   # Restore to new database
   ./backups/restore-database.sh "postgresql://user:pass@host:port/newdb"
   ```

3. **Update Your App**
   ```bash
   # Update environment variable
   echo "DATABASE_URL=postgresql://your_new_connection_string" > .env
   
   # Test the application
   npm run dev
   ```

## 🛠 Installation Requirements

### For Automated Script
- Node.js (already installed)
- PostgreSQL client tools

### Install PostgreSQL Client Tools

**Windows:**
```bash
# Install via npm (easiest)
npm install -g pg

# Or download PostgreSQL: https://www.postgresql.org/download/windows/
```

**Mac:**
```bash
# Install via Homebrew
brew install postgresql

# Or via npm
npm install -g pg
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# Or via npm
npm install -g pg
```

## 📊 Your Current Data

Based on analysis of your database:

| Table | Records | Status |
|-------|---------|--------|
| skills | 127 | ✅ Critical data |
| user_skills_offered | 61 | ✅ Critical data |
| user_skills_wanted | 41 | ✅ Critical data |
| users | 24 | ✅ Critical data |
| swap_requests | 10 | 📊 Activity data |
| swap_ratings | 8 | 📊 Activity data |
| notifications | 3 | 📨 Current notifications |

**Total: 274 records** - Perfect size for quick backup!

## ✅ Verification Checklist

After restoration, verify:
- [ ] All table counts match above numbers
- [ ] User login works (test with new account)
- [ ] Skills display correctly
- [ ] Search and filtering functional
- [ ] Profile photos load
- [ ] Swap requests work

## 🚨 Emergency Backup (Right Now)

If you need immediate backup without scripts:

```bash
# Quick SQL dump
pg_dump $DATABASE_URL > emergency-backup.sql

# Verify backup file
ls -la emergency-backup.sql
```

This creates a complete backup you can restore anytime.

## 🔧 Troubleshooting

**"pg_dump command not found"**
- Install PostgreSQL client tools (see above)
- Or use the Node.js script which includes pg library

**"Permission denied"**  
- Check DATABASE_URL is accessible
- Verify you have read permissions on database

**"Connection refused"**
- Confirm DATABASE_URL is correct
- Check if database is still running

**Restoration fails**
- Verify new database is empty
- Check PostgreSQL version compatibility
- Ensure sufficient permissions on new database

## 📞 Next Steps

1. **Test the backup script now** (while database still works)
2. **Store backup files securely** (multiple locations)
3. **Document your new database provider choice**
4. **Schedule weekly backups** until migration

## 🔗 Related Documentation

- **[Complete Backup Plan](./DATABASE_BACKUP_PLAN.md)** - Full enterprise solution
- **[Database Config](./DATABASE_CONFIG.md)** - Database setup guide
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment

---

**Ready to backup?** Run the script now to ensure your data is safely preserved before the database expires!