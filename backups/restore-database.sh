#!/bin/bash

# SkillSwap Database Restoration Script
# Usage: ./restore-database.sh <NEW_DATABASE_URL>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <NEW_DATABASE_URL>"
    echo "Example: $0 postgresql://user:pass@host:port/database"
    exit 1
fi

NEW_DATABASE_URL="$1"
BACKUP_FILE="skillswap-2025-07-18.sql"

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
