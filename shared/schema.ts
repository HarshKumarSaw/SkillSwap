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
  role: text("role").default("user"), // user, admin
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  bannedAt: text("banned_at"),
  createdAt: text("created_at").default("NOW()"),
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
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, cancelled, completed
  message: text("message"),
  createdAt: text("created_at").default("NOW()"),
  updatedAt: text("updated_at").default("NOW()"),
});

export const swapRatings = pgTable("swap_ratings", {
  id: text("id").primaryKey(),
  swapRequestId: text("swap_request_id").notNull().references(() => swapRequests.id, { onDelete: "cascade" }),
  raterId: text("rater_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ratedId: text("rated_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  feedback: text("feedback"),
  createdAt: text("created_at").default("NOW()"),
});

export const adminActions = pgTable("admin_actions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // ban_user, unban_user, reject_skill, approve_skill, send_message
  targetId: text("target_id"), // user id or skill id
  targetType: text("target_type"), // user, skill, system
  reason: text("reason"),
  metadata: jsonb("metadata"), // additional action data
  createdAt: text("created_at").default("NOW()"),
});

export const systemMessages = pgTable("system_messages", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // announcement, maintenance, update
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").default("NOW()"),
  expiresAt: text("expires_at"),
});

export const reportedContent = pgTable("reported_content", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // user, skill, swap_request
  contentId: text("content_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").default("pending"), // pending, reviewed, resolved, dismissed
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default("NOW()"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  skillsOffered: many(userSkillsOffered),
  skillsWanted: many(userSkillsWanted),
  sentRequests: many(swapRequests, { relationName: "requester" }),
  receivedRequests: many(swapRequests, { relationName: "target" }),
  ratingsGiven: many(swapRatings, { relationName: "rater" }),
  ratingsReceived: many(swapRatings, { relationName: "rated" }),
  adminActions: many(adminActions),
  systemMessages: many(systemMessages),
  reportsSubmitted: many(reportedContent, { relationName: "reporter" }),
  reportsReviewed: many(reportedContent, { relationName: "reviewer" }),
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

export const swapRequestsRelations = relations(swapRequests, ({ one, many }) => ({
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
  ratings: many(swapRatings),
}));

export const swapRatingsRelations = relations(swapRatings, ({ one }) => ({
  swapRequest: one(swapRequests, {
    fields: [swapRatings.swapRequestId],
    references: [swapRequests.id],
  }),
  rater: one(users, {
    fields: [swapRatings.raterId],
    references: [users.id],
    relationName: "rater",
  }),
  rated: one(users, {
    fields: [swapRatings.ratedId],
    references: [users.id],
    relationName: "rated",
  }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  admin: one(users, {
    fields: [adminActions.adminId],
    references: [users.id],
  }),
}));

export const systemMessagesRelations = relations(systemMessages, ({ one }) => ({
  admin: one(users, {
    fields: [systemMessages.adminId],
    references: [users.id],
  }),
}));

export const reportedContentRelations = relations(reportedContent, ({ one }) => ({
  reporter: one(users, {
    fields: [reportedContent.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  reviewer: one(users, {
    fields: [reportedContent.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
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
  createdAt: true,
  updatedAt: true,
});

export const insertSwapRatingSchema = createInsertSchema(swapRatings).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemMessageSchema = createInsertSchema(systemMessages).omit({
  id: true,
  createdAt: true,
});

export const insertReportedContentSchema = createInsertSchema(reportedContent).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type SwapRequest = typeof swapRequests.$inferSelect;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;
export type SwapRating = typeof swapRatings.$inferSelect;
export type InsertSwapRating = z.infer<typeof insertSwapRatingSchema>;
export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type SystemMessage = typeof systemMessages.$inferSelect;
export type InsertSystemMessage = z.infer<typeof insertSystemMessageSchema>;
export type ReportedContent = typeof reportedContent.$inferSelect;
export type InsertReportedContent = z.infer<typeof insertReportedContentSchema>;

// Extended types for frontend use
export type UserWithSkills = User & {
  skillsOffered: Skill[];
  skillsWanted: Skill[];
};

export type SwapRequestWithUsers = SwapRequest & {
  requester: User;
  target: User;
};

// Availability structure for better type safety
export type Availability = {
  dates?: string[]; // e.g., ["weekends", "weekdays", "everyday"]
  times?: string[]; // e.g., ["morning", "evening", "night"]
};
