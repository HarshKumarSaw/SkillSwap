# Skill Swap Platform

A full-stack web application for skill swapping, where users can offer skills they have and request skills they want to learn from other users.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Copy the `.env` file and ensure it contains all required environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser to `http://localhost:5000`

## Features

- **User Authentication:** Secure login/signup with password reset
- **Profile Management:** Edit profiles with photo upload via Cloudinary
- **Skill Matching:** Browse users by skills offered and wanted
- **Swap Requests:** Send and manage skill exchange requests
- **Smart Request Management:** Automatic duplicate request prevention
- **Real-time Feedback:** Instant notifications for all actions
- **Admin Dashboard:** Complete user and content moderation system

## Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, Node.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Image Storage:** Cloudinary
- **Build Tool:** Vite

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Configure the following required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `CLOUDINARY_API_KEY`: Cloudinary API key for image uploads
- `CLOUDINARY_API_SECRET`: Cloudinary API secret  
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `SESSION_SECRET`: Secret key for session management (generate a secure random string)

Optional variables:
- `NODE_ENV`: Application environment (default: development)
- `PORT`: Server port (default: 5000)

### 2. Database Setup

This application requires a PostgreSQL database. You can use:
- Local PostgreSQL installation
- Cloud providers (Neon, Supabase, Heroku Postgres, etc.)
- Docker PostgreSQL container

Set your `DATABASE_URL` in the `.env` file:
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### 3. Cloudinary Setup

For profile photo uploads, create a free account at [Cloudinary](https://cloudinary.com/) and add your credentials to the `.env` file.

### 4. Installation & Running

Install dependencies:
```bash
npm install
```

Push database schema (first time setup):
```bash
npm run db:push
```

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Development Notes

- The application uses hot module replacement for fast development
- Frontend and backend are served on the same port (5000)
- Database migrations are handled by Drizzle Kit (`npm run db:push`)
- No separate database setup needed - schema is automatically synced

## Security

- All sensitive credentials are stored in environment variables
- Session management with PostgreSQL-backed storage
- Input validation and sanitization
- Secure file upload handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and demonstration purposes.