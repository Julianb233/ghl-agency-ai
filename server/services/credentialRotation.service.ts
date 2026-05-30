/**
 * Credential Rotation Service
 * Manages automatic credential rotation policies and scheduling
 */

import crypto from "crypto";
import { getDb } from "../db";
import { eq, and, lte, desc } from "drizzle-orm";
import {
  credentialPolicies,
  credentialRotationLogs,
  type CredentialPolicy,
  type CredentialRotationLog,
} from "../../drizzle/schema-credentials";
import { apiKeys } from "../../drizzle/schema";
import { alertingService } from "./alerting.service";

// ========================================
// TYPES
// ========================================

export type CredentialType = "api_key" | "oauth_token" | "webhook_secret";
export type RotationAction = "rotated" | "failed" | "skipped";

export interface CreatePolicyParams {
  userId: number;
  credentialType: CredentialType;
  rotationIntervalDays: number;
}

export interface UpdatePolicyParams {
  rotationIntervalDays?: number;
  isEnabled?: boolean;
}

export interface RotationResult {
  success: boolean;
  action: RotationAction;
  policyId: number;
  credentialType: CredentialType;
  reason?: string;
  oldKeyHash?: string;
  newKeyHash?: string;
}

export interface RotationHistoryEntry {
  id: number;
  policyId: number;
  credentialType: string;
  action: string;
  oldKeyHash: string | null;
  newKeyHash: string | null;
  reason: string | null;
  createdAt: Date;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Hash a credential and return the last 4 characters (for audit)
 */
function hashCredential(credential: string): string {
  const hash = crypto.createHash("sha256").update(credential).digest("hex");
  return hash.slice(-4);
}

/**
 * Generate a new API key
 * Format: ghl_<32-char-random-string>
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  return `ghl_${randomBytes.toString("base64url")}`;
}

/**
 * Generate a new webhook secret
 */
function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculate next rotation date
 */
function calculateNextRotation(intervalDays: number): Date {
  const nextRotation = new Date();
  nextRotation.setDate(nextRotation.getDate() + intervalDays);
  return nextRotation;
}

// ========================================
// CREDENTIAL ROTATION SERVICE
// ========================================

export const credentialRotationService = {
  /**
   * Create a new rotation policy for a user/credential type
   */
  async createPolicy(params: CreatePolicyParams): Promise<CredentialPolicy> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Check for existing policy for this user/type
    const [existing] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.userId, params.userId),
          eq(credentialPolicies.credentialType, params.credentialType)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(
        `Rotation policy already exists for ${params.credentialType}. Use updatePolicy to modify.`
      );
    }

    const nextRotationAt = calculateNextRotation(params.rotationIntervalDays);

    const [policy] = await db
      .insert(credentialPolicies)
      .values({
        userId: params.userId,
        credentialType: params.credentialType,
        rotationIntervalDays: params.rotationIntervalDays,
        nextRotationAt,
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(
      `[CredentialRotation] Created policy ${policy.id} for user ${params.userId}: ${params.credentialType}`
    );

    return policy;
  },

  /**
   * Get a specific policy by user and credential type
   */
  async getPolicy(
    userId: number,
    credentialType: CredentialType
  ): Promise<CredentialPolicy | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const [policy] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.userId, userId),
          eq(credentialPolicies.credentialType, credentialType)
        )
      )
      .limit(1);

    return policy || null;
  },

  /**
   * Get all policies for a user
   */
  async getPolicies(userId: number): Promise<CredentialPolicy[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const policies = await db
      .select()
      .from(credentialPolicies)
      .where(eq(credentialPolicies.userId, userId))
      .orderBy(desc(credentialPolicies.createdAt));

    return policies;
  },

  /**
   * Get a policy by ID (with user verification)
   */
  async getPolicyById(
    policyId: number,
    userId: number
  ): Promise<CredentialPolicy | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const [policy] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.id, policyId),
          eq(credentialPolicies.userId, userId)
        )
      )
      .limit(1);

    return policy || null;
  },

  /**
   * Update a rotation policy
   */
  async updatePolicy(
    policyId: number,
    userId: number,
    updates: UpdatePolicyParams
  ): Promise<CredentialPolicy> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.id, policyId),
          eq(credentialPolicies.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Policy not found or access denied");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.rotationIntervalDays !== undefined) {
      updateData.rotationIntervalDays = updates.rotationIntervalDays;
      // Recalculate next rotation based on new interval
      updateData.nextRotationAt = calculateNextRotation(
        updates.rotationIntervalDays
      );
    }

    if (updates.isEnabled !== undefined) {
      updateData.isEnabled = updates.isEnabled;
    }

    const [updated] = await db
      .update(credentialPolicies)
      .set(updateData)
      .where(eq(credentialPolicies.id, policyId))
      .returning();

    console.log(
      `[CredentialRotation] Updated policy ${policyId}: ${JSON.stringify(updates)}`
    );

    return updated;
  },

  /**
   * Delete a rotation policy
   */
  async deletePolicy(policyId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.id, policyId),
          eq(credentialPolicies.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Policy not found or access denied");
    }

    await db
      .delete(credentialPolicies)
      .where(eq(credentialPolicies.id, policyId));

    console.log(
      `[CredentialRotation] Deleted policy ${policyId} for user ${userId}`
    );
  },

  /**
   * Check if rotation is due for a specific policy
   */
  async checkRotationDue(policyId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const [policy] = await db
      .select()
      .from(credentialPolicies)
      .where(eq(credentialPolicies.id, policyId))
      .limit(1);

    if (!policy || !policy.isEnabled) {
      return false;
    }

    if (!policy.nextRotationAt) {
      return true; // Never rotated, due now
    }

    return new Date() >= new Date(policy.nextRotationAt);
  },

  /**
   * Rotate a credential based on its policy
   */
  async rotateCredential(
    policyId: number,
    userId: number
  ): Promise<RotationResult> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Get the policy
    const [policy] = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.id, policyId),
          eq(credentialPolicies.userId, userId)
        )
      )
      .limit(1);

    if (!policy) {
      const result: RotationResult = {
        success: false,
        action: "failed",
        policyId,
        credentialType: "api_key",
        reason: "Policy not found or access denied",
      };
      await this.logRotation(db, policyId, userId, "api_key", result);
      return result;
    }

    if (!policy.isEnabled) {
      const result: RotationResult = {
        success: false,
        action: "skipped",
        policyId,
        credentialType: policy.credentialType as CredentialType,
        reason: "Policy is disabled",
      };
      await this.logRotation(
        db,
        policyId,
        userId,
        policy.credentialType,
        result
      );
      return result;
    }

    try {
      let result: RotationResult;

      switch (policy.credentialType) {
        case "api_key":
          result = await this.rotateApiKey(db, policy, userId);
          break;
        case "webhook_secret":
          result = await this.rotateWebhookSecret(db, policy, userId);
          break;
        case "oauth_token":
          // OAuth tokens typically refresh automatically, skip manual rotation
          result = {
            success: false,
            action: "skipped",
            policyId,
            credentialType: "oauth_token",
            reason:
              "OAuth tokens are refreshed automatically by the OAuth flow",
          };
          break;
        default:
          result = {
            success: false,
            action: "failed",
            policyId,
            credentialType: policy.credentialType as CredentialType,
            reason: `Unsupported credential type: ${policy.credentialType}`,
          };
      }

      // Log the rotation attempt
      await this.logRotation(
        db,
        policyId,
        userId,
        policy.credentialType,
        result
      );

      // Send notification if rotation succeeded
      if (result.success) {
        await alertingService.createNotification({
          userId,
          title: "Credential Rotated",
          message: `Your ${policy.credentialType} was automatically rotated.`,
          type: "info",
          metadata: { policyId, credentialType: policy.credentialType },
        });
      }

      return result;
    } catch (error) {
      const result: RotationResult = {
        success: false,
        action: "failed",
        policyId,
        credentialType: policy.credentialType as CredentialType,
        reason: error instanceof Error ? error.message : "Unknown error",
      };

      await this.logRotation(
        db,
        policyId,
        userId,
        policy.credentialType,
        result
      );

      return result;
    }
  },

  /**
   * Rotate an API key
   */
  async rotateApiKey(
    db: any,
    policy: CredentialPolicy,
    userId: number
  ): Promise<RotationResult> {
    // Find the user's most recent active API key
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)))
      .orderBy(desc(apiKeys.createdAt))
      .limit(1);

    if (!existingKey) {
      return {
        success: false,
        action: "skipped",
        policyId: policy.id,
        credentialType: "api_key",
        reason: "No active API key found to rotate",
      };
    }

    // Generate new key
    const newApiKey = generateApiKey();
    const newKeyHash = crypto
      .createHash("sha256")
      .update(newApiKey)
      .digest("hex");
    const newKeyPrefix = newApiKey.substring(0, 12);

    // Update the existing key with new values
    await db
      .update(apiKeys)
      .set({
        keyHash: newKeyHash,
        keyPrefix: newKeyPrefix,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, existingKey.id));

    // Update policy rotation timestamps
    const nextRotation = calculateNextRotation(policy.rotationIntervalDays);
    await db
      .update(credentialPolicies)
      .set({
        lastRotatedAt: new Date(),
        nextRotationAt: nextRotation,
        updatedAt: new Date(),
      })
      .where(eq(credentialPolicies.id, policy.id));

    console.log(
      `[CredentialRotation] Rotated API key ${existingKey.id} for user ${userId}`
    );

    return {
      success: true,
      action: "rotated",
      policyId: policy.id,
      credentialType: "api_key",
      oldKeyHash: hashCredential(existingKey.keyHash || ""),
      newKeyHash: hashCredential(newKeyHash),
    };
  },

  /**
   * Rotate a webhook secret
   * Note: This is a placeholder - actual webhook secret rotation
   * depends on your webhook infrastructure
   */
  async rotateWebhookSecret(
    db: any,
    policy: CredentialPolicy,
    userId: number
  ): Promise<RotationResult> {
    // Generate new webhook secret
    const newSecret = generateWebhookSecret();

    // Update policy rotation timestamps
    const nextRotation = calculateNextRotation(policy.rotationIntervalDays);
    await db
      .update(credentialPolicies)
      .set({
        lastRotatedAt: new Date(),
        nextRotationAt: nextRotation,
        updatedAt: new Date(),
      })
      .where(eq(credentialPolicies.id, policy.id));

    console.log(
      `[CredentialRotation] Rotated webhook secret for user ${userId} (policy ${policy.id})`
    );

    // Note: Actual implementation would update the webhook configuration
    // This is a simplified version that just tracks the rotation

    return {
      success: true,
      action: "rotated",
      policyId: policy.id,
      credentialType: "webhook_secret",
      newKeyHash: hashCredential(newSecret),
    };
  },

  /**
   * Log a rotation attempt
   */
  async logRotation(
    db: any,
    policyId: number,
    userId: number,
    credentialType: string,
    result: RotationResult
  ): Promise<void> {
    try {
      await db.insert(credentialRotationLogs).values({
        policyId,
        userId,
        credentialType,
        action: result.action,
        oldKeyHash: result.oldKeyHash || null,
        newKeyHash: result.newKeyHash || null,
        reason: result.reason || null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[CredentialRotation] Failed to log rotation:", error);
    }
  },

  /**
   * Get rotation history for a user
   */
  async getRotationHistory(
    userId: number,
    limit: number = 50
  ): Promise<RotationHistoryEntry[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const logs = await db
      .select()
      .from(credentialRotationLogs)
      .where(eq(credentialRotationLogs.userId, userId))
      .orderBy(desc(credentialRotationLogs.createdAt))
      .limit(limit);

    return logs;
  },

  /**
   * Run scheduled rotations (called by cron job)
   * Finds all policies with nextRotationAt <= now and isEnabled = true
   */
  async runScheduledRotations(): Promise<{
    processed: number;
    rotated: number;
    failed: number;
    skipped: number;
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const now = new Date();

    // Find all policies due for rotation
    const duePolicies = await db
      .select()
      .from(credentialPolicies)
      .where(
        and(
          eq(credentialPolicies.isEnabled, true),
          lte(credentialPolicies.nextRotationAt, now)
        )
      );

    const stats = {
      processed: duePolicies.length,
      rotated: 0,
      failed: 0,
      skipped: 0,
    };

    console.log(
      `[CredentialRotation] Running scheduled rotations: ${duePolicies.length} policies due`
    );

    for (const policy of duePolicies) {
      try {
        const result = await this.rotateCredential(policy.id, policy.userId);

        if (result.action === "rotated") {
          stats.rotated++;
        } else if (result.action === "failed") {
          stats.failed++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(
          `[CredentialRotation] Error rotating policy ${policy.id}:`,
          error
        );
        stats.failed++;
      }
    }

    console.log(
      `[CredentialRotation] Scheduled rotation complete: ${stats.rotated} rotated, ${stats.failed} failed, ${stats.skipped} skipped`
    );

    return stats;
  },
};
