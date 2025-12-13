import { Router } from "express";
import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";

const router = Router();

// bcrypt configuration - cost factor of 12 is secure and performant
const BCRYPT_ROUNDS = 12;

// Debug endpoint to test if routes are working
router.get("/debug", async (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    vercel: process.env.VERCEL === "1",
    databaseUrl: process.env.DATABASE_URL ? "set" : "not set",
  });
});

/**
 * Hash password using bcrypt with secure cost factor
 * Returns a bcrypt hash string (includes salt automatically)
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against stored hash
 * Supports both new bcrypt format and legacy SHA-256 format for migration
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }

  // Legacy SHA-256 format: "hash:salt"
  const [hash, salt] = storedHash.split(':');
  if (!hash || !salt) return false;

  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  } catch {
    return false;
  }
}

/**
 * Check if a stored hash is using the legacy format and needs upgrade
 */
function isLegacyHash(storedHash: string): boolean {
  return !storedHash.startsWith('$2');
}

/**
 * Upgrade a user's password hash from legacy SHA-256 to bcrypt
 */
async function upgradePasswordHash(userId: number, newHash: string): Promise<void> {
  try {
    await db.updateUserPassword(userId, newHash);
    console.log(`[Auth] Upgraded password hash for user ${userId} to bcrypt`);
  } catch (error) {
    console.error(`[Auth] Failed to upgrade password hash for user ${userId}:`, error);
  }
}

// POST /api/auth/signup - Create new account with email/password
router.post("/signup", async (req, res) => {
  try {
    console.log("[Auth] Signup request received");
    console.log("[Auth] req.body:", JSON.stringify(req.body));
    console.log("[Auth] req.body type:", typeof req.body);

    const { email, password, name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await db.createUserWithPassword({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
    });

    if (!user) {
      return res.status(500).json({ error: "Failed to create account" });
    }

    // Create session token
    const sessionToken = await sdk.createSessionToken(
      `email_${user.id}`,
      { name: user.name || "User" }
    );

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    console.log("[Auth] Email signup successful for:", email);

    return res.json({
      success: true,
      isNewUser: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("[Auth] Signup error:", error);
    console.error("[Auth] Signup error name:", error instanceof Error ? error.name : 'unknown');
    console.error("[Auth] Signup error message:", error instanceof Error ? error.message : String(error));
    return res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/login - Login with email/password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user has a password (might have signed up with Google)
    if (!user.password) {
      return res.status(401).json({
        error: "This account uses Google Sign-In. Please use Google to log in."
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Upgrade legacy SHA-256 hash to bcrypt on successful login
    if (isLegacyHash(user.password)) {
      const newHash = await hashPassword(password);
      await upgradePasswordHash(user.id, newHash);
    }

    // Update last signed in
    await db.upsertUser({
      email: user.email!,
      lastSignedIn: new Date(),
    });

    // Create session token
    const sessionToken = await sdk.createSessionToken(
      `email_${user.id}`,
      { name: user.name || "User" }
    );

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    console.log("[Auth] Email login successful for:", email);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

export const emailAuthRouter = router;
