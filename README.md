<div align="center">

<img src="./docs/assets/skillswap-logo.svg" alt="SkillSwap Platform" width="300" />

# SkillSwap Platform

A dynamic React-based skill swap platform that enables global skill discovery and matching through an advanced, performance-optimized interface with enhanced user interaction capabilities.

<p align="center">
  <a href="https://skillswap-vzjn.onrender.com/" target="_blank">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Visit_App-blue?style=for-the-badge&logo=render" alt="Live Demo">
  </a>
  <a href="#-quick-start">
    <img src="https://img.shields.io/badge/📚_Get_Started-Documentation-green?style=for-the-badge" alt="Get Started">
  </a>
  <a href="./docs/QUICK_BACKUP_GUIDE.md">
    <img src="https://img.shields.io/badge/🗄️_Backup-Database_Guide-orange?style=for-the-badge" alt="Backup Guide">
  </a>
</p>

</div>

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/               # Source files
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                 # Backend Express.js API
│   ├── routes.ts          # API route definitions
│   ├── db.ts              # Database configuration
│   ├── storage.ts         # Data access layer
│   └── cloudinary.ts      # Image upload service
├── shared/                 # Shared TypeScript schemas
│   └── schema.ts          # Database models and types
├── docs/                   # Documentation and assets
│   ├── DATABASE_CONFIG.md  # Database setup guide
│   ├── replit.md          # Project documentation
│   └── assets/            # Design files and diagrams
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md              # Main setup instructions
```

## ✨ Features

- **User Discovery**: Browse users by skills with advanced filtering
- **Real-time Search**: Filter by skill categories and availability
- **Skill Matching**: Send swap requests to users with complementary skills
- **Profile Management**: Comprehensive user profiles with skill listings
- **Mobile-First Design**: Responsive interface optimized for all devices
- **Rating System**: Rate and review completed skill swaps
- **Admin Dashboard**: Complete administrative tools for platform management
- **Photo Upload**: Profile photo management via Cloudinary
- **Smart Notifications**: Real-time notification system

## 🛠 Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Image Storage:** Cloudinary
- **Build Tool:** Vite
- **State Management:** TanStack Query

## 🚀 Quick Start

### Prerequisites
- Node.js (18+)
- PostgreSQL database - See [Database Config Guide](./docs/DATABASE_CONFIG.md)
- Cloudinary account (for image uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skill-swap-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file with:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   SESSION_SECRET=your_secure_session_secret
   ```

4. **Database setup**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open `http://localhost:5000` in your browser

## 📋 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `SESSION_SECRET` | Session encryption key | ✅ |
| `NODE_ENV` | Environment (development/production) | ❌ |
| `PORT` | Server port (default: 5000) | ❌ |

## 🗄 Database Setup

This application requires a PostgreSQL database. For detailed setup instructions, see [Database Configuration Guide](./docs/DATABASE_CONFIG.md).

**Quick Options:**
- **Cloud databases**: Neon, Supabase, Railway (recommended)
- **Cloud Providers**: Neon, Supabase, Heroku Postgres, etc.
- **Docker**: Run PostgreSQL in a container

### Cloud Database Options
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Railway](https://railway.app/) - Simple cloud deployment
- [Heroku Postgres](https://www.heroku.com/postgres) - Managed PostgreSQL

## 📁 Development Notes

- The application uses hot module replacement for fast development
- Frontend and backend are served on the same port (5000)
- Database migrations are handled by Drizzle Kit (`npm run db:push`)
- No separate database setup needed - schema is automatically synced

### Common Commands
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run db:push    # Sync database schema
npm start          # Start production server
```

### Troubleshooting
- **Database connection issues?** → See [Database Config](./docs/DATABASE_CONFIG.md#-troubleshooting)
- **Build errors?** → Check Node.js version (18+ required)
- **Environment variables?** → Verify all required variables in [.env.example](./.env.example)

### 🌐 Live Demo
Check out the live application: **[https://skillswap-vzjn.onrender.com/](https://skillswap-vzjn.onrender.com/)**

## 🛡 Security

- All sensitive credentials are stored in environment variables
- Session management with PostgreSQL-backed storage
- Input validation and sanitization
- Secure file upload handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 Documentation

**Main Documentation Hub:** [docs/README.md](./docs/README.md)

### Quick Links
- **[Database Setup](./docs/DATABASE_CONFIG.md)** - PostgreSQL configuration and troubleshooting
- **[Quick Backup](./docs/QUICK_BACKUP_GUIDE.md)** - Ready-to-use backup solution
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions  
- **[Project Documentation](./docs/replit.md)** - Complete project history and architecture
- **[Environment Variables](./.env.example)** - Required configuration template

### For Developers
- **Setup Issues?** → [Database Config](./docs/DATABASE_CONFIG.md#-troubleshooting)
- **Deployment?** → [Deployment Guide](./docs/DEPLOYMENT.md) 
- **Architecture?** → [Project Docs](./docs/replit.md)

## 📄 License

This project is for educational and demonstration purposes.

---

Built with ❤️ using modern web technologies