/**
 * Credential Vault Service
 * Secure credential storage with AES-256-GCM encryption
 *
 * Security Features:
 * - Encryption at rest using AES-256-GCM
 * - Credentials never logged or exposed in responses
 * - Strict user isolation (users can only access their own credentials)
 * - Audit logging for all access
 * - Automatic credential redaction from error messages
 *
 * Usage:
 * - Store credentials: await credentialVault.storeCredential(userId, 'gmail', { username, password })
 * - Retrieve credentials: await credentialVault.retrieveCredential(userId, credentialId)
 * - List available: await credentialVault.listCredentials(userId)
 * - Delete: await credentialVault.deleteCredential(userId, credentialId)
 */

import crypto from "crypto";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { credentials, securityAuditLog } from "../../drizzle/schema-security";
import type {
  Credential,
  InsertCredential,
  InsertSecurityAuditLog,
} from "../../drizzle/schema-security";

// ========================================
// TYPES
// ========================================

export type CredentialType = "password" | "api_key" | "oauth_token" | "ssh_key";

export interface CredentialData {
  username?: string;
  password?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  privateKey?: string;
  [key: string]: string | undefined;
}

export interface StoreCredentialParams {
  name: string;
  service: string;
  type: CredentialType;
  data: CredentialData;
  metadata?: Record<string, unknown>;
}

export interface RetrievedCredential {
  id: number;
  name: string;
  service: string;
  type: CredentialType;
  data: CredentialData;
  metadata?: Record<string, unknown>;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

export interface CredentialListItem {
  id: number;
  name: string;
  service: string;
  type: CredentialType;
  metadata?: Record<string, unknown>;
  lastUsedAt?: Date | null;
  useCount: number;
  createdAt: Date;
}

// ========================================
// ENCRYPTION UTILITIES
// ========================================

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * CRITICAL: This key MUST be stored securely (e.g., AWS Secrets Manager, HashiCorp Vault)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY environment variable is required. " +
      "Generate with: openssl rand -hex 32"
    );
  }

  // Key should be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
      `Current length: ${key.length}`
    );
  }

  return Buffer.from(key, "hex");
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
function encryptData(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
function decryptData(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Redact sensitive data from strings (for logging)
 */
function redactSensitiveData(text: string): string {
  // Redact common patterns
  let redacted = text;

  // API keys (sk-*, pk-*, etc.)
  redacted = redacted.replace(/\b[sp]k-[a-zA-Z0-9]{20,}\b/g, "[REDACTED_API_KEY]");

  // Passwords in URLs
  redacted = redacted.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, "$1[REDACTED]$3");

  // Bearer tokens
  redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/gi, "Bearer [REDACTED]");

  // JWT tokens
  redacted = redacted.replace(
    /eyJ[a-zA-Z0-9\-._~+\/]+=*\.eyJ[a-zA-Z0-9\-._~+\/]+=*\.[a-zA-Z0-9\-._~+\/]+=*/g,
    "[REDACTED_JWT]"
  );

  return redacted;
}

// ========================================
// CREDENTIAL VAULT SERVICE
// ========================================

export class CredentialVaultService {
  /**
   * Store a credential securely
   */
  async storeCredential(
    userId: number,
    params: StoreCredentialParams
  ): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Serialize credential data
      const plaintext = JSON.stringify(params.data);

      // Encrypt the data
      const { encrypted, iv, authTag } = encryptData(plaintext);

      // Store in database
      const [credential] = await db
        .insert(credentials)
        .values({
          userId,
          name: params.name,
          service: params.service,
          type: params.type,
          encryptedData: encrypted,
          iv,
          authTag,
          metadata: params.metadata || null,
          useCount: 0,
        })
        .returning();

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "credential_create",
        resourceType: "credential",
        resourceId: credential.id,
        details: {
          name: params.name,
          service: params.service,
          type: params.type,
        },
        success: true,
      });

      console.log(
        `[CredentialVault] Stored credential for user ${userId}: ` +
        `${params.service} (${params.type})`
      );

      return credential.id;
    } catch (error) {
      // Audit log failure
      await this.auditLog(db, {
        userId,
        action: "credential_create",
        resourceType: "credential",
        resourceId: null,
        details: {
          name: params.name,
          service: params.service,
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to store credential: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieve a credential (decrypted)
   */
  async retrieveCredential(
    userId: number,
    credentialId: number
  ): Promise<RetrievedCredential> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Fetch credential with strict user isolation
      const [credential] = await db
        .select()
        .from(credentials)
        .where(
          and(
            eq(credentials.id, credentialId),
            eq(credentials.userId, userId),
            eq(credentials.isActive, true)
          )
        )
        .limit(1);

      if (!credential) {
        throw new Error("Credential not found or access denied");
      }

      // Decrypt the data
      const decryptedJson = decryptData(
        credential.encryptedData,
        credential.iv,
        credential.authTag
      );

      const data: CredentialData = JSON.parse(decryptedJson);

      // Update usage tracking
      await db
        .update(credentials)
        .set({
          lastUsedAt: new Date(),
          useCount: credential.useCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(credentials.id, credentialId));

      // Audit log (without sensitive data)
      await this.auditLog(db, {
        userId,
        action: "credential_access",
        resourceType: "credential",
        resourceId: credentialId,
        details: {
          service: credential.service,
          type: credential.type,
        },
        success: true,
      });

      console.log(
        `[CredentialVault] Retrieved credential ${credentialId} for user ${userId}`
      );

      return {
        id: credential.id,
        name: credential.name,
        service: credential.service,
        type: credential.type as CredentialType,
        data,
        metadata: credential.metadata as Record<string, unknown> | undefined,
        lastUsedAt: credential.lastUsedAt,
        createdAt: credential.createdAt,
      };
    } catch (error) {
      // Audit log failure
      await this.auditLog(db, {
        userId,
        action: "credential_access",
        resourceType: "credential",
        resourceId: credentialId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to retrieve credential: ${redactSensitiveData(message)}`);
    }
  }

  /**
   * List user's credentials (without sensitive data)
   */
  async listCredentials(
    userId: number,
    service?: string
  ): Promise<CredentialListItem[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      const conditions = [
        eq(credentials.userId, userId),
        eq(credentials.isActive, true),
      ];

      if (service) {
        conditions.push(eq(credentials.service, service));
      }

      const results = await db
        .select({
          id: credentials.id,
          name: credentials.name,
          service: credentials.service,
          type: credentials.type,
          metadata: credentials.metadata,
          lastUsedAt: credentials.lastUsedAt,
          useCount: credentials.useCount,
          createdAt: credentials.createdAt,
        })
        .from(credentials)
        .where(and(...conditions))
        .orderBy(credentials.createdAt);

      console.log(
        `[CredentialVault] Listed ${results.length} credentials for user ${userId}`
      );

      return results.map((cred) => ({
        id: cred.id,
        name: cred.name,
        service: cred.service,
        type: cred.type as CredentialType,
        metadata: cred.metadata as Record<string, unknown> | undefined,
        lastUsedAt: cred.lastUsedAt,
        useCount: cred.useCount,
        createdAt: cred.createdAt,
      }));
    } catch (error) {
      throw new Error(
        `Failed to list credentials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a credential (soft delete for audit trail)
   */
  async deleteCredential(
    userId: number,
    credentialId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify ownership
      const [credential] = await db
        .select()
        .from(credentials)
        .where(
          and(
            eq(credentials.id, credentialId),
            eq(credentials.userId, userId),
            eq(credentials.isActive, true)
          )
        )
        .limit(1);

      if (!credential) {
        throw new Error("Credential not found or access denied");
      }

      // Soft delete
      await db
        .update(credentials)
        .set({
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(credentials.id, credentialId));

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "credential_delete",
        resourceType: "credential",
        resourceId: credentialId,
        details: {
          name: credential.name,
          service: credential.service,
        },
        success: true,
      });

      console.log(
        `[CredentialVault] Deleted credential ${credentialId} for user ${userId}`
      );
    } catch (error) {
      // Audit log failure
      await this.auditLog(db, {
        userId,
        action: "credential_delete",
        resourceType: "credential",
        resourceId: credentialId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to delete credential: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Update credential metadata (not the sensitive data)
   */
  async updateMetadata(
    userId: number,
    credentialId: number,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Verify ownership
    const [credential] = await db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId),
          eq(credentials.isActive, true)
        )
      )
      .limit(1);

    if (!credential) {
      throw new Error("Credential not found or access denied");
    }

    await db
      .update(credentials)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, credentialId));
  }

  /**
   * Write to security audit log
   */
  private async auditLog(
    db: any,
    entry: Omit<InsertSecurityAuditLog, "timestamp">
  ): Promise<void> {
    try {
      await db.insert(securityAuditLog).values({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      // Don't fail the operation if audit logging fails
      console.error("[CredentialVault] Failed to write audit log:", error);
    }
  }

  /**
   * Utility: Redact credentials from error messages
   */
  static redactFromError(error: Error): Error {
    const redacted = new Error(redactSensitiveData(error.message));
    redacted.stack = error.stack ? redactSensitiveData(error.stack) : undefined;
    return redacted;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let credentialVaultInstance: CredentialVaultService | null = null;

export function getCredentialVault(): CredentialVaultService {
  if (!credentialVaultInstance) {
    credentialVaultInstance = new CredentialVaultService();
  }
  return credentialVaultInstance;
}

// Export for testing
export { redactSensitiveData };
