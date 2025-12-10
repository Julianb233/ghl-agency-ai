import { Router } from "express";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";

const router = Router();

// Simple password hashing using PBKDF2-like approach with SHA-256
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + useSalt)
    .digest('hex');
  return { hash, salt: useSalt };
}

function verifyPassword(password: string, storedHash: string): boolean {
  // storedHash format: "hash:salt"
  const [hash, salt] = storedHash.split(':');
  if (!hash || !salt) return false;

  const { hash: computedHash } = hashPassword(password, salt);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  } catch {
    return false;
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

    // Hash password
    const { hash, salt } = hashPassword(password);
    const storedPassword = `${hash}:${salt}`;

    // Create user
    const user = await db.createUserWithPassword({
      email,
      password: storedPassword,
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
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
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
