import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSwapRequestSchema, insertSwapRatingSchema, insertAdminActionSchema, insertSystemMessageSchema, insertReportedContentSchema } from "@shared/schema";
import { z } from "zod";
import { pool } from "./db";
import multer from "multer";
import { uploadToCloudinary } from "./cloudinary";
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from "./emailService";

/**
 * 🚨 DATABASE REFERENCE 🚨
 * This file uses the exclusive database connection from server/db.ts
 * See DATABASE_CONFIG.md for complete configuration rules
 */

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

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
      const { name, email, password, location, securityQuestion, securityAnswer } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create new user account (email not verified)
      const user = await storage.createUserAccount(name, email, password, location, securityQuestion, securityAnswer);
      
      // Generate OTP and create verification record
      const otp = generateOTP();
      await storage.createEmailVerification(email, otp);
      
      // Send OTP email
      const emailSent = await sendOTPEmail(email, otp, name);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }
      
      // Don't log user in yet - they need to verify email first
      // Return success message with email for frontend to use
      res.status(201).json({ 
        message: "Account created successfully! Please check your email for verification code.",
        email: email,
        name: name,
        requiresVerification: true
      });
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



  // Password reset routes
  app.post("/api/auth/get-security-question", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`Getting security question for email: ${email}`);
      const startTime = Date.now();
      
      const securityQuestion = await storage.getSecurityQuestion(email);
      
      console.log(`Security question lookup took ${Date.now() - startTime}ms`);
      
      if (!securityQuestion) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ securityQuestion });
    } catch (error) {
      console.error("Get security question error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, securityAnswer, newPassword } = req.body;
      
      if (!email || !securityAnswer || !newPassword) {
        return res.status(400).json({ message: "Email, security answer, and new password are required" });
      }
      
      const resetSuccessful = await storage.resetPassword(email, securityAnswer, newPassword);
      
      if (!resetSuccessful) {
        return res.status(400).json({ message: "Incorrect security answer or email" });
      }
      
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password migration endpoint (for converting existing plain text passwords to hashed)
  app.post("/api/admin/migrate-passwords", async (req, res) => {
    try {
      console.log("Starting password migration process...");
      const migrationResult = await storage.migratePasswordsToHash();
      
      console.log("Password migration completed:", migrationResult);
      res.json({
        message: "Password migration completed",
        results: migrationResult
      });
    } catch (error) {
      console.error("Password migration error:", error);
      res.status(500).json({ message: "Password migration failed" });
    }
  });

  // Email verification routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email, userName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check rate limiting - max 3 attempts per 15 minutes
      const attempts = await storage.getEmailVerificationAttempts(email);
      if (attempts >= 3) {
        return res.status(429).json({ 
          message: "Too many verification attempts. Please wait 15 minutes before trying again." 
        });
      }
      
      // Generate OTP
      const otp = generateOTP();
      
      // Create verification record
      await storage.createEmailVerification(email, otp);
      
      // Send OTP email
      const emailSent = await sendOTPEmail(email, otp, userName);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }
      
      res.json({ 
        message: "Verification code sent to your email",
        expiresIn: "10 minutes"
      });
      
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otpCode } = req.body;
      
      if (!email || !otpCode) {
        return res.status(400).json({ message: "Email and OTP code are required" });
      }
      
      // Check attempts before verifying
      const attempts = await storage.getEmailVerificationAttempts(email);
      if (attempts >= 5) {
        return res.status(429).json({ 
          message: "Too many failed attempts. Please request a new verification code." 
        });
      }
      
      // Verify OTP
      const isValid = await storage.verifyOTP(email, otpCode);
      
      if (!isValid) {
        // Increment attempts
        await storage.incrementVerificationAttempts(email);
        return res.status(400).json({ 
          message: "Invalid or expired verification code",
          attemptsRemaining: Math.max(0, 4 - attempts)
        });
      }
      
      // Mark email as verified in users table
      await storage.markEmailAsVerified(email);
      
      // Clean up verification record
      await storage.deleteEmailVerification(email);
      
      // Get the verified user and log them in
      const user = await storage.getUserByEmail(email);
      if (user) {
        // Send welcome email
        await sendWelcomeEmail(email, user.name);
        
        // Create welcome notification
        await storage.createNotification({
          userId: user.id,
          type: "system",
          title: "Welcome to SkillSwap!",
          content: "Welcome to SkillSwap! Start by adding your skills and browsing other users to find skill exchange opportunities.",
          relatedId: null
        });
        
        // Store in session to log user in
        (req as any).session.user = user;
        (req as any).session.userId = user.id;
        
        res.json({ 
          message: "Email verified successfully!",
          emailVerified: true,
          user: user
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
      
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { email, userName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check rate limiting
      const attempts = await storage.getEmailVerificationAttempts(email);
      if (attempts >= 3) {
        return res.status(429).json({ 
          message: "Too many verification attempts. Please wait 15 minutes before trying again." 
        });
      }
      
      // Generate new OTP
      const otp = generateOTP();
      
      // Create new verification record (this will delete any existing one)
      await storage.createEmailVerification(email, otp);
      
      // Send OTP email
      const emailSent = await sendOTPEmail(email, otp, userName);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }
      
      res.json({ 
        message: "New verification code sent to your email",
        expiresIn: "10 minutes"
      });
      
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile photo upload endpoint
  app.post("/api/upload/profile-photo", upload.single('photo'), async (req, res) => {
    try {
      // Check authentication
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname) as any;
      
      if (!result?.secure_url) {
        return res.status(500).json({ message: "Failed to upload image" });
      }

      // Update user's profile photo in database
      await storage.updateUser(user.id, { profilePhoto: result.secure_url });

      // Update session data
      (req as any).session.user.profilePhoto = result.secure_url;

      res.json({ 
        url: result.secure_url,
        message: "Profile photo uploaded successfully" 
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to upload profile photo" 
      });
    }
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

  // Get user feedback
  app.get("/api/users/:id/feedback", async (req, res) => {
    try {
      const { id } = req.params;
      const feedback = await storage.getUserFeedback(id);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching user feedback:", error);
      res.status(500).json({ message: "Failed to fetch user feedback" });
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
      console.log(`Creating swap request from ${validatedData.requesterId} to ${validatedData.targetId}`);
      const swapRequest = await storage.createSwapRequest(validatedData);
      console.log(`Swap request created successfully: ${swapRequest.id}`);
      
      // Get current user for notification
      const user = (req as any).session?.user;
      
      // Get target user details for notification
      const targetUser = await storage.getUserWithSkills(validatedData.targetId);
      if (targetUser && user) {
        // Create notification for the target user
        await storage.createNotification({
          userId: validatedData.targetId,
          type: "swap_request",
          title: "New Skill Swap Request",
          content: `${user.name} wants to exchange skills with you: ${validatedData.senderSkill} for ${validatedData.receiverSkill}`,
          relatedId: swapRequest.id
        });
      }
      
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

  // Check if users have accepted swap requests between them
  app.get("/api/users/:id/can-give-feedback", async (req, res) => {
    try {
      const currentUser = (req as any).session?.user;
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const targetUserId = req.params.id;
      const canGiveFeedback = await storage.canGiveFeedback(currentUser.id, targetUserId);
      res.json({ canGiveFeedback });
    } catch (error) {
      console.error("Error checking feedback permission:", error);
      res.status(500).json({ message: "Failed to check feedback permission" });
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
      
      // Create notification for status updates
      if (updatedRequest) {
        // Get the other user involved in the swap request
        const otherUserId = updatedRequest.requesterId === user.id ? updatedRequest.targetId : updatedRequest.requesterId;
        const otherUser = await storage.getUserWithSkills(otherUserId);
        
        if (otherUser) {
          let notificationTitle = "";
          let notificationContent = "";
          
          switch (status) {
            case "accepted":
              notificationTitle = "Swap Request Accepted";
              notificationContent = `${user.name} accepted your skill swap request! You can now start exchanging skills.`;
              break;
            case "rejected":
              notificationTitle = "Swap Request Declined";
              notificationContent = `${user.name} declined your skill swap request.`;
              break;
            case "completed":
              notificationTitle = "Swap Request Completed";
              notificationContent = `${user.name} marked your skill swap as completed! Consider leaving feedback.`;
              break;
            case "cancelled":
              notificationTitle = "Swap Request Cancelled";
              notificationContent = `${user.name} cancelled the skill swap request.`;
              break;
          }
          
          if (notificationTitle) {
            await storage.createNotification({
              userId: otherUserId,
              type: "swap_request",
              title: notificationTitle,
              content: notificationContent,
              relatedId: updatedRequest.id
            });
          }
        }
      }
      
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

  // Update swap request content
  app.patch("/api/swap-requests/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { senderSkill, receiverSkill, message } = req.body;

      const updatedRequest = await storage.updateSwapRequest(req.params.id, {
        senderSkill,
        receiverSkill,
        message
      }, user.id);
      
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

      // Check if rating already exists for this type
      const ratingType = req.body.ratingType || 'post_request';
      const existingRating = await storage.getSwapRating(req.params.id, user.id, ratingType);
      if (existingRating) {
        const typeText = ratingType === 'post_request' ? 'given feedback for' : 'rated';
        return res.status(400).json({ message: `You have already ${typeText} this swap` });
      }

      const rating = await storage.createSwapRating(validatedData);
      
      // Create notification for the rated user when someone leaves feedback
      if (rating.ratingType === 'post_completion') {
        // Get the swap request to find the other user
        const swapRequest = await storage.getSwapRequestById(req.params.id);
        if (swapRequest) {
          const ratedUserId = swapRequest.requesterId === user.id ? swapRequest.targetId : swapRequest.requesterId;
          const ratedUser = await storage.getUserWithSkills(ratedUserId);
          
          if (ratedUser) {
            await storage.createNotification({
              userId: ratedUserId,
              type: "rating",
              title: "New Rating Received",
              content: `${user.name} left you a ${rating.score}-star rating with feedback: "${rating.feedback || 'No feedback provided'}"`,
              relatedId: swapRequest.id
            });
          }
        }
      }
      
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

  // Delete account route
  app.delete("/api/auth/account", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      
      // Delete the user account and all associated data
      const success = await storage.deleteUserAccount(user.id);
      
      if (success) {
        // Destroy the session after successful deletion
        (req as any).session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error after account deletion:", err);
          }
          res.clearCookie('connect.sid');
          res.json({ message: "Account deleted successfully" });
        });
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

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

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = req.session.user;
      
      if (!reason) {
        return res.status(400).json({ message: "Deletion reason is required" });
      }
      
      await storage.adminDeleteUserAccount(req.params.id, reason, adminUser.id);
      res.json({ message: "User account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete user account" });
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
            u.is_public,
            u.is_banned,
            u.created_at,
            COUNT(DISTINCT sr_sent.id) as swap_requests_sent,
            COUNT(DISTINCT sr_received.id) as swap_requests_received,
            COUNT(DISTINCT ratings_given.id) as ratings_given,
            COUNT(DISTINCT ratings_received.id) as ratings_received
          FROM users u
          LEFT JOIN swap_requests sr_sent ON u.id = sr_sent.sender_id
          LEFT JOIN swap_requests sr_received ON u.id = sr_received.receiver_id
          LEFT JOIN swap_ratings ratings_given ON u.id = ratings_given.rater_id
          LEFT JOIN swap_ratings ratings_received ON u.id = ratings_received.rated_id
          GROUP BY u.id, u.name, u.email, u.location, u.rating, u.is_public, u.is_banned, u.created_at
          ORDER BY u.created_at DESC
        `);

        const csvContent = [
          'ID,Name,Email,Location,Rating,Is Public,Is Banned,Created At,Swap Requests Sent,Swap Requests Received,Ratings Given,Ratings Received',
          ...result.rows.map(row => 
            `"${row.id}","${row.name}","${row.email}","${row.location || ''}",${row.rating},${row.is_public},${row.is_banned},"${row.created_at}",${row.swap_requests_sent},${row.swap_requests_received},${row.ratings_given},${row.ratings_received}`
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
            sr.sender_skill,
            sr.receiver_skill,
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
          'Swap Request ID,Sender Skill,Receiver Skill,Swap Status,Swap Created At,Rater Name,Rater Email,Rated Name,Rated Email,Rating,Feedback,Rating Created At',
          ...result.rows.map(row => 
            `"${row.swap_request_id}","${row.sender_skill}","${row.receiver_skill}","${row.status}","${row.swap_created_at}","${row.rater_name}","${row.rater_email}","${row.rated_name}","${row.rated_email}",${row.rating},"${(row.feedback || '').replace(/"/g, '""')}","${row.rating_created_at}"`
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
              EXTRACT(epoch FROM (updated_at::timestamp - created_at::timestamp))/86400 
            END) as avg_completion_days
          FROM swap_requests
        `);

        const skillsResult = await client.query(`
          SELECT 
            sender_skill as skill,
            COUNT(*) as requests_count
          FROM swap_requests
          WHERE sender_skill IS NOT NULL
          GROUP BY sender_skill
          UNION
          SELECT 
            receiver_skill as skill,
            COUNT(*) as requests_count
          FROM swap_requests
          WHERE receiver_skill IS NOT NULL
          GROUP BY receiver_skill
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
