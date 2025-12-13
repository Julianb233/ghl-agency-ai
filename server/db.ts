import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema";
import { InsertUser, InsertUserProfile, users, userProfiles } from "../drizzle/schema";
import { ENV } from './_core/env';

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      console.warn("[Database] DATABASE_URL not set, database operations will fail");
      return null;
    }

    try {
      console.log('[Database] Attempting to connect...');
      console.log('[Database] URL present:', !!dbUrl);
      console.log('[Database] URL type:', typeof dbUrl);
      console.log('[Database] URL length:', dbUrl.length);
      console.log('[Database] URL prefix:', dbUrl.substring(0, 25) + '...');

      // Try creating pool with the connection string
      _pool = new Pool({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      console.log('[Database] Pool created, testing connection...');

      // Test connection
      const testClient = await _pool.connect();
      console.log('[Database] Connection test successful!');
      testClient.release();

      _db = drizzle(_pool, { schema });
      console.log('[Database] Drizzle ORM initialized successfully');

    } catch (error) {
      console.error("[Database] Connection failed!");
      console.error("[Database] Error:", error);
      console.error("[Database] Error type:", error instanceof Error ? error.constructor.name : typeof error);
      if (error instanceof Error) {
        console.error("[Database] Error message:", error.message);
        console.error("[Database] Error stack:", error.stack?.substring(0, 500));
      }

      if (_pool) {
        try {
          await _pool.end();
        } catch (e) {
          console.error("[Database] Error closing pool:", e);
        }
        _pool = null;
      }
      _db = null;
    }
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.googleId) {
    throw new Error("User openId or googleId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {};
    if (user.openId) values.openId = user.openId;
    if (user.googleId) values.googleId = user.googleId;

    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "password", "googleId", "openId"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    // Always update updatedAt on conflict
    updateSet.updatedAt = new Date();

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Determine conflict target
    const target = user.googleId ? users.googleId : users.openId;

    await db.insert(users).values(values).onConflictDoUpdate({
      target: target!,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<typeof users.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(users).values({
      email: data.email,
      password: data.password,
      name: data.name || null,
      loginMethod: 'email',
      role: 'user',
      lastSignedIn: new Date(),
    }).returning();

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    throw error;
  }
}

// User Profile functions for onboarding data

export async function createUserProfile(data: InsertUserProfile): Promise<typeof userProfiles.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user profile: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(userProfiles).values(data).returning();
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create user profile:", error);
    throw error;
  }
}

export async function getUserProfile(userId: number): Promise<typeof userProfiles.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user profile: database not available");
    return undefined;
  }

  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<typeof userProfiles.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user profile: database not available");
    return undefined;
  }

  try {
    const result = await db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    throw error;
  }
}

export async function upsertUserProfile(data: InsertUserProfile): Promise<typeof userProfiles.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user profile: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(userProfiles).values(data)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to upsert user profile:", error);
    throw error;
  }
}

export async function markOnboardingComplete(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark onboarding complete: database not available");
    return;
  }

  try {
    await db.update(users)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to mark onboarding complete:", error);
    throw error;
  }
}

export async function updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user password: database not available");
    return;
  }

  try {
    await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user password:", error);
    throw error;
  }
}

// Export pool for raw SQL queries (used by MCP database tools)
export async function getPool(): Promise<pg.Pool | null> {
  if (!_pool) {
    await getDb(); // Initialize pool via getDb
  }
  return _pool;
}

// TODO: add feature queries here as your schema grows.
