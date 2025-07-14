import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSwapRequestSchema } from "@shared/schema";
import { z } from "zod";
import { pool } from "./db";

/**
 * 🚨 DATABASE REFERENCE 🚨
 * This file uses the exclusive database connection from server/db.ts
 * Database: postgresql://database_92s8_user:bbZSAeLRZ0FxTDM0V64Izx1pX1gQmBQ6@dpg-d1pqc23ipnbc738anci0-a.oregon-postgres.render.com/database_92s8
 * See DATABASE_CONFIG.md for complete configuration rules
 */

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // For demonstration, we'll just return a mock user
      // In a real app, you'd validate credentials against the database
      const mockUser = {
        id: "mock-user-" + Date.now(),
        email,
        name: "Demo User",
        location: "Demo Location",
        isPublic: true,
        isAdmin: false,
        rating: "4.5",
        joinDate: new Date().toISOString(),
        profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        bio: "Demo user for skill swap platform",
        skillsOffered: [],
        skillsWanted: [],
        availability: { dates: ["weekends"], times: ["evening"] },
        isBanned: false
      };
      
      // Store in session
      (req as any).session.user = mockUser;
      
      res.json(mockUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, location } = req.body;
      
      // For demonstration, we'll just return a mock user
      // In a real app, you'd create a new user in the database
      const mockUser = {
        id: "mock-user-" + Date.now(),
        email,
        name,
        location: location || "Not specified",
        isPublic: true,
        isAdmin: false,
        rating: "0.0",
        joinDate: new Date().toISOString(),
        profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        bio: "New user on skill swap platform",
        skillsOffered: [],
        skillsWanted: [],
        availability: { dates: ["weekends"], times: ["evening"] },
        isBanned: false
      };
      
      // Store in session
      (req as any).session.user = mockUser;
      
      res.status(201).json(mockUser);
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ message: "Failed to create account" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const user = (req as any).session?.user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Failed to logout" });
      } else {
        res.json({ message: "Logged out successfully" });
      }
    });
  });

  // Database test route
  app.get("/api/test-db", async (req, res) => {
    try {
      const client = await pool.connect();
      const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      const usersSchemaResult = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
      client.release();
      res.json({ 
        tables: tablesResult.rows, 
        usersSchema: usersSchemaResult.rows,
        connection: "success" 
      });
    } catch (error) {
      console.error("Database test error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get all users with their skills (with pagination)
  app.get("/api/users", async (req, res) => {
    try {
      console.log("API endpoint /api/users called");
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 8;
      
      const result = await storage.getUsersWithSkills(page, limit);
      console.log("Successfully fetched users:", result.data.length);
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Search users with filters (must come before /api/users/:id)
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q: searchTerm, skills, dates, times } = req.query;
      
      const skillFilters = skills ? (skills as string).split(',').filter(Boolean) : undefined;
      const dateFilters = dates ? (dates as string).split(',').filter(Boolean) : undefined;
      const timeFilters = times ? (times as string).split(',').filter(Boolean) : undefined;

      const users = await storage.searchUsers(
        searchTerm as string | undefined,
        skillFilters,
        dateFilters,
        timeFilters
      );
      
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get single user by ID with skills (must come after /api/users/search)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUserWithSkills(id);
      
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all skills grouped by category
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getSkillsByCategory();
      res.json(skills);
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  // Create swap request
  app.post("/api/swap-requests", async (req, res) => {
    try {
      const validatedData = insertSwapRequestSchema.parse(req.body);
      const swapRequest = await storage.createSwapRequest(validatedData);
      res.status(201).json(swapRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error creating swap request:", error);
        res.status(500).json({ message: "Failed to create swap request" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
