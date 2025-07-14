import { type User, type InsertUser, type Skill, type UserWithSkills, type SwapRequest, type InsertSwapRequest } from "@shared/schema";
import { pool } from "./db";

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
  getUserWithSkills(id: string): Promise<UserWithSkills | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  updateUserSkills(userId: string, skillsOffered: string[], skillsWanted: string[]): Promise<void>;
  getUsersWithSkills(page?: number, limit?: number): Promise<PaginatedResult<UserWithSkills>>;
  searchUsers(searchTerm?: string, skillFilters?: string[], dateFilters?: string[], timeFilters?: string[]): Promise<UserWithSkills[]>;
  
  // Authentication
  authenticateUser(email: string, password: string): Promise<User | null>;
  createUserAccount(name: string, email: string, password: string, location?: string): Promise<User>;
  
  // Skills
  getAllSkills(): Promise<Skill[]>;
  getSkillsByCategory(): Promise<Record<string, Skill[]>>;
  
  // Swap Requests
  createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest>;
  getUserSwapRequests(userId: number): Promise<SwapRequest[]>;
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

  async getUserWithSkills(id: string): Promise<UserWithSkills | undefined> {
    const client = await pool.connect();
    try {
      // Get the user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 AND is_public = true', [id]);
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
      // Generate a unique ID for the swap request
      const requestId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        'INSERT INTO swap_requests (id, sender_id, receiver_id, status, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [requestId, request.requesterId, request.targetId, request.status || 'pending', request.message]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserSwapRequests(userId: number): Promise<SwapRequest[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM swap_requests WHERE sender_id = $1 OR receiver_id = $1',
        [userId]
      );
      return result.rows;
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

  async createUserAccount(name: string, email: string, password: string, location?: string): Promise<User> {
    const client = await pool.connect();
    try {
      // Generate a unique user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(
        `INSERT INTO users (id, name, email, password, location, profile_photo, availability, is_public, rating, join_date, bio, is_admin, is_banned) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
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
          false
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();
