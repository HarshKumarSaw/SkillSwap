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
      const currentUserId = req.session?.userId;
      
      // If user is viewing their own profile, allow access even if private
      const user = await storage.getUserWithSkills(id, currentUserId === id);
      
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

  // Auth middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
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

  // Admin Report Downloads
  app.get("/api/admin/download/user-activity", requireAdmin, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.location,
            u.rating,
            u.review_count,
            u.is_public,
            u.is_banned,
            u.created_at,
            COUNT(DISTINCT sr_sent.id) as swap_requests_sent,
            COUNT(DISTINCT sr_received.id) as swap_requests_received,
            COUNT(DISTINCT ratings_given.id) as ratings_given,
            COUNT(DISTINCT ratings_received.id) as ratings_received
          FROM users u
          LEFT JOIN swap_requests sr_sent ON u.id = sr_sent.requester_id
          LEFT JOIN swap_requests sr_received ON u.id = sr_received.target_id
          LEFT JOIN swap_ratings ratings_given ON u.id = ratings_given.rater_id
          LEFT JOIN swap_ratings ratings_received ON u.id = ratings_received.rated_id
          GROUP BY u.id, u.name, u.email, u.location, u.rating, u.review_count, u.is_public, u.is_banned, u.created_at
          ORDER BY u.created_at DESC
        `);

        const csvContent = [
          'ID,Name,Email,Location,Rating,Review Count,Is Public,Is Banned,Created At,Swap Requests Sent,Swap Requests Received,Ratings Given,Ratings Received',
          ...result.rows.map(row => 
            `"${row.id}","${row.name}","${row.email}","${row.location || ''}",${row.rating},${row.review_count},${row.is_public},${row.is_banned},"${row.created_at}",${row.swap_requests_sent},${row.swap_requests_received},${row.ratings_given},${row.ratings_received}`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="user-activity-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error generating user activity report:", error);
      res.status(500).json({ message: "Failed to generate user activity report" });
    }
  });

  app.get("/api/admin/download/feedback-logs", requireAdmin, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            sr.id as swap_request_id,
            sr.requester_skill,
            sr.target_skill,
            sr.status,
            sr.created_at as swap_created_at,
            rater.name as rater_name,
            rater.email as rater_email,
            rated.name as rated_name,
            rated.email as rated_email,
            rating.rating,
            rating.feedback,
            rating.created_at as rating_created_at
          FROM swap_ratings rating
          JOIN swap_requests sr ON rating.swap_request_id = sr.id
          JOIN users rater ON rating.rater_id = rater.id
          JOIN users rated ON rating.rated_id = rated.id
          ORDER BY rating.created_at DESC
        `);

        const csvContent = [
          'Swap Request ID,Requester Skill,Target Skill,Swap Status,Swap Created At,Rater Name,Rater Email,Rated Name,Rated Email,Rating,Feedback,Rating Created At',
          ...result.rows.map(row => 
            `"${row.swap_request_id}","${row.requester_skill}","${row.target_skill}","${row.status}","${row.swap_created_at}","${row.rater_name}","${row.rater_email}","${row.rated_name}","${row.rated_email}",${row.rating},"${(row.feedback || '').replace(/"/g, '""')}","${row.rating_created_at}"`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="feedback-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error generating feedback logs report:", error);
      res.status(500).json({ message: "Failed to generate feedback logs report" });
    }
  });

  app.get("/api/admin/download/swap-stats", requireAdmin, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const statsResult = await client.query(`
          SELECT 
            COUNT(*) as total_swap_requests,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_requests,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
            AVG(CASE WHEN status = 'completed' THEN 
              EXTRACT(epoch FROM (completed_at::timestamp - created_at::timestamp))/86400 
            END) as avg_completion_days
          FROM swap_requests
        `);

        const skillsResult = await client.query(`
          SELECT 
            requester_skill as skill,
            COUNT(*) as requests_count
          FROM swap_requests
          GROUP BY requester_skill
          UNION
          SELECT 
            target_skill as skill,
            COUNT(*) as requests_count
          FROM swap_requests
          GROUP BY target_skill
          ORDER BY requests_count DESC
          LIMIT 20
        `);

        const monthlyResult = await client.query(`
          SELECT 
            DATE_TRUNC('month', created_at::timestamp) as month,
            COUNT(*) as requests_count,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
          FROM swap_requests
          WHERE created_at::timestamp >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at::timestamp)
          ORDER BY month DESC
        `);

        const stats = statsResult.rows[0];
        
        let csvContent = 'Skill Swap Platform Statistics Report\n';
        csvContent += `Generated on: ${new Date().toISOString()}\n\n`;
        csvContent += 'OVERALL STATISTICS\n';
        csvContent += `Total Swap Requests,${stats.total_swap_requests}\n`;
        csvContent += `Pending Requests,${stats.pending_requests}\n`;
        csvContent += `Accepted Requests,${stats.accepted_requests}\n`;
        csvContent += `Rejected Requests,${stats.rejected_requests}\n`;
        csvContent += `Completed Requests,${stats.completed_requests}\n`;
        csvContent += `Average Completion Time (Days),${stats.avg_completion_days || 0}\n\n`;
        
        csvContent += 'TOP SKILLS BY REQUEST COUNT\n';
        csvContent += 'Skill,Request Count\n';
        csvContent += skillsResult.rows.map(row => `"${row.skill}",${row.requests_count}`).join('\n');
        csvContent += '\n\n';
        
        csvContent += 'MONTHLY ACTIVITY (Last 12 Months)\n';
        csvContent += 'Month,Total Requests,Completed Requests\n';
        csvContent += monthlyResult.rows.map(row => 
          `"${row.month}",${row.requests_count},${row.completed_count}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="swap-stats-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error generating swap stats report:", error);
      res.status(500).json({ message: "Failed to generate swap stats report" });
    }
  });

  // Messaging API Routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const conversations = await storage.getUserConversations(user.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const { participant2Id, swapRequestId } = req.body;
      
      if (!participant2Id) {
        return res.status(400).json({ message: "participant2Id is required" });
      }
      
      // Check if conversation already exists
      const existingConversation = await storage.getConversation(user.id, participant2Id);
      if (existingConversation) {
        return res.json(existingConversation);
      }
      
      const conversation = await storage.createConversation({
        participant1Id: user.id,
        participant2Id,
        swapRequestId
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const conversationId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user is part of this conversation
      const conversation = await storage.getConversation(user.id, "placeholder");
      // For now, skip verification and trust the user has access
      
      const messages = await storage.getConversationMessages(conversationId, page, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const conversationId = req.params.id;
      const { content, messageType = "text" } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const message = await storage.sendMessage({
        conversationId,
        senderId: user.id,
        content,
        messageType
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/conversations/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const conversationId = req.params.id;
      
      await storage.markMessagesAsRead(conversationId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Notifications API Routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const unreadOnly = req.query.unreadOnly === "true";
      const notifications = await storage.getUserNotifications(user.id, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const notificationId = req.params.id;
      
      await storage.markNotificationAsRead(notificationId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Skill Endorsements API Routes
  app.get("/api/users/:userId/endorsements", async (req, res) => {
    try {
      const userId = req.params.userId;
      const skillId = req.query.skillId ? parseInt(req.query.skillId as string) : undefined;
      
      const endorsements = await storage.getUserSkillEndorsements(userId, skillId);
      res.json(endorsements);
    } catch (error) {
      console.error("Error fetching skill endorsements:", error);
      res.status(500).json({ message: "Failed to fetch skill endorsements" });
    }
  });

  app.post("/api/users/:userId/endorsements", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const userId = req.params.userId;
      const { skillId, comment } = req.body;
      
      if (!skillId) {
        return res.status(400).json({ message: "skillId is required" });
      }
      
      if (userId === user.id) {
        return res.status(400).json({ message: "Cannot endorse your own skills" });
      }
      
      const endorsement = await storage.createSkillEndorsement({
        userId,
        skillId: parseInt(skillId),
        endorserId: user.id,
        comment
      });
      
      res.status(201).json(endorsement);
    } catch (error) {
      console.error("Error creating skill endorsement:", error);
      res.status(500).json({ message: "Failed to create skill endorsement" });
    }
  });

  app.delete("/api/endorsements/:id", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const endorsementId = req.params.id;
      
      const deleted = await storage.deleteSkillEndorsement(endorsementId, user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Endorsement not found or unauthorized" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting skill endorsement:", error);
      res.status(500).json({ message: "Failed to delete skill endorsement" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
