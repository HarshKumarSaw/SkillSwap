# Skill Swap Platform

## Overview

This is a full-stack web application for skill swapping, where users can offer skills they have and request skills they want to learn from other users. The platform allows users to discover each other, filter by skills and availability, and send swap requests to connect for skill exchanges.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Database URL**: postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8
- **Configuration**: The database connection is hardcoded in `server/db.ts` to use this external PostgreSQL instance exclusively
- **Purpose**: This is the ONLY database to be used for this project - no local databases, no environment variables, no alternatives
- **Status**: Currently operational and contains project data
- **Documentation**: See `DATABASE_CONFIG.md` for detailed database configuration rules and guidelines
- **Security**: Connection string is hardcoded for consistency but contains sensitive credentials

## Key Components

### Database Schema
- **Users**: Store user profiles with name, email, location, availability, and ratings
- **Skills**: Categorized skill definitions (Design, Programming, Marketing, etc.)
- **User Skills Offered/Wanted**: Many-to-many relationships linking users to skills
- **Swap Requests**: Track skill exchange requests between users with status tracking

### Frontend Components
- **UserCard**: Displays user profiles with offered/wanted skills and swap request functionality
- **SkillTag**: Visual skill indicators with color coding for offered vs wanted skills
- **Search & Filtering**: Real-time search with skill category and availability filters
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
- **🚨 EXCLUSIVE DATABASE**: postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8 (ONLY DATABASE FOR THIS PROJECT)
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
- **🚨 Database connection hardcoded to external PostgreSQL instance**: postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8
- **Direct database connection bypasses environment variables for consistency**
- **Session storage backed by PostgreSQL for scalability**
- **Comprehensive documentation**: See `DATABASE_CONFIG.md` for complete database configuration rules

The application follows a monorepo structure with shared TypeScript schemas, ensuring type safety across the full stack while maintaining clear separation between client and server code.