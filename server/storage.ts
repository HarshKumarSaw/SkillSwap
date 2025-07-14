import { type User, type InsertUser, type Skill, type UserWithSkills, type SwapRequest, type InsertSwapRequest } from "@shared/schema";
import { pool } from "./db";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersWithSkills(page?: number, limit?: number): Promise<UserWithSkills[]>;
  searchUsers(searchTerm?: string, skillFilters?: string[], availabilityFilters?: string[]): Promise<UserWithSkills[]>;
  
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

  async getUsersWithSkills(page: number = 1, limit: number = 20): Promise<UserWithSkills[]> {
    const client = await pool.connect();
    try {
      // Get all public users (removing pagination for now to keep it simple)
      const usersResult = await client.query('SELECT * FROM users WHERE is_public = true ORDER BY id');
      const users = usersResult.rows;
      console.log('Found users:', users.length);
      
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
      
      // Use a single optimized query to get all users with their skills
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
        WHERE u.is_public = true
        GROUP BY u.id, u.name, u.email, u.location, u.profile_photo, u.availability, u.is_public, u.rating, u.join_date, u.bio, u.is_admin, u.is_banned, u.skills_offered, u.skills_wanted
        ORDER BY u.id
      `;
      
      const result = await client.query(usersWithSkillsQuery);
      
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

      return usersWithSkills;
    } finally {
      client.release();
    }
  }

  async searchUsers(searchTerm?: string, skillFilters?: string[], availabilityFilters?: string[]): Promise<UserWithSkills[]> {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE is_public = true';
      const params: any[] = [];
      let paramIndex = 1;

      // Add availability filter (availability is jsonb, so we need to handle it differently)
      if (availabilityFilters && availabilityFilters.length > 0) {
        const availabilityConditions = availabilityFilters.map(filter => {
          params.push(`%${filter}%`);
          return `availability::text ILIKE $${paramIndex++}`;
        });
        whereClause += ` AND (${availabilityConditions.join(' OR ')})`;
      }

      const usersResult = await client.query(`SELECT * FROM users ${whereClause}`, params);
      const users = usersResult.rows;
      
      const usersWithSkills: UserWithSkills[] = [];
      
      for (const user of users) {
        // Get skills offered
        const offeredResult = await client.query(`
          SELECT s.id, s.name, s.category 
          FROM user_skills_offered uso 
          JOIN skills s ON uso.skill_id = s.id 
          WHERE uso.user_id = $1
        `, [user.id]);
        
        // Get skills wanted
        const wantedResult = await client.query(`
          SELECT s.id, s.name, s.category 
          FROM user_skills_wanted usw 
          JOIN skills s ON usw.skill_id = s.id 
          WHERE usw.user_id = $1
        `, [user.id]);

        usersWithSkills.push({
          id: user.id, // Keep as string since the database uses text IDs
          name: user.name,
          email: user.email,
          location: user.location,
          profilePhoto: user.profile_photo,
          availability: user.availability,
          isPublic: user.is_public,
          rating: user.rating,
          reviewCount: 0, // Default since it's not in the database
          skillsOffered: offeredResult.rows,
          skillsWanted: wantedResult.rows,
        });
      }

      let filteredUsers = usersWithSkills;

      // Apply search term filter
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => {
          const searchLower = searchTerm.toLowerCase();
          return (
            user.name.toLowerCase().includes(searchLower) ||
            user.location?.toLowerCase().includes(searchLower) ||
            user.skillsOffered.some(skill => skill.name.toLowerCase().includes(searchLower)) ||
            user.skillsWanted.some(skill => skill.name.toLowerCase().includes(searchLower))
          );
        });
      }

      // Apply skill category filters
      if (skillFilters && skillFilters.length > 0) {
        filteredUsers = filteredUsers.filter(user => {
          const hasOfferedSkill = user.skillsOffered.some(skill => 
            skillFilters.includes(skill.category)
          );
          const hasWantedSkill = user.skillsWanted.some(skill => 
            skillFilters.includes(skill.category)
          );
          return hasOfferedSkill || hasWantedSkill;
        });
      }

      return filteredUsers;
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
      const result = await client.query(
        'INSERT INTO swap_requests (requester_id, target_id, status, message) VALUES ($1, $2, $3, $4) RETURNING *',
        [request.requesterId, request.targetId, request.status, request.message]
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
        'SELECT * FROM swap_requests WHERE requester_id = $1 OR target_id = $1',
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();
