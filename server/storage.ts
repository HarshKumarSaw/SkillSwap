import { type User, type InsertUser, type Skill, type UserWithSkills, type SwapRequest, type InsertSwapRequest } from "@shared/schema";
import { pool } from "./db";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersWithSkills(): Promise<UserWithSkills[]>;
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

  async getUsersWithSkills(): Promise<UserWithSkills[]> {
    const client = await pool.connect();
    try {
      // Get all public users
      const usersResult = await client.query('SELECT * FROM users WHERE is_public = true');
      const users = usersResult.rows;
      
      // For now, return users with empty skills arrays since skills tables are missing
      const usersWithSkills: UserWithSkills[] = users.map(user => ({
        ...user,
        skillsOffered: [],
        skillsWanted: [],
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

      // Add availability filter
      if (availabilityFilters && availabilityFilters.length > 0) {
        const availabilityConditions = availabilityFilters.map(filter => {
          params.push(`%${filter}%`);
          return `availability ILIKE $${paramIndex++}`;
        });
        whereClause += ` AND (${availabilityConditions.join(' OR ')})`;
      }

      const usersResult = await client.query(`SELECT * FROM users ${whereClause}`, params);
      const users = usersResult.rows;
      
      // For now, return users with empty skills arrays since skills tables are missing
      let filteredUsers: UserWithSkills[] = users.map(user => ({
        ...user,
        skillsOffered: [],
        skillsWanted: [],
      }));

      // Apply search term filter (only on name and location for now)
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => {
          const searchLower = searchTerm.toLowerCase();
          return (
            user.name.toLowerCase().includes(searchLower) ||
            user.location?.toLowerCase().includes(searchLower)
          );
        });
      }

      return filteredUsers;
    } finally {
      client.release();
    }
  }

  async getAllSkills(): Promise<Skill[]> {
    // Return empty array for now since skills table is missing
    return [];
  }

  async getSkillsByCategory(): Promise<Record<string, Skill[]>> {
    // Return empty object for now since skills table is missing
    return {};
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
