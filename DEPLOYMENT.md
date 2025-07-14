# Render Deployment Guide

## 🚀 Quick Deploy

**Build Command:**
```
npm ci && npm run build
```

**Start Command:**
```
npm start
```

## Step-by-Step Deployment

### 1. Create Web Service on Render
- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub repository

### 2. Service Configuration
- **Name:** `skill-swap-platform` (or your choice)
- **Environment:** `Node`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm start`
- **Node Version:** `18` or higher

### 3. Environment Variables
Add these in the Environment section:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8` |

### 4. Deploy
- Click "Create Web Service"
- Wait for build to complete (5-10 minutes)
- Your app will be live at: `https://your-app-name.onrender.com`

## ✅ Ready for Production

Your skill swap platform includes:
- 21 real users from your PostgreSQL database
- Search and filtering functionality
- Responsive design
- Error handling
- Single-port deployment (frontend + backend)

## Build Process

1. **Frontend Build:** React app compiled to static files
2. **Backend Bundle:** Express server bundled for Node.js
3. **Single Deployment:** Both served from one port efficiently