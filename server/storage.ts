import { type User, type InsertUser, type Skill, type UserWithSkills, type SwapRequest, type InsertSwapRequest, type SwapRequestWithUsers, type SwapRating, type InsertSwapRating, type AdminAction, type InsertAdminAction, type SystemMessage, type InsertSystemMessage, type ReportedContent, type InsertReportedContent, type Conversation, type InsertConversation, type ConversationWithUsers, type Message, type InsertMessage, type MessageWithSender, type Notification, type InsertNotification, type SkillEndorsement, type InsertSkillEndorsement, users } from "@shared/schema";
import { pool, db } from "./db";
import { eq, and } from "drizzle-orm";

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithSkills(id: string, allowPrivate?: boolean): Promise<UserWithSkills | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  updateUserSkills(userId: string, skillsOffered: string[], skillsWanted: string[]): Promise<void>;
  getUsersWithSkills(page?: number, limit?: number): Promise<PaginatedResult<UserWithSkills>>;
  searchUsers(searchTerm?: string, skillFilters?: string[], dateFilters?: string[], timeFilters?: string[]): Promise<UserWithSkills[]>;
  
  // Authentication
  authenticateUser(email: string, password: string): Promise<User | null>;
  createUserAccount(name: string, email: string, password: string, location?: string, securityQuestion?: string, securityAnswer?: string): Promise<User>;
  
  // Password Reset
  getSecurityQuestion(email: string): Promise<string | null>;
  resetPassword(email: string, securityAnswer: string, newPassword: string): Promise<boolean>;
  
  // Skills
  getAllSkills(): Promise<Skill[]>;
  getSkillsByCategory(): Promise<Record<string, Skill[]>>;
  
  // Account Management
  deleteUserAccount(userId: string): Promise<boolean>;
  
  // Swap Requests
  createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest>;
  getUserSwapRequests(userId: string): Promise<SwapRequestWithUsers[]>;
  updateSwapRequestStatus(requestId: string, status: string, userId: string): Promise<SwapRequest>;
  deleteSwapRequest(requestId: string, userId: string): Promise<boolean>;
  
  // Ratings
  createSwapRating(rating: InsertSwapRating): Promise<SwapRating>;
  getSwapRating(swapRequestId: string, raterId: string, ratingType?: string): Promise<SwapRating | undefined>;
  getUserFeedback(userId: string): Promise<(SwapRating & { rater: User })[]>;
  updateUserRating(userId: string): Promise<void>;
  
  // Admin Functions
  getAllUsers(page?: number, limit?: number): Promise<PaginatedResult<User>>;
  deleteUserAccount(userId: string, reason: string, adminId: string): Promise<void>;
  getAllSwapRequests(page?: number, limit?: number): Promise<PaginatedResult<SwapRequestWithUsers>>;
  createAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(page?: number, limit?: number): Promise<PaginatedResult<AdminAction & { admin: User }>>;
  
  // System Messages
  createSystemMessage(message: InsertSystemMessage): Promise<SystemMessage>;
  getSystemMessages(activeOnly?: boolean): Promise<SystemMessage[]>;
  updateSystemMessage(messageId: string, data: Partial<SystemMessage>): Promise<SystemMessage>;
  deleteSystemMessage(messageId: string): Promise<boolean>;
  
  // Reports
  createReport(report: InsertReportedContent): Promise<ReportedContent>;
  getReports(status?: string, page?: number, limit?: number): Promise<PaginatedResult<ReportedContent & { reporter: User; reviewer?: User }>>;
  updateReport(reportId: string, status: string, reviewerId: string): Promise<ReportedContent>;
  
  // Messaging
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(participant1Id: string, participant2Id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<ConversationWithUsers[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string, page?: number, limit?: number): Promise<PaginatedResult<MessageWithSender>>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Skill Endorsements
  createSkillEndorsement(endorsement: InsertSkillEndorsement): Promise<SkillEndorsement>;
  getUserSkillEndorsements(userId: string, skillId?: number): Promise<(SkillEndorsement & { endorser: User; skill: Skill })[]>;
  deleteSkillEndorsement(endorsementId: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async getUserWithSkills(id: string, allowPrivate: boolean = false): Promise<UserWithSkills | undefined> {
    const client = await pool.connect();
    try {
      // Get the user - allow private profiles if requested
      const query = allowPrivate 
        ? 'SELECT * FROM users WHERE id = $1' 
        : 'SELECT * FROM users WHERE id = $1 AND is_public = true';
      const userResult = await client.query(query, [id]);
      if (userResult.rows.length === 0) {
        return undefined;
      }
      
      const user = userResult.rows[0];

      // Remove table existence check to improve performance 
      // (we know the tables exist in production)

      // Get both offered and wanted skills in a single query for better performance
      const skillsResult = await client.query(`
        SELECT 
          s.id, s.name, s.category,
          CASE 
            WHEN uso.user_id IS NOT NULL THEN 'offered'
            WHEN usw.user_id IS NOT NULL THEN 'wanted'
          END as skill_type
        FROM skills s 
        LEFT JOIN user_skills_offered uso ON s.id = uso.skill_id AND uso.user_id = $1
        LEFT JOIN user_skills_wanted usw ON s.id = usw.skill_id AND usw.user_id = $1
        WHERE uso.user_id = $1 OR usw.user_id = $1
        ORDER BY s.name
      `, [id]);

      // Separate skills by type
      const offeredSkills = skillsResult.rows.filter(row => row.skill_type === 'offered')
        .map(row => ({ id: row.id, name: row.name, category: row.category }));
      const wantedSkills = skillsResult.rows.filter(row => row.skill_type === 'wanted')
        .map(row => ({ id: row.id, name: row.name, category: row.category }));

      // Transform database field names to match TypeScript interface
      const transformedUser = {
        ...user,
        profilePhoto: user.profile_photo,
        isPublic: user.is_public,
        reviewCount: user.review_count,
        skillsOffered: offeredSkills,
        skillsWanted: wantedSkills
      };

      // Remove snake_case fields to avoid confusion
      delete transformedUser.profile_photo;
      delete transformedUser.is_public;
      delete transformedUser.review_count;

      return transformedUser;
    } finally {
      client.release();
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (name, email, location, profile_photo, availability, is_public) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [insertUser.name, insertUser.email, insertUser.location, insertUser.profilePhoto, insertUser.availability, insertUser.isPublic]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic query based on provided fields
      if (userData.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(userData.name);
      }
      if (userData.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(userData.email);
      }
      if (userData.location !== undefined) {
        fields.push(`location = $${paramIndex++}`);
        values.push(userData.location);
      }
      if (userData.bio !== undefined) {
        fields.push(`bio = $${paramIndex++}`);
        values.push(userData.bio);
      }
      if (userData.profilePhoto !== undefined) {
        fields.push(`profile_photo = $${paramIndex++}`);
        values.push(userData.profilePhoto);
      }
      if (userData.availability !== undefined) {
        fields.push(`availability = $${paramIndex++}`);
        values.push(JSON.stringify(userData.availability));
      }
      if (userData.isPublic !== undefined) {
        fields.push(`is_public = $${paramIndex++}`);
        values.push(userData.isPublic);
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        throw new Error("User not found");
      }
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateUserSkills(userId: string, skillsOffered: string[], skillsWanted: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing skills
      await client.query('DELETE FROM user_skills_offered WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_skills_wanted WHERE user_id = $1', [userId]);

      // Add offered skills
      for (const skillName of skillsOffered) {
        const skillResult = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
        if (skillResult.rows.length > 0) {
          await client.query(
            'INSERT INTO user_skills_offered (user_id, skill_id) VALUES ($1, $2)',
            [userId, skillResult.rows[0].id]
          );
        }
      }

      // Add wanted skills
      for (const skillName of skillsWanted) {
        const skillResult = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
        if (skillResult.rows.length > 0) {
          await client.query(
            'INSERT INTO user_skills_wanted (user_id, skill_id) VALUES ($1, $2)',
            [userId, skillResult.rows[0].id]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsersWithSkills(page: number = 1, limit: number = 8): Promise<PaginatedResult<UserWithSkills>> {
    const client = await pool.connect();
    try {
      // Get total count first
      const countResult = await client.query('SELECT COUNT(*) FROM users WHERE is_public = true');
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get paginated user IDs first
      const usersResult = await client.query(
        'SELECT id FROM users WHERE is_public = true ORDER BY id LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      const userIds = usersResult.rows.map(row => row.id);
      console.log('Found users:', userIds.length);
      
      // Quick check if skills tables exist
      const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('skills', 'user_skills_offered', 'user_skills_wanted')");
      const hasSkillsTable = tables.rows.some(r => r.table_name === 'skills');
      const hasOfferedTable = tables.rows.some(r => r.table_name === 'user_skills_offered');
      const hasWantedTable = tables.rows.some(r => r.table_name === 'user_skills_wanted');
      
      // Check if skills table has data
      let skillsCount = 0;
      if (hasSkillsTable) {
        const skillsCountResult = await client.query('SELECT COUNT(*) FROM skills');
        skillsCount = parseInt(skillsCountResult.rows[0].count);
      }
      
      if (!hasSkillsTable || !hasOfferedTable || !hasWantedTable || skillsCount === 0) {
        console.log('Skills tables missing, creating them...');
        
        // Drop existing tables if they have issues
        await client.query('DROP TABLE IF EXISTS user_skills_offered CASCADE');
        await client.query('DROP TABLE IF EXISTS user_skills_wanted CASCADE');
        await client.query('DROP TABLE IF EXISTS skills CASCADE');
        
        // Create tables in correct order
        await client.query(`
          CREATE TABLE skills (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL
          )
        `);
        
        await client.query(`
          CREATE TABLE user_skills_offered (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            skill_id INTEGER NOT NULL
          )
        `);
        
        await client.query(`
          CREATE TABLE user_skills_wanted (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            skill_id INTEGER NOT NULL
          )
        `);
        
        console.log('Skills tables created without foreign keys');
        
        // Populate skills table with comprehensive skills
        await client.query(`
          INSERT INTO skills (name, category) VALUES
          -- Design & Creative
          ('Graphic Design', 'Design'),
          ('UI/UX Design', 'Design'),
          ('Logo Design', 'Design'),
          ('Web Design', 'Design'),
          ('Brand Identity', 'Design'),
          ('Adobe Photoshop', 'Design'),
          ('Adobe Illustrator', 'Design'),
          ('Figma', 'Design'),
          ('Color Theory', 'Design'),
          ('Typography', 'Design'),
          ('Space Planning', 'Design'),
          ('Interior Design', 'Design'),
          
          -- Programming & Development
          ('Web Development', 'Programming'),
          ('JavaScript', 'Programming'),
          ('React', 'Programming'),
          ('Node.js', 'Programming'),
          ('Python', 'Programming'),
          ('Java', 'Programming'),
          ('PHP', 'Programming'),
          ('Mobile Development', 'Programming'),
          ('Swift', 'Programming'),
          ('Android Development', 'Programming'),
          ('Database Design', 'Programming'),
          ('API Development', 'Programming'),
          ('CSS Design', 'Programming'),
          
          -- Marketing & Business
          ('Digital Marketing', 'Marketing'),
          ('SEO', 'Marketing'),
          ('Social Media Marketing', 'Marketing'),
          ('Content Marketing', 'Marketing'),
          ('Email Marketing', 'Marketing'),
          ('PPC Advertising', 'Marketing'),
          ('Brand Strategy', 'Marketing'),
          ('Market Research', 'Marketing'),
          ('Sales Strategy', 'Marketing'),
          ('Business Development', 'Marketing'),
          
          -- Languages
          ('Spanish', 'Languages'),
          ('French', 'Languages'),
          ('German', 'Languages'),
          ('Mandarin', 'Languages'),
          ('Japanese', 'Languages'),
          ('Italian', 'Languages'),
          ('Portuguese', 'Languages'),
          ('Russian', 'Languages'),
          ('Korean', 'Languages'),
          ('Arabic', 'Languages'),
          
          -- Culinary Arts
          ('Culinary Arts', 'Culinary'),
          ('Baking', 'Culinary'),
          ('Pastry Making', 'Culinary'),
          ('Wine Pairing', 'Culinary'),
          ('Nutrition Coaching', 'Culinary'),
          ('Meal Planning', 'Culinary'),
          ('Food Photography', 'Culinary'),
          ('Food Styling', 'Culinary'),
          ('Restaurant Management', 'Culinary'),
          
          -- Fitness & Sports
          ('Personal Training', 'Fitness'),
          ('Yoga Instruction', 'Fitness'),
          ('Rock Climbing', 'Fitness'),
          ('Swimming', 'Fitness'),
          ('Marathon Running', 'Fitness'),
          ('CrossFit', 'Fitness'),
          ('Pilates', 'Fitness'),
          ('Martial Arts', 'Fitness'),
          ('Dance', 'Fitness'),
          ('Sports Coaching', 'Fitness'),
          ('Outdoor Safety', 'Fitness'),
          
          -- Music & Arts
          ('Guitar', 'Music'),
          ('Piano', 'Music'),
          ('Violin', 'Music'),
          ('Drums', 'Music'),
          ('Singing', 'Music'),
          ('Music Production', 'Music'),
          ('Sound Engineering', 'Music'),
          ('Songwriting', 'Music'),
          ('Music Theory', 'Music'),
          ('DJ Skills', 'Music'),
          
          -- Technology
          ('Data Science', 'Technology'),
          ('Machine Learning', 'Technology'),
          ('Cybersecurity', 'Technology'),
          ('Cloud Computing', 'Technology'),
          ('DevOps', 'Technology'),
          ('3D Modeling', 'Technology'),
          ('3D Printing', 'Technology'),
          ('Electronics', 'Technology'),
          ('Drone Photography', 'Technology'),
          ('Video Editing', 'Technology'),
          
          -- Crafts & Making
          ('Woodworking', 'Crafts'),
          ('Furniture Making', 'Crafts'),
          ('Pottery', 'Crafts'),
          ('Jewelry Making', 'Crafts'),
          ('Leather Working', 'Crafts'),
          ('Knitting', 'Crafts'),
          ('Sewing', 'Crafts'),
          ('Painting', 'Crafts'),
          ('Sculpture', 'Crafts'),
          ('Metalworking', 'Crafts'),
          
          -- Professional Skills
          ('Project Management', 'Professional'),
          ('Public Speaking', 'Professional'),
          ('Technical Writing', 'Professional'),
          ('Grant Writing', 'Professional'),
          ('Policy Research', 'Professional'),
          ('Data Analysis', 'Professional'),
          ('Financial Planning', 'Professional'),
          ('Teaching', 'Professional'),
          ('Coaching', 'Professional'),
          ('Consulting', 'Professional'),
          ('Debate Coaching', 'Professional'),
          ('Data Visualization', 'Professional'),
          ('Survey Design', 'Professional'),
          ('Interview Techniques', 'Professional'),
          
          -- Automotive & Mechanical
          ('Automotive Engineering', 'Automotive'),
          ('Car Restoration', 'Automotive'),
          ('Mechanical Repair', 'Automotive'),
          ('Welding', 'Automotive'),
          ('Motorcycle Maintenance', 'Automotive'),
          ('Engine Diagnostics', 'Automotive'),
          
          -- Outdoors & Adventure
          ('Hiking', 'Outdoors'),
          ('Camping', 'Outdoors'),
          ('Survival Skills', 'Outdoors'),
          ('Photography', 'Outdoors'),
          ('Travel Planning', 'Outdoors'),
          ('Surfing', 'Outdoors'),
          ('Sailing', 'Outdoors'),
          
          -- Home & Garden
          ('Plant Care', 'Home'),
          ('Sustainable Living', 'Home'),
          ('Home Renovation', 'Home'),
          ('Gardening', 'Home'),
          ('Landscaping', 'Home')
          ON CONFLICT (name) DO NOTHING
        `);
        
        console.log('Skills populated');
        
        // Now assign skills to users based on their existing data
        const allUsers = await client.query('SELECT * FROM users');
        for (const user of allUsers.rows) {
          // Extract skills from JSON arrays if they exist
          const skillsOffered = user.skills_offered || [];
          const skillsWanted = user.skills_wanted || [];
          
          // Add skills offered
          for (const skillName of skillsOffered) {
            try {
              const skill = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
              if (skill.rows.length > 0) {
                await client.query(
                  'INSERT INTO user_skills_offered (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [user.id, skill.rows[0].id]
                );
              }
            } catch (e) {
              // Skip if skill doesn't exist
            }
          }
          
          // Add skills wanted
          for (const skillName of skillsWanted) {
            try {
              const skill = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
              if (skill.rows.length > 0) {
                await client.query(
                  'INSERT INTO user_skills_wanted (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [user.id, skill.rows[0].id]
                );
              }
            } catch (e) {
              // Skip if skill doesn't exist
            }
          }
        }
        
        console.log('User skills mapped from existing data');
      }
      
      // Use a single optimized query to get paginated users with their skills
      const usersWithSkillsQuery = `
        SELECT 
          u.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', so.id,
                'name', so.name,
                'category', so.category
              )
            ) FILTER (WHERE so.id IS NOT NULL), 
            '[]'
          ) as skills_offered_json,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', sw.id,
                'name', sw.name,
                'category', sw.category
              )
            ) FILTER (WHERE sw.id IS NOT NULL), 
            '[]'
          ) as skills_wanted_json
        FROM users u
        LEFT JOIN user_skills_offered uso ON u.id::text = uso.user_id::text
        LEFT JOIN skills so ON uso.skill_id = so.id
        LEFT JOIN user_skills_wanted usw ON u.id::text = usw.user_id::text
        LEFT JOIN skills sw ON usw.skill_id = sw.id
        WHERE u.is_public = true AND u.id = ANY($1)
        GROUP BY u.id, u.name, u.email, u.location, u.profile_photo, u.availability, u.is_public, u.rating, u.join_date, u.bio, u.is_admin, u.is_banned, u.skills_offered, u.skills_wanted
        ORDER BY u.id
      `;
      
      const result = await client.query(usersWithSkillsQuery, [userIds]);
      
      const usersWithSkills: UserWithSkills[] = result.rows.map(user => ({
        id: user.id, // Keep as string since the database uses text IDs
        name: user.name,
        email: user.email,
        location: user.location,
        profilePhoto: user.profile_photo,
        availability: user.availability,
        isPublic: user.is_public,
        rating: user.rating,
        reviewCount: 0, // Default since it's not in the database
        skillsOffered: user.skills_offered_json || [],
        skillsWanted: user.skills_wanted_json || [],
      }));

      // Return paginated result
      return {
        data: usersWithSkills,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } finally {
      client.release();
    }
  }

  async searchUsers(searchTerm?: string, skillFilters?: string[], dateFilters?: string[], timeFilters?: string[]): Promise<UserWithSkills[]> {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE u.is_public = true';
      const params: any[] = [];
      let paramIndex = 1;

      // Add date availability filter using JSONB contains operator
      if (dateFilters && dateFilters.length > 0) {
        const dateConditions = dateFilters.map(filter => {
          params.push(filter);
          return `u.availability->'dates' ? $${paramIndex++}`;
        });
        whereClause += ` AND (${dateConditions.join(' OR ')})`;
      }

      // Add time availability filter using JSONB contains operator
      if (timeFilters && timeFilters.length > 0) {
        const timeConditions = timeFilters.map(filter => {
          params.push(filter);
          return `u.availability->'times' ? $${paramIndex++}`;
        });
        whereClause += ` AND (${timeConditions.join(' OR ')})`;
      }

      // Add skill category filters at the database level for better performance
      if (skillFilters && skillFilters.length > 0) {
        const skillConditions = skillFilters.map(category => {
          params.push(category);
          return `$${paramIndex++}`;
        });
        whereClause += ` AND (
          EXISTS (
            SELECT 1 FROM user_skills_offered uso 
            JOIN skills s ON uso.skill_id = s.id 
            WHERE uso.user_id = u.id AND s.category IN (${skillConditions.join(',')})
          ) OR EXISTS (
            SELECT 1 FROM user_skills_wanted usw 
            JOIN skills s ON usw.skill_id = s.id 
            WHERE usw.user_id = u.id AND s.category IN (${skillConditions.join(',')})
          )
        )`;
      }

      // Single optimized query to get all users with their skills
      const usersWithSkillsQuery = `
        SELECT 
          u.id, u.name, u.email, u.location, u.profile_photo, u.availability, u.is_public, u.rating,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', so.id,
                'name', so.name,
                'category', so.category
              )
            ) FILTER (WHERE so.id IS NOT NULL), 
            '[]'
          ) as skills_offered_json,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', sw.id,
                'name', sw.name,
                'category', sw.category
              )
            ) FILTER (WHERE sw.id IS NOT NULL), 
            '[]'
          ) as skills_wanted_json
        FROM users u
        LEFT JOIN user_skills_offered uso ON u.id = uso.user_id
        LEFT JOIN skills so ON uso.skill_id = so.id
        LEFT JOIN user_skills_wanted usw ON u.id = usw.user_id
        LEFT JOIN skills sw ON usw.skill_id = sw.id
        ${whereClause}
        GROUP BY u.id, u.name, u.email, u.location, u.profile_photo, u.availability, u.is_public, u.rating
        ORDER BY u.id
      `;
      
      const result = await client.query(usersWithSkillsQuery, params);
      
      let usersWithSkills: UserWithSkills[] = result.rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        location: user.location,
        profilePhoto: user.profile_photo,
        availability: user.availability,
        isPublic: user.is_public,
        rating: user.rating,
        reviewCount: 0, // Default since it's not in the database
        skillsOffered: user.skills_offered_json || [],
        skillsWanted: user.skills_wanted_json || [],
      }));

      // Apply search term filter if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        usersWithSkills = usersWithSkills.filter(user => {
          return (
            user.name.toLowerCase().includes(searchLower) ||
            user.location?.toLowerCase().includes(searchLower) ||
            user.skillsOffered.some(skill => skill.name.toLowerCase().includes(searchLower)) ||
            user.skillsWanted.some(skill => skill.name.toLowerCase().includes(searchLower))
          );
        });
      }

      return usersWithSkills;
    } finally {
      client.release();
    }
  }

  async getAllSkills(): Promise<Skill[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM skills ORDER BY category, name');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getSkillsByCategory(): Promise<Record<string, Skill[]>> {
    const allSkills = await this.getAllSkills();
    return allSkills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>);
  }

  async createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest> {
    const client = await pool.connect();
    try {
      // First, delete any existing pending swap request from the same sender to the same receiver
      const deleteResult = await client.query(
        'DELETE FROM swap_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
        [request.requesterId, request.targetId, 'pending']
      );
      
      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        console.log(`Deleted ${deleteResult.rowCount} existing pending swap request(s) from ${request.requesterId} to ${request.targetId}`);
      }
      
      // Generate a unique ID for the swap request
      const requestId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO swap_requests (id, sender_id, receiver_id, sender_skill, receiver_skill, status, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [requestId, request.requesterId, request.targetId, request.senderSkill, request.receiverSkill, request.status || 'pending', request.message]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserSwapRequests(userId: string): Promise<SwapRequestWithUsers[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          sr.*,
          requester.id as requester_id, requester.name as requester_name, requester.email as requester_email, requester.profile_photo as requester_photo,
          target.id as target_id, target.name as target_name, target.email as target_email, target.profile_photo as target_photo
        FROM swap_requests sr
        JOIN users requester ON sr.sender_id = requester.id
        JOIN users target ON sr.receiver_id = target.id
        WHERE sr.sender_id = $1 OR sr.receiver_id = $1
        ORDER BY sr.created_at DESC
      `, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        requesterId: row.sender_id,
        targetId: row.receiver_id,
        senderSkill: row.sender_skill,
        receiverSkill: row.receiver_skill,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        requester: {
          id: row.requester_id,
          name: row.requester_name,
          email: row.requester_email,
          profilePhoto: row.requester_photo,
        },
        target: {
          id: row.target_id,
          name: row.target_name,
          email: row.target_email,
          profilePhoto: row.target_photo,
        }
      }));
    } finally {
      client.release();
    }
  }

  async updateSwapRequestStatus(requestId: string, status: string, userId: string): Promise<SwapRequest> {
    const client = await pool.connect();
    try {
      // Verify user has permission to update this request
      const checkResult = await client.query(
        'SELECT * FROM swap_requests WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
        [requestId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        throw new Error('Unauthorized to update this swap request');
      }
      
      const result = await client.query(
        'UPDATE swap_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, requestId]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateSwapRequest(requestId: string, updates: { senderSkill?: string; receiverSkill?: string; message?: string }, userId: string): Promise<SwapRequest> {
    const client = await pool.connect();
    try {
      // Verify user is the sender of this request and it's still pending
      const checkResult = await client.query(
        'SELECT * FROM swap_requests WHERE id = $1 AND sender_id = $2 AND status = \'pending\'',
        [requestId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        throw new Error('Unauthorized to update this swap request or request is not pending');
      }

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      if (updates.senderSkill !== undefined) {
        setClause.push(`sender_skill = $${paramIndex++}`);
        values.push(updates.senderSkill);
      }
      if (updates.receiverSkill !== undefined) {
        setClause.push(`receiver_skill = $${paramIndex++}`);
        values.push(updates.receiverSkill);
      }
      if (updates.message !== undefined) {
        setClause.push(`message = $${paramIndex++}`);
        values.push(updates.message);
      }

      if (setClause.length === 0) {
        throw new Error('No updates provided');
      }

      setClause.push(`updated_at = NOW()`);
      values.push(requestId);

      const result = await client.query(
        `UPDATE swap_requests SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteSwapRequest(requestId: string, userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      // Only allow sender to delete their own request, or receiver to delete pending requests
      const result = await client.query(
        'DELETE FROM swap_requests WHERE id = $1 AND (sender_id = $2 OR (receiver_id = $2 AND status = \'pending\')) RETURNING id',
        [requestId, userId]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async canGiveFeedback(currentUserId: string, targetUserId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      // Check if there's at least one accepted swap request between the users
      const result = await client.query(
        'SELECT 1 FROM swap_requests WHERE status = $1 AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)) LIMIT 1',
        ['accepted', currentUserId, targetUserId]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async createSwapRating(rating: InsertSwapRating): Promise<SwapRating> {
    const client = await pool.connect();
    try {
      const ratingId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO swap_ratings (id, swap_request_id, rater_id, rated_id, rating, feedback, rating_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
        [ratingId, rating.swapRequestId, rating.raterId, rating.ratedId, rating.rating, rating.feedback, rating.ratingType || 'post_request']
      );
      
      // Update the rated user's overall rating
      await this.updateUserRating(rating.ratedId);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSwapRating(swapRequestId: string, raterId: string, ratingType?: string): Promise<SwapRating | undefined> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM swap_ratings WHERE swap_request_id = $1 AND rater_id = $2';
      let params = [swapRequestId, raterId];
      
      if (ratingType) {
        query += ' AND rating_type = $3';
        params.push(ratingType);
      }
      
      const result = await client.query(query, params);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async getUserFeedback(userId: string): Promise<(SwapRating & { rater: User })[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          sr.id, sr.swap_request_id, sr.rater_id, sr.rated_id, sr.rating, 
          sr.feedback, sr.rating_type, sr.created_at,
          u.id as rater_id, u.name as rater_name, u.profile_photo as rater_photo
        FROM swap_ratings sr
        JOIN users u ON sr.rater_id = u.id
        WHERE sr.rated_id = $1 AND sr.feedback IS NOT NULL
        ORDER BY sr.created_at DESC
      `, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        swapRequestId: row.swap_request_id,
        raterId: row.rater_id,
        ratedId: row.rated_id,
        rating: row.rating,
        feedback: row.feedback,
        ratingType: row.rating_type,
        createdAt: row.created_at,
        rater: {
          id: row.rater_id,
          name: row.rater_name,
          profilePhoto: row.rater_photo
        }
      }));
    } finally {
      client.release();
    }
  }

  async updateUserRating(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as review_count FROM swap_ratings WHERE rated_id = $1',
        [userId]
      );
      
      const { avg_rating, review_count } = result.rows[0];
      
      await client.query(
        'UPDATE users SET rating = $1, review_count = $2 WHERE id = $3',
        [avg_rating || 0, review_count || 0, userId]
      );
    } finally {
      client.release();
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND password = $2',
        [email, password]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createUserAccount(name: string, email: string, password: string, location?: string, securityQuestion?: string, securityAnswer?: string): Promise<User> {
    const client = await pool.connect();
    try {
      // Generate a unique user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        `INSERT INTO users (id, name, email, password, location, profile_photo, availability, is_public, rating, join_date, bio, is_admin, is_banned, security_question, security_answer) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
         RETURNING *`,
        [
          userId,
          name,
          email,
          password,
          location || null,
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
          JSON.stringify({ dates: ["weekends"], times: ["evening"] }),
          true,
          "0.0",
          new Date(),
          `New user on skill swap platform`,
          false,
          false,
          securityQuestion || null,
          securityAnswer || null
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSecurityQuestion(email: string): Promise<string | null> {
    try {
      const result = await db.select({ securityQuestion: users.securityQuestion })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return result[0]?.securityQuestion || null;
    } catch (error) {
      console.error('Error getting security question:', error);
      return null;
    }
  }

  async resetPassword(email: string, securityAnswer: string, newPassword: string): Promise<boolean> {
    try {
      // Check if the security answer matches
      const userResult = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), eq(users.securityAnswer, securityAnswer)))
        .limit(1);
      
      if (userResult.length === 0) {
        return false; // Incorrect answer or email
      }

      // Update the password
      await db.update(users)
        .set({ password: newPassword })
        .where(eq(users.email, email));
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }

  // Admin Functions
  async getAllUsers(page: number = 1, limit: number = 20): Promise<PaginatedResult<User>> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get users
      const result = await client.query(`
        SELECT * FROM users 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      return {
        data: result.rows,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      };
    } finally {
      client.release();
    }
  }

  async deleteUserAccount(userId: string, reason: string, adminId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete all user-related data in the correct order to avoid foreign key constraints
      console.log(`Admin deletion: Deleting account for user ${userId} by admin ${adminId}`);
      
      // Delete user notifications
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      console.log(`Admin deletion: Deleted notifications for user ${userId}`);
      
      // Delete user messages
      await client.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
      console.log(`Admin deletion: Deleted messages from user ${userId}`);
      
      // Delete conversations where user is participant
      await client.query('DELETE FROM conversations WHERE participant1_id = $1 OR participant2_id = $1', [userId]);
      console.log(`Admin deletion: Deleted conversations for user ${userId}`);
      
      // Delete swap ratings given by or about the user
      await client.query('DELETE FROM swap_ratings WHERE rater_id = $1 OR rated_user_id = $1', [userId]);
      console.log(`Admin deletion: Deleted swap ratings for user ${userId}`);
      
      // Delete swap requests involving the user
      await client.query('DELETE FROM swap_requests WHERE requester_id = $1 OR target_id = $1', [userId]);
      console.log(`Admin deletion: Deleted swap requests for user ${userId}`);
      
      // Delete user skills
      await client.query('DELETE FROM user_skills_offered WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_skills_wanted WHERE user_id = $1', [userId]);
      console.log(`Admin deletion: Deleted skills for user ${userId}`);
      
      // Delete skill endorsements
      await client.query('DELETE FROM skill_endorsements WHERE endorser_id = $1 OR endorsed_user_id = $1', [userId]);
      console.log(`Admin deletion: Deleted skill endorsements for user ${userId}`);
      
      // Delete reported content by the user
      await client.query('DELETE FROM reported_content WHERE reporter_id = $1', [userId]);
      console.log(`Admin deletion: Deleted reports by user ${userId}`);
      
      // Finally, delete the user account
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log(`Admin deletion: Deleted user account ${userId}`);
      
      // Log admin action
      const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await client.query(
        'INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, reason, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [actionId, adminId, 'delete_user', userId, 'user', reason]
      );
      
      console.log(`Admin deletion: Logged admin action for user ${userId} deletion`);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Admin deletion error for user ${userId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllSwapRequests(page: number = 1, limit: number = 20): Promise<PaginatedResult<SwapRequestWithUsers>> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM swap_requests');
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get swap requests with user details
      const result = await client.query(`
        SELECT 
          sr.*,
          requester.id as requester_id, requester.name as requester_name, requester.email as requester_email, requester.profile_photo as requester_photo,
          target.id as target_id, target.name as target_name, target.email as target_email, target.profile_photo as target_photo
        FROM swap_requests sr
        JOIN users requester ON sr.sender_id = requester.id
        JOIN users target ON sr.receiver_id = target.id
        ORDER BY sr.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const swapRequests = result.rows.map(row => ({
        id: row.id,
        requesterId: row.sender_id,
        targetId: row.receiver_id,
        senderSkill: row.sender_skill,
        receiverSkill: row.receiver_skill,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        requester: {
          id: row.requester_id,
          name: row.requester_name,
          email: row.requester_email,
          profilePhoto: row.requester_photo,
        },
        target: {
          id: row.target_id,
          name: row.target_name,
          email: row.target_email,
          profilePhoto: row.target_photo,
        }
      }));
      
      return {
        data: swapRequests,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      };
    } finally {
      client.release();
    }
  }

  async createAdminAction(action: InsertAdminAction): Promise<AdminAction> {
    const client = await pool.connect();
    try {
      const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, reason, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
        [actionId, action.adminId, action.action, action.targetId, action.targetType, action.reason, action.metadata]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getAdminActions(page: number = 1, limit: number = 20): Promise<PaginatedResult<AdminAction & { admin: User }>> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM admin_actions');
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get admin actions with admin details
      const result = await client.query(`
        SELECT 
          aa.*,
          u.id as admin_user_id, u.name as admin_name, u.email as admin_email
        FROM admin_actions aa
        JOIN users u ON aa.admin_id = u.id
        ORDER BY aa.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const actions = result.rows.map(row => ({
        id: row.id,
        adminId: row.admin_id,
        action: row.action,
        targetId: row.target_id,
        targetType: row.target_type,
        reason: row.reason,
        metadata: row.metadata,
        createdAt: row.created_at,
        admin: {
          id: row.admin_user_id,
          name: row.admin_name,
          email: row.admin_email,
        }
      }));
      
      return {
        data: actions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      };
    } finally {
      client.release();
    }
  }

  async createSystemMessage(message: InsertSystemMessage): Promise<SystemMessage> {
    const client = await pool.connect();
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO system_messages (id, admin_id, title, message, type, is_active, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
        [messageId, message.adminId, message.title, message.message, message.type, message.isActive, message.expiresAt]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSystemMessages(activeOnly: boolean = false): Promise<SystemMessage[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM system_messages';
      const params: any[] = [];
      
      if (activeOnly) {
        query += ' WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())';
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateSystemMessage(messageId: string, data: Partial<SystemMessage>): Promise<SystemMessage> {
    const client = await pool.connect();
    try {
      const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = Object.values(data);
      
      const result = await client.query(
        `UPDATE system_messages SET ${fields} WHERE id = $1 RETURNING *`,
        [messageId, ...values]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteSystemMessage(messageId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM system_messages WHERE id = $1 RETURNING id', [messageId]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async createReport(report: InsertReportedContent): Promise<ReportedContent> {
    const client = await pool.connect();
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO reported_content (id, reporter_id, content_type, content_id, reason, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
        [reportId, report.reporterId, report.contentType, report.contentId, report.reason, report.description, report.status || 'pending']
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getReports(status?: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<ReportedContent & { reporter: User; reviewer?: User }>> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      // Build query conditions
      let whereClause = '';
      const params = [limit, offset];
      if (status) {
        whereClause = 'WHERE rc.status = $3';
        params.push(status);
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM reported_content rc ${whereClause}`;
      const countResult = await client.query(countQuery, status ? [status] : []);
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get reports with user details
      const result = await client.query(`
        SELECT 
          rc.*,
          reporter.id as reporter_id, reporter.name as reporter_name, reporter.email as reporter_email,
          reviewer.id as reviewer_id, reviewer.name as reviewer_name, reviewer.email as reviewer_email
        FROM reported_content rc
        JOIN users reporter ON rc.reporter_id = reporter.id
        LEFT JOIN users reviewer ON rc.reviewed_by = reviewer.id
        ${whereClause}
        ORDER BY rc.created_at DESC
        LIMIT $1 OFFSET $2
      `, params);
      
      const reports = result.rows.map(row => ({
        id: row.id,
        reporterId: row.reporter_id,
        contentType: row.content_type,
        contentId: row.content_id,
        reason: row.reason,
        description: row.description,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        reporter: {
          id: row.reporter_id,
          name: row.reporter_name,
          email: row.reporter_email,
        },
        reviewer: row.reviewer_id ? {
          id: row.reviewer_id,
          name: row.reviewer_name,
          email: row.reviewer_email,
        } : undefined
      }));
      
      return {
        data: reports,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      };
    } finally {
      client.release();
    }
  }

  async updateReport(reportId: string, status: string, reviewerId: string): Promise<ReportedContent> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE reported_content SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
        [status, reviewerId, reportId]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Messaging Methods
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const client = await pool.connect();
    try {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        'INSERT INTO conversations (id, participant1_id, participant2_id, swap_request_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [conversationId, conversation.participant1Id, conversation.participant2Id, conversation.swapRequestId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getConversation(participant1Id: string, participant2Id: string): Promise<Conversation | undefined> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM conversations WHERE (participant1_id = $1 AND participant2_id = $2) OR (participant1_id = $2 AND participant2_id = $1)',
        [participant1Id, participant2Id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserConversations(userId: string): Promise<ConversationWithUsers[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          c.*,
          u1.id as p1_id, u1.name as p1_name, u1.email as p1_email, u1.profile_photo as p1_photo,
          u2.id as p2_id, u2.name as p2_name, u2.email as p2_email, u2.profile_photo as p2_photo,
          lm.content as last_message_content, lm.created_at as last_message_time,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) as unread_count
        FROM conversations c
        JOIN users u1 ON c.participant1_id = u1.id
        JOIN users u2 ON c.participant2_id = u2.id
        LEFT JOIN messages lm ON lm.id = (
          SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
        )
        WHERE c.participant1_id = $1 OR c.participant2_id = $1
        ORDER BY c.last_message_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        participant1Id: row.participant1_id,
        participant2Id: row.participant2_id,
        swapRequestId: row.swap_request_id,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        participant1: { 
          id: row.p1_id, 
          name: row.p1_name, 
          email: row.p1_email, 
          profilePhoto: row.p1_photo 
        },
        participant2: { 
          id: row.p2_id, 
          name: row.p2_name, 
          email: row.p2_email, 
          profilePhoto: row.p2_photo 
        },
        lastMessage: row.last_message_content ? {
          content: row.last_message_content,
          createdAt: row.last_message_time
        } : undefined,
        unreadCount: parseInt(row.unread_count) || 0
      }));
    } finally {
      client.release();
    }
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const client = await pool.connect();
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        'INSERT INTO messages (id, conversation_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [messageId, message.conversationId, message.senderId, message.content, message.messageType || 'text']
      );
      
      // Update conversation last message time
      await client.query(
        'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
        [message.conversationId]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<PaginatedResult<MessageWithSender>> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      const countResult = await client.query('SELECT COUNT(*) as total FROM messages WHERE conversation_id = $1', [conversationId]);
      const totalCount = parseInt(countResult.rows[0].total);
      
      const result = await client.query(`
        SELECT 
          m.*,
          u.id as sender_id, u.name as sender_name, u.email as sender_email, u.profile_photo as sender_photo
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [conversationId, limit, offset]);

      const messages = result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        messageType: row.message_type,
        isRead: row.is_read,
        createdAt: row.created_at,
        sender: {
          id: row.sender_id,
          name: row.sender_name,
          email: row.sender_email,
          profilePhoto: row.sender_photo
        }
      }));

      return {
        data: messages,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      };
    } finally {
      client.release();
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false',
        [conversationId, userId]
      );
    } finally {
      client.release();
    }
  }

  // Notification Methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const client = await pool.connect();
    try {
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [notificationId, notification.userId, notification.type, notification.title, notification.content, notification.relatedId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM notifications WHERE user_id = $1';
      if (unreadOnly) {
        query += ' AND is_read = false';
      }
      query += ' ORDER BY created_at DESC LIMIT 50';
      
      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
    } finally {
      client.release();
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  // Skill Endorsement Methods
  async createSkillEndorsement(endorsement: InsertSkillEndorsement): Promise<SkillEndorsement> {
    const client = await pool.connect();
    try {
      const endorsementId = `endorse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        'INSERT INTO skill_endorsements (id, user_id, skill_id, endorser_id, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [endorsementId, endorsement.userId, endorsement.skillId, endorsement.endorserId, endorsement.comment]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserSkillEndorsements(userId: string, skillId?: number): Promise<(SkillEndorsement & { endorser: User; skill: Skill })[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          se.*,
          u.id as endorser_id, u.name as endorser_name, u.email as endorser_email, u.profile_photo as endorser_photo,
          s.id as skill_id, s.name as skill_name, s.category as skill_category
        FROM skill_endorsements se
        JOIN users u ON se.endorser_id = u.id
        JOIN skills s ON se.skill_id = s.id
        WHERE se.user_id = $1
      `;
      
      const params = [userId];
      if (skillId) {
        query += ' AND se.skill_id = $2';
        params.push(skillId.toString());
      }
      
      query += ' ORDER BY se.created_at DESC';
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        skillId: row.skill_id,
        endorserId: row.endorser_id,
        comment: row.comment,
        createdAt: row.created_at,
        endorser: {
          id: row.endorser_id,
          name: row.endorser_name,
          email: row.endorser_email,
          profilePhoto: row.endorser_photo
        },
        skill: {
          id: row.skill_id,
          name: row.skill_name,
          category: row.skill_category
        }
      }));
    } finally {
      client.release();
    }
  }

  async deleteSkillEndorsement(endorsementId: string, userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM skill_endorsements WHERE id = $1 AND endorser_id = $2 RETURNING id',
        [endorsementId, userId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Delete user's skill endorsements (both given and received)
      await client.query('DELETE FROM skill_endorsements WHERE endorser_id = $1 OR user_id = $1', [userId]);
      
      // Delete user's skill associations
      await client.query('DELETE FROM user_skills_offered WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_skills_wanted WHERE user_id = $1', [userId]);
      
      // Delete user's swap requests (both sent and received)
      await client.query('DELETE FROM swap_requests WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      
      // Delete user's swap ratings (both given and received)
      await client.query('DELETE FROM swap_ratings WHERE rater_id = $1 OR rated_id = $1', [userId]);
      
      // Delete user's conversations and messages
      await client.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
      await client.query('DELETE FROM conversations WHERE participant1_id = $1 OR participant2_id = $1', [userId]);
      
      // Delete user's notifications
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      
      // Delete user's reports (both made and received)
      await client.query('DELETE FROM reported_content WHERE reporter_id = $1', [userId]);
      
      // Delete user's admin actions (if any)
      await client.query('DELETE FROM admin_actions WHERE admin_id = $1', [userId]);
      
      // Delete user's system message creations (if any)
      await client.query('DELETE FROM system_messages WHERE admin_id = $1', [userId]);
      
      // Finally, delete the user account
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();
