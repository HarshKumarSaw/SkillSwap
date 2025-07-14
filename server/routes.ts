import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSwapRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all users with their skills
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsersWithSkills();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Search users with filters
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q: searchTerm, skills, availability } = req.query;
      
      const skillFilters = skills ? (skills as string).split(',').filter(Boolean) : undefined;
      const availabilityFilters = availability ? (availability as string).split(',').filter(Boolean) : undefined;

      const users = await storage.searchUsers(
        searchTerm as string | undefined,
        skillFilters,
        availabilityFilters
      );
      
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
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
