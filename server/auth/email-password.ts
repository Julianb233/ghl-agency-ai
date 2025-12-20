/**
 * Email/Password Authentication Helpers
 *
 * Utilities for implementing email/password authentication using the schema
 * defined in drizzle/schema.ts and drizzle/schema-auth.ts
 *
 * Features:
 * - User registration with password hashing
 * - Login with email and password
 * - Password reset flow
 * - Email verification
 * - Login attempt tracking
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../db";
import {
  users,
  passwordResetTokens,
  emailVerificationTokens,
  loginAttempts,
  type UserRegistration,
  type EmailPasswordCredentials,
} from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

// ========================================
// Configuration
// ========================================

const BCRYPT_ROUNDS = 10;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 72;
const MAX_LOGIN_ATTEMPTS_PER_HOUR = 5;

// ========================================
// User Registration
// ========================================

/**
 * Register a new user with email and password
 * Automatically hashes the password and creates an email verification token
 */
export async function registerUser(data: UserRegistration) {
  // Hash the password
  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create the user
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      name: data.name,
      loginMethod: "email",
    })
    .returning();

  // Generate email verification token
  const verificationToken = await createEmailVerificationToken(user.id);

  return {
    user,
    verificationToken: verificationToken.token, // Send this in email
  };
}

// ========================================
// Login
// ========================================

/**
 * Authenticate user with email and password
 * Tracks login attempts and enforces rate limiting
 */
export async function loginWithEmailPassword(
  credentials: EmailPasswordCredentials,
  ipAddress: string,
  userAgent?: string
): Promise<{ success: true; user: typeof users.$inferSelect } | { success: false; reason: string }> {
  const email = credentials.email.toLowerCase().trim();

  // Check rate limiting
  const recentAttempts = await checkLoginAttempts(email, ipAddress);
  if (recentAttempts >= MAX_LOGIN_ATTEMPTS_PER_HOUR) {
    await trackLoginAttempt(email, ipAddress, false, "rate_limited", userAgent);
    return { success: false, reason: "too_many_attempts" };
  }

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.loginMethod, "email")))
    .limit(1);

  if (!user) {
    await trackLoginAttempt(email, ipAddress, false, "user_not_found", userAgent);
    return { success: false, reason: "invalid_credentials" };
  }

  // Check if account is suspended
  if (user.suspendedAt) {
    await trackLoginAttempt(email, ipAddress, false, "account_suspended", userAgent);
    return { success: false, reason: "account_suspended" };
  }

  // Verify password
  if (!user.password) {
    await trackLoginAttempt(email, ipAddress, false, "no_password_set", userAgent);
    return { success: false, reason: "invalid_credentials" };
  }

  const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

  if (!isPasswordValid) {
    await trackLoginAttempt(email, ipAddress, false, "invalid_password", userAgent);
    return { success: false, reason: "invalid_credentials" };
  }

  // Successful login
  await trackLoginAttempt(email, ipAddress, true, null, userAgent);

  // Update last signed in timestamp
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return { success: true, user };
}

// ========================================
// Password Reset
// ========================================

/**
 * Create a password reset token for a user
 * Returns the unhashed token to send via email
 */
export async function createPasswordResetToken(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), eq(users.loginMethod, "email")))
    .limit(1);

  if (!user) {
    // Don't reveal if user exists
    throw new Error("If the email exists, a reset link will be sent");
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, BCRYPT_ROUNDS);

  // Store token
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: hashedToken,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(token: string, newPassword: string) {
  // Find valid token
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(gt(passwordResetTokens.expiresAt, new Date()), eq(passwordResetTokens.usedAt, null)))
    .limit(100); // Get all unexpired tokens

  if (!resetToken) {
    throw new Error("Invalid or expired token");
  }

  // Verify token hash
  const isValidToken = await bcrypt.compare(token, resetToken.token);
  if (!isValidToken) {
    throw new Error("Invalid token");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update user password
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, resetToken.userId));

  // Mark token as used
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));

  return { success: true };
}

// ========================================
// Email Verification
// ========================================

/**
 * Create an email verification token
 */
async function createEmailVerificationToken(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, BCRYPT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS);

  await db.insert(emailVerificationTokens).values({
    userId,
    token: hashedToken,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Verify email using token
 */
export async function verifyEmail(token: string) {
  const [verificationToken] = await db
    .select()
    .from(emailVerificationTokens)
    .where(and(gt(emailVerificationTokens.expiresAt, new Date()), eq(emailVerificationTokens.verifiedAt, null)))
    .limit(100);

  if (!verificationToken) {
    throw new Error("Invalid or expired token");
  }

  const isValidToken = await bcrypt.compare(token, verificationToken.token);
  if (!isValidToken) {
    throw new Error("Invalid token");
  }

  // Mark email as verified
  await db.update(emailVerificationTokens).set({ verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, verificationToken.id));

  // Update user - you may want to add an emailVerified field to the users table
  // await db.update(users).set({ emailVerified: true }).where(eq(users.id, verificationToken.userId));

  return { success: true, userId: verificationToken.userId };
}

// ========================================
// Login Attempt Tracking
// ========================================

/**
 * Track a login attempt
 */
async function trackLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
  failureReason: string | null,
  userAgent?: string
) {
  await db.insert(loginAttempts).values({
    email: email.toLowerCase().trim(),
    ipAddress,
    userAgent,
    success,
    failureReason,
  });
}

/**
 * Check recent login attempts for rate limiting
 */
async function checkLoginAttempts(email: string, ipAddress: string): Promise<number> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const attempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email.toLowerCase().trim()),
        eq(loginAttempts.ipAddress, ipAddress),
        gt(loginAttempts.attemptedAt, oneHourAgo),
        eq(loginAttempts.success, false)
      )
    );

  return attempts.length;
}

// ========================================
// Password Validation
// ========================================

/**
 * Validate password strength
 * Returns array of error messages, empty if valid
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
