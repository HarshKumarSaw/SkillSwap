# Skill Swap Platform - Replit Configuration

## Overview

This is a comprehensive React-based skill swapping platform that enables users to discover, match, and exchange skills through an advanced interface with real-time features, mobile optimization, and administrative tools. The platform includes professional branding, extensive documentation, and is optimized for GitHub hosting and production deployment.

## User Preferences

Preferred communication style: Simple, everyday language.
Documentation style: Professional GitHub format with cross-referencing and proper structure.
Design preference: Modern, professional UI with gradient branding and mobile-first approach.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Theme**: Custom theme provider supporting light/dark modes

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Session Management**: Express sessions with PostgreSQL storage
- **File Upload**: Multer with Cloudinary integration
- **API Design**: RESTful endpoints with consistent error handling

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Single exclusive database connection via `DATABASE_URL`
- **Migration Tool**: Drizzle Kit for schema management
- **Connection Pooling**: Configured with SSL support and optimized pool settings

## Key Components

### Authentication System
- Session-based authentication with secure cookies
- User signup/login with email validation
- Password reset functionality using security questions
- Admin role-based access control

### User Management
- Comprehensive user profiles with photo uploads
- Skills offered/wanted management with categorization
- Availability scheduling (dates and times)
- Privacy controls for profile visibility
- Account deletion with complete data cleanup

### Skill Matching Platform
- Browse users by skills offered and wanted
- Advanced search and filtering capabilities
- Pagination for optimized performance
- Smart duplicate request prevention

### Swap Request System
- Send and manage skill exchange requests
- Status tracking (pending, accepted, rejected, completed)
- Edit functionality for pending requests
- Rating system for completed exchanges

### Communication Features
- Real-time messaging system between users
- Notification system with read/unread tracking
- Conversation management and history

### Admin Dashboard
- User management (ban/unban functionality)
- Content moderation and reporting system
- System-wide messaging capabilities
- Analytics and platform statistics
- Admin action logging and audit trail

## Data Flow

### User Registration/Authentication
1. User submits registration form with security question
2. Server validates and hashes credentials
3. Account created with default profile settings
4. Session established for authenticated state

### Skill Exchange Process
1. User browses available users and their skills
2. Swap request sent with specific skills and message
3. Target user receives notification and can accept/reject
4. Upon acceptance, both users can message each other
5. After skill exchange, users can rate the experience

### File Upload Process
1. User selects profile photo
2. File uploaded to Cloudinary with automatic optimization
3. Cloudinary URL stored in user profile
4. Old images replaced to maintain storage efficiency

## External Dependencies

### Image Storage
- **Cloudinary**: Profile photo storage and optimization
- **Configuration**: Automatic cropping, quality optimization, and format conversion
- **Security**: Folder-based organization and access control

### Database Service
- **PostgreSQL**: Primary data storage with SSL connections
- **Environment**: Single exclusive database connection
- **Security**: Connection string stored in environment variables

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting
- **Drizzle Studio**: Database inspection and management

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Single Port**: Server serves both API and static files

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `CLOUDINARY_API_KEY`: Cloudinary API credentials
- `CLOUDINARY_API_SECRET`: Cloudinary secret key
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud identifier
- `SESSION_SECRET`: Session encryption key

### Deployment Commands
- **Build**: `npm run build` - Builds both frontend and backend
- **Start**: `npm start` - Runs production server
- **Development**: `npm run dev` - Runs development server with hot reload

### Database Management
- **Schema Updates**: `npm run db:push` - Applies schema changes
- **Migrations**: Handled through Drizzle Kit with version control

### Performance Optimizations
- Image optimization through Cloudinary transformations
- Database connection pooling with configurable limits
- Pagination for large datasets (users, messages, notifications)
- Query optimization with proper indexing strategies
- Session storage optimization with PostgreSQL backend

### Security Measures
- **Password Security**: bcrypt hashing with 12 rounds for all user passwords
- **Password Migration**: Completed migration of existing plain text passwords to secure bcrypt hashes
- **Authentication**: Session-based authentication with HTTP-only cookies
- **Database Security**: SQL injection prevention through parameterized queries
- **API Security**: CORS configuration for cross-origin request protection
- **File Upload Security**: Validation and size limits for profile photo uploads
- **Admin Security**: Role verification for sensitive administrative operations