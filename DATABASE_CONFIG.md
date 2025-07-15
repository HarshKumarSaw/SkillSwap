# 🚨 CRITICAL DATABASE CONFIGURATION 🚨

## EXCLUSIVE DATABASE CONNECTION

This project uses **ONE AND ONLY ONE** external PostgreSQL database via environment variable.

## IMPORTANT RULES

⚠️ **NEVER USE ANY OTHER DATABASE**
- This is the ONLY database for this project
- Environment variable DATABASE_URL contains the exclusive connection string
- NO local databases
- NO alternatives
- NO changes without explicit approval

## WHERE IT'S CONFIGURED

### Primary Configuration
- **File**: `server/db.ts`
- **Environment Variable**: `DATABASE_URL`
- **Purpose**: Main database connection for the application

### Secondary Configuration
- **File**: `drizzle.config.ts`
- **Environment Variable**: `DATABASE_URL`
- **Purpose**: Database migrations and schema management
- **Note**: Uses environment variable which contains the exclusive database connection string

## DOCUMENTATION LOCATIONS

This database connection string is documented in:
1. `server/db.ts` - Primary connection configuration
2. `replit.md` - Project architecture documentation
3. `DATABASE_CONFIG.md` - This file (dedicated database documentation)
4. `DEPLOYMENT.md` - Deployment configuration reference

## VERIFICATION

To verify the database connection is working:
1. Check the console logs for "USING EXCLUSIVE DATABASE" message
2. Visit `/api/test-db` endpoint to test database connectivity
3. Ensure all API endpoints are functioning properly

## TROUBLESHOOTING

If you encounter database connection issues:
1. Verify the connection string is exactly as specified above
2. Check that SSL configuration is set to `rejectUnauthorized: false`
3. Ensure the database service is running
4. Contact the database administrator if issues persist

## SECURITY NOTES

- This connection string contains authentication credentials
- Keep this configuration secure and private
- Only share with authorized team members
- Use environment variables in production if needed for security

---

**Last Updated**: July 14, 2025
**Status**: Operational and contains project data
**Configuration Method**: Environment variable (DATABASE_URL)