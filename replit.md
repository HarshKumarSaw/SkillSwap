# Skill Swap Platform

## Overview

This is a full-stack web application for skill swapping, where users can offer skills they have and request skills they want to learn from other users. The platform allows users to discover each other, filter by skills and availability, and send swap requests to connect for skill exchanges.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**July 15, 2025**:
- ✓ **Phase 2: Admin System Complete** - Implemented comprehensive admin dashboard with user management, content moderation, and system messaging
- ✓ **Admin Authentication** - Created admin user (admin@skillswap.com, password: 12345) with role-based access control
- ✓ **User Management** - Ban/unban functionality with reason tracking and complete audit logging
- ✓ **Content Moderation** - Admin can view all swap requests, handle reports, and moderate platform content
- ✓ **System Messaging** - Create platform-wide announcements and notifications with type categorization
- ✓ **Admin Action Logging** - Complete audit trail of all administrative actions with timestamps and reasons
- ✓ Updated password validation to allow 5-character passwords for admin login compatibility
- ✓ Secured codebase for GitHub upload by removing all hardcoded database credentials from documentation files
- ✓ Updated .gitignore to prevent accidental exposure of environment variables and sensitive files
- ✓ Verified application works with DATABASE_URL environment variable configuration
- ✓ All database credentials now properly managed via environment variables only

**July 14, 2025**:
- ✓ Updated database configuration to use DATABASE_URL environment variable properly
- ✓ Aligned all documentation (DATABASE_CONFIG.md, replit.md) with correct environment variable approach
- ✓ Verified exclusive PostgreSQL database connection is operational with 20 users
- ✓ Confirmed API endpoints are functioning correctly with external database
- ✓ Fixed Amara Okonkwo and Jakob Nielsen missing skills by adding relevant skills to database
- ✓ Added clickable profile photos that open detailed user profile pages
- ✓ Created dedicated user profile page with comprehensive user information
- ✓ Implemented scroll-to-top functionality for pagination navigation
- ✓ Fixed profile page loading for users on any pagination page by creating dedicated API endpoint
- ✓ Added efficient single-user API endpoint `/api/users/:id` for profile page data fetching
- ✓ Implemented back navigation preservation - users return to the exact page they were browsing
- ✓ Added URL parameter handling to maintain page state when navigating between profile and browse views
- ✓ Fixed profile page to display actual user profile photos instead of fallback images
- ✓ Added proper error handling for profile photos with graceful fallback only when image fails to load
- ✓ Optimized profile page loading performance by reducing database queries and adding indexes
- ✓ Combined skill queries into single database call to reduce API response time
- ✓ Added database indexes for faster user profile lookups
- ✓ Fixed database column name mismatch in swap_requests table (sender_id/receiver_id vs requester_id/target_id)
- ✓ Replaced "Add Profile" button with login/logout functionality using UserMenu component
- ✓ Created UserMenu component with profile avatar dropdown for authenticated users
- ✓ Fixed authentication state synchronization for swap request functionality
- ✓ Created comprehensive edit profile page with forms for personal details, skills, and availability
- ✓ Added backend API endpoints for updating user profiles and skills (PUT /api/users/:id)
- ✓ Implemented skill management system allowing users to add/remove offered and wanted skills
- ✓ Added availability settings for dates (weekends/weekdays/everyday) and times (morning/evening/night)
- ✓ Created secure profile editing with authentication checks and user authorization

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and bundling
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: External PostgreSQL (EXCLUSIVE DATABASE)
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions
- **API Pattern**: RESTful API endpoints
- **Validation**: Zod for runtime type checking

**🚨 CRITICAL DATABASE CONFIGURATION 🚨**:
- **Database**: External PostgreSQL instance (connection via environment variable)
- **Configuration**: Uses DATABASE_URL environment variable in `server/db.ts` to connect to this external PostgreSQL instance exclusively
- **Purpose**: This is the ONLY database to be used for this project - no local databases, no alternatives
- **Status**: Currently operational and contains project data
- **Documentation**: See `DATABASE_CONFIG.md` for detailed database configuration rules and guidelines
- **Security**: Connection string managed via environment variable for proper security practices

## Key Components

### Database Schema
- **Users**: Store user profiles with name, email, location, availability, and ratings
- **Skills**: Categorized skill definitions (Design, Programming, Marketing, etc.)
- **User Skills Offered/Wanted**: Many-to-many relationships linking users to skills
- **Swap Requests**: Track skill exchange requests between users with status tracking

### Frontend Components
- **UserCard**: Displays user profiles with offered/wanted skills and swap request functionality
- **SkillTag**: Visual skill indicators with color coding for offered vs wanted skills
- **Search & Filtering**: Real-time search with skill category and availability filters in compact popover UI
- **Toast Notifications**: User feedback for actions like sending swap requests

### API Endpoints
- `GET /api/users` - Fetch all public users with their skills (with pagination support)
- `GET /api/users/search` - Search users with filters for skills and availability
- `GET /api/skills` - Get all skills grouped by category
- `POST /api/swap-requests` - Create new skill swap requests

## Data Flow

1. **User Discovery**: Frontend fetches users and skills from API endpoints with pagination support
2. **Pagination**: Users are loaded 8 per page with navigation controls (Previous/Next and numbered pages)
3. **Filtering**: Optimized single-query search with skill and availability filters
4. **Swap Requests**: Users can send swap requests through POST API calls
5. **State Management**: TanStack Query handles caching and synchronization
6. **User Feedback**: Toast notifications provide immediate action feedback

## Performance Optimizations

- **Database Queries**: Single optimized query for user search instead of N+1 queries
- **Pagination**: Server-side pagination with 8 users per page reduces initial load times and improves performance
- **Skill Filtering**: Database-level filtering using EXISTS clauses for better performance
- **Caching**: TanStack Query caches results with appropriate stale times

## External Dependencies

### Database & Infrastructure
- **🚨 EXCLUSIVE DATABASE**: External PostgreSQL instance (ONLY DATABASE FOR THIS PROJECT)
- **Environment Variable**: DATABASE_URL contains the exclusive connection string
- **Configuration Files**: `server/db.ts` (primary), `drizzle.config.ts` (migrations), `DATABASE_CONFIG.md` (documentation)
- **WebSocket Support**: For real-time database connections
- **SSL Configuration**: `rejectUnauthorized: false` for external database connectivity

### UI & Styling
- **shadcn/ui**: Pre-built accessible UI components
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundling for production
- **TSX**: TypeScript execution for development

## Deployment Strategy

### Development
- Vite dev server for frontend with hot module replacement
- Express server with TypeScript execution via TSX
- Database migrations handled by Drizzle Kit

### Production Build
- Frontend built with Vite to static assets
- Backend bundled with ESBuild for Node.js execution
- Single deployment artifact with both frontend and backend

### Environment Configuration
- **🚨 Database connection via DATABASE_URL environment variable**: External PostgreSQL connection
- **Environment variable ensures secure database connection management**
- **Session storage backed by PostgreSQL for scalability**
- **Comprehensive documentation**: See `DATABASE_CONFIG.md` for complete database configuration rules

The application follows a monorepo structure with shared TypeScript schemas, ensuring type safety across the full stack while maintaining clear separation between client and server code.