import { pgTable, text, serial, integer, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // For authentication
  location: text("location"),
  profilePhoto: text("profile_photo"),
  availability: jsonb("availability"), // e.g., { dates: ["weekends", "weekdays"], times: ["morning", "evening"] }
  isPublic: boolean("is_public").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
});

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // e.g., "Design", "Programming", "Marketing"
});

export const userSkillsOffered = pgTable("user_skills_offered", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillId: integer("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
});

export const userSkillsWanted = pgTable("user_skills_wanted", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillId: integer("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
});

export const swapRequests = pgTable("swap_requests", {
  id: text("id").primaryKey(),
  requesterId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetId: text("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderSkill: text("sender_skill"),
  receiverSkill: text("receiver_skill"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, cancelled
  message: text("message"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  skillsOffered: many(userSkillsOffered),
  skillsWanted: many(userSkillsWanted),
  sentRequests: many(swapRequests, { relationName: "requester" }),
  receivedRequests: many(swapRequests, { relationName: "target" }),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  offeredBy: many(userSkillsOffered),
  wantedBy: many(userSkillsWanted),
}));

export const userSkillsOfferedRelations = relations(userSkillsOffered, ({ one }) => ({
  user: one(users, {
    fields: [userSkillsOffered.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [userSkillsOffered.skillId],
    references: [skills.id],
  }),
}));

export const userSkillsWantedRelations = relations(userSkillsWanted, ({ one }) => ({
  user: one(users, {
    fields: [userSkillsWanted.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [userSkillsWanted.skillId],
    references: [skills.id],
  }),
}));

export const swapRequestsRelations = relations(swapRequests, ({ one }) => ({
  requester: one(users, {
    fields: [swapRequests.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  target: one(users, {
    fields: [swapRequests.targetId],
    references: [users.id],
    relationName: "target",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  reviewCount: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
});

export const insertSwapRequestSchema = createInsertSchema(swapRequests).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type SwapRequest = typeof swapRequests.$inferSelect;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;

// Extended types for frontend use
export type UserWithSkills = User & {
  skillsOffered: Skill[];
  skillsWanted: Skill[];
};

// Availability structure for better type safety
export type Availability = {
  dates?: string[]; // e.g., ["weekends", "weekdays", "everyday"]
  times?: string[]; // e.g., ["morning", "evening", "night"]
};
