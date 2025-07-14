import { users, skills, userSkillsOffered, userSkillsWanted, swapRequests, type User, type InsertUser, type Skill, type UserWithSkills, type SwapRequest, type InsertSwapRequest } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, inArray } from "drizzle-orm";

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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsersWithSkills(): Promise<UserWithSkills[]> {
    const usersWithSkills = await db.query.users.findMany({
      where: eq(users.isPublic, true),
      with: {
        skillsOffered: {
          with: {
            skill: true,
          },
        },
        skillsWanted: {
          with: {
            skill: true,
          },
        },
      },
    });

    return usersWithSkills.map(user => ({
      ...user,
      skillsOffered: user.skillsOffered.map(so => so.skill),
      skillsWanted: user.skillsWanted.map(sw => sw.skill),
    }));
  }

  async searchUsers(searchTerm?: string, skillFilters?: string[], availabilityFilters?: string[]): Promise<UserWithSkills[]> {
    let whereConditions = [eq(users.isPublic, true)];

    // Add availability filter
    if (availabilityFilters && availabilityFilters.length > 0) {
      const availabilityConditions = availabilityFilters.map(filter => 
        ilike(users.availability, `%${filter}%`)
      );
      whereConditions.push(or(...availabilityConditions)!);
    }

    const usersWithSkills = await db.query.users.findMany({
      where: and(...whereConditions),
      with: {
        skillsOffered: {
          with: {
            skill: true,
          },
        },
        skillsWanted: {
          with: {
            skill: true,
          },
        },
      },
    });

    let filteredUsers = usersWithSkills.map(user => ({
      ...user,
      skillsOffered: user.skillsOffered.map(so => so.skill),
      skillsWanted: user.skillsWanted.map(sw => sw.skill),
    }));

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
        return user.skillsOffered.some(skill => 
          skillFilters.includes(skill.category)
        );
      });
    }

    return filteredUsers;
  }

  async getAllSkills(): Promise<Skill[]> {
    return await db.select().from(skills);
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
    const [swapRequest] = await db
      .insert(swapRequests)
      .values(request)
      .returning();
    return swapRequest;
  }

  async getUserSwapRequests(userId: number): Promise<SwapRequest[]> {
    return await db
      .select()
      .from(swapRequests)
      .where(or(
        eq(swapRequests.requesterId, userId),
        eq(swapRequests.targetId, userId)
      ));
  }
}

export const storage = new DatabaseStorage();
