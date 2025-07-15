import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSwapRequestSchema, insertSwapRatingSchema, insertAdminActionSchema, insertSystemMessageSchema, insertReportedContentSchema } from "@shared/schema";
import { z } from "zod";
import { pool } from "./db";

/**
 * 🚨 DATABASE REFERENCE 🚨
 * This file uses the exclusive database connection from server/db.ts
 * See DATABASE_CONFIG.md for complete configuration rules
 */

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Authenticate user against database
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Store in session
      (req as any).session.user = user;
      (req as any).session.userId = user.id;
      
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, location } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create new user account
      const user = await storage.createUserAccount(name, email, password, location);
      
      // Store in session
      (req as any).session.user = user;
      (req as any).session.userId = user.id;
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
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
        res.clearCookie('connect.sid'); // Clear session cookie
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

  // Update user profile
  app.put("/api/users/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only allow users to update their own profile
      if (req.session.userId !== req.params.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { skillsOffered, skillsWanted, ...userData } = req.body;
      
      // Update user data
      const updatedUser = await storage.updateUser(req.params.id, userData);
      
      // Update skills if provided
      if (skillsOffered || skillsWanted) {
        await storage.updateUserSkills(req.params.id, skillsOffered || [], skillsWanted || []);
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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

  // Get user's swap requests
  app.get("/api/swap-requests", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const swapRequests = await storage.getUserSwapRequests(user.id);
      res.json(swapRequests);
    } catch (error) {
      console.error("Error fetching swap requests:", error);
      res.status(500).json({ message: "Failed to fetch swap requests" });
    }
  });

  // Update swap request status
  app.patch("/api/swap-requests/:id/status", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { status } = req.body;
      if (!status || !["accepted", "rejected", "cancelled", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedRequest = await storage.updateSwapRequestStatus(req.params.id, status, user.id);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating swap request:", error);
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        res.status(403).json({ message: "Unauthorized to update this request" });
      } else {
        res.status(500).json({ message: "Failed to update swap request" });
      }
    }
  });

  // Delete swap request
  app.delete("/api/swap-requests/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const deleted = await storage.deleteSwapRequest(req.params.id, user.id);
      if (!deleted) {
        return res.status(403).json({ message: "Unauthorized to delete this request" });
      }

      res.json({ message: "Swap request deleted successfully" });
    } catch (error) {
      console.error("Error deleting swap request:", error);
      res.status(500).json({ message: "Failed to delete swap request" });
    }
  });

  // Create rating for completed swap
  app.post("/api/swap-requests/:id/rating", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertSwapRatingSchema.parse({
        ...req.body,
        swapRequestId: req.params.id,
        raterId: user.id
      });

      // Check if rating already exists
      const existingRating = await storage.getSwapRating(req.params.id, user.id);
      if (existingRating) {
        return res.status(400).json({ message: "You have already rated this swap" });
      }

      const rating = await storage.createSwapRating(validatedData);
      res.status(201).json(rating);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid rating data", errors: error.errors });
      } else {
        console.error("Error creating rating:", error);
        res.status(500).json({ message: "Failed to create rating" });
      }
    }
  });

  // Admin middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    const user = req.session?.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Admin Routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getAllUsers(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = req.session.user;
      
      if (!reason) {
        return res.status(400).json({ message: "Ban reason is required" });
      }
      
      await storage.banUser(req.params.id, reason, adminUser.id);
      res.json({ message: "User banned successfully" });
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.session.user;
      
      await storage.unbanUser(req.params.id, adminUser.id);
      res.json({ message: "User unbanned successfully" });
    } catch (error) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ message: "Failed to unban user" });
    }
  });

  app.get("/api/admin/swap-requests", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getAllSwapRequests(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching swap requests:", error);
      res.status(500).json({ message: "Failed to fetch swap requests" });
    }
  });

  app.get("/api/admin/actions", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getAdminActions(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin actions:", error);
      res.status(500).json({ message: "Failed to fetch admin actions" });
    }
  });

  // System Messages
  app.get("/api/system-messages", async (req, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const messages = await storage.getSystemMessages(activeOnly);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching system messages:", error);
      res.status(500).json({ message: "Failed to fetch system messages" });
    }
  });

  app.post("/api/admin/system-messages", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.session.user;
      const validatedData = insertSystemMessageSchema.parse({
        ...req.body,
        adminId: adminUser.id
      });

      const message = await storage.createSystemMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        console.error("Error creating system message:", error);
        res.status(500).json({ message: "Failed to create system message" });
      }
    }
  });

  app.patch("/api/admin/system-messages/:id", requireAdmin, async (req, res) => {
    try {
      const message = await storage.updateSystemMessage(req.params.id, req.body);
      res.json(message);
    } catch (error) {
      console.error("Error updating system message:", error);
      res.status(500).json({ message: "Failed to update system message" });
    }
  });

  app.delete("/api/admin/system-messages/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteSystemMessage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "System message not found" });
      }
      res.json({ message: "System message deleted successfully" });
    } catch (error) {
      console.error("Error deleting system message:", error);
      res.status(500).json({ message: "Failed to delete system message" });
    }
  });

  // Reports
  app.post("/api/reports", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertReportedContentSchema.parse({
        ...req.body,
        reporterId: user.id
      });

      const report = await storage.createReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid report data", errors: error.errors });
      } else {
        console.error("Error creating report:", error);
        res.status(500).json({ message: "Failed to create report" });
      }
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getReports(status, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.patch("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const adminUser = req.session.user;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const report = await storage.updateReport(req.params.id, status, adminUser.id);
      res.json(report);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
