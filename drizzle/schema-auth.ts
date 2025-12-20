/**
 * Authentication Enhancement Schema
 *
 * Additional tables to support email/password authentication:
 * - Password reset tokens
 * - Email verification tokens
 * - Login attempt tracking for security
 *
 * Import these in your main schema.ts file to enable full auth features.
 */

import { pgTable, serial, text, timestamp, varchar, integer, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Password Reset Tokens
 * Manages password reset flow with expiring tokens
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  /**
   * Cryptographically secure token (hashed before storage)
   * Generate: crypto.randomBytes(32).toString('hex')
   * Hash: await bcrypt.hash(token, 10)
   */
  token: text("token").notNull().unique(),

  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"), // null if not yet used

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("password_reset_user_id_idx").on(table.userId),
  tokenIdx: index("password_reset_token_idx").on(table.token),
  expiresAtIdx: index("password_reset_expires_at_idx").on(table.expiresAt),
}));

/**
 * Email Verification Tokens
 * Manages email verification flow
 */
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  /**
   * Verification token (hashed before storage)
   * Generate: crypto.randomBytes(32).toString('hex')
   */
  token: text("token").notNull().unique(),

  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"), // null if not yet verified

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("email_verification_user_id_idx").on(table.userId),
  tokenIdx: index("email_verification_token_idx").on(table.token),
  expiresAtIdx: index("email_verification_expires_at_idx").on(table.expiresAt),
}));

/**
 * Login Attempts
 * Track login attempts for rate limiting and security monitoring
 */
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(), // IPv4 or IPv6
  userAgent: text("userAgent"),

  success: boolean("success").notNull(),
  failureReason: varchar("failureReason", { length: 100 }), // 'invalid_password' | 'user_not_found' | 'account_suspended'

  attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("login_attempts_email_idx").on(table.email),
  ipAddressIdx: index("login_attempts_ip_idx").on(table.ipAddress),
  emailAttemptedAtIdx: index("login_attempts_email_attempted_at_idx").on(table.email, table.attemptedAt),
  attemptedAtIdx: index("login_attempts_attempted_at_idx").on(table.attemptedAt),
}));

// ========================================
// TypeScript Types
// ========================================

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// ========================================
// Authentication Helper Types
// ========================================

/**
 * Credentials for email/password login
 */
export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

/**
 * User registration data
 */
export interface UserRegistration {
  email: string;
  password: string;
  name?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Email verification request
 */
export interface EmailVerificationRequest {
  token: string;
}
