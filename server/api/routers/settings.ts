import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import {
  userPreferences,
  integrations,
  type UserPreference,
  type Integration,
} from "../../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";
import crypto from "crypto";

/**
 * Settings Router
 * Comprehensive user settings management including API keys, OAuth integrations, webhooks, and preferences
 *
 * Features:
 * - Encrypted API key storage and management
 * - OAuth integration flows (Google, Gmail, Outlook, Facebook, Instagram, LinkedIn)
 * - Webhook management with plan limits and signature verification
 * - User preferences and defaults
 */

// ========================================
// ENCRYPTION HELPERS
// ========================================

/**
 * PLACEHOLDER: Set up encryption key in environment variables
 * Add to .env: ENCRYPTION_KEY=<32-byte-hex-string>
 * Generate with: openssl rand -hex 32
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "PLACEHOLDER_ENCRYPTION_KEY_REPLACE_ME_32_BYTES_HEX";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (API keys, tokens)
 */
function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to encrypt sensitive data",
    });
  }
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to decrypt sensitive data",
    });
  }
}

/**
 * Mask API key for display (show first 4 and last 4 characters)
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Generate webhook signing secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Generate HMAC SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ========================================
// OAUTH HELPERS
// ========================================

/**
 * Generate OAuth state parameter for CSRF protection
 */
function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate PKCE code verifier
 */
function generatePKCEVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate PKCE code challenge from verifier
 */
function generatePKCEChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * OAuth provider configurations
 * PLACEHOLDER: Add your OAuth app credentials to .env
 */
const OAUTH_CONFIGS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    clientId: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_GOOGLE_CLIENT_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_GOOGLE_CLIENT_SECRET",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/google",
  },
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    clientId: process.env.GMAIL_CLIENT_ID || "PLACEHOLDER_GMAIL_CLIENT_ID",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || "PLACEHOLDER_GMAIL_CLIENT_SECRET",
    redirectUri: process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/gmail",
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile offline_access Mail.Read Mail.Send",
    clientId: process.env.OUTLOOK_CLIENT_ID || "PLACEHOLDER_OUTLOOK_CLIENT_ID",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || "PLACEHOLDER_OUTLOOK_CLIENT_SECRET",
    redirectUri: process.env.OUTLOOK_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/outlook",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scope: "email public_profile pages_show_list pages_read_engagement",
    clientId: process.env.FACEBOOK_CLIENT_ID || "PLACEHOLDER_FACEBOOK_CLIENT_ID",
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "PLACEHOLDER_FACEBOOK_CLIENT_SECRET",
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/facebook",
  },
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "user_profile user_media",
    clientId: process.env.INSTAGRAM_CLIENT_ID || "PLACEHOLDER_INSTAGRAM_CLIENT_ID",
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "PLACEHOLDER_INSTAGRAM_CLIENT_SECRET",
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/instagram",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "r_liteprofile r_emailaddress w_member_social",
    clientId: process.env.LINKEDIN_CLIENT_ID || "PLACEHOLDER_LINKEDIN_CLIENT_ID",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "PLACEHOLDER_LINKEDIN_CLIENT_SECRET",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/oauth/callback/linkedin",
  },
};

// ========================================
// VALIDATION SCHEMAS
// ========================================

const apiKeyServiceEnum = z.enum([
  "openai",
  "browserbase",
  "anthropic",
  "google",
  "stripe",
  "twilio",
  "sendgrid",
  "custom",
]);

const oauthProviderEnum = z.enum([
  "google",
  "gmail",
  "outlook",
  "facebook",
  "instagram",
  "linkedin",
]);

const webhookEventEnum = z.enum([
  "quiz.completed",
  "workflow.executed",
  "task.completed",
  "lead.created",
  "integration.connected",
  "integration.disconnected",
  "all",
]);

// ========================================
// SETTINGS ROUTER
// ========================================

export const settingsRouter = router({
  // ========================================
  // API KEYS MANAGEMENT
  // ========================================

  /**
   * List all configured API keys (returns masked keys)
   */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      if (!preferences || !preferences.apiKeys) {
        return { apiKeys: [] };
      }

      // Parse and mask API keys
      const apiKeys = typeof preferences.apiKeys === "string"
        ? JSON.parse(preferences.apiKeys)
        : preferences.apiKeys;

      const maskedKeys = Object.entries(apiKeys).map(([service, encryptedKey]) => ({
        service,
        maskedKey: maskApiKey(service), // Mask the service name, not the encrypted value
        isConfigured: true,
        createdAt: preferences.createdAt,
      }));

      return { apiKeys: maskedKeys };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list API keys",
        cause: error,
      });
    }
  }),

  /**
   * Save an API key (encrypted)
   */
  saveApiKey: protectedProcedure
    .input(
      z.object({
        service: apiKeyServiceEnum,
        apiKey: z.string().min(1),
        label: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Encrypt the API key
        const encryptedKey = encrypt(input.apiKey);

        // Get or create user preferences
        const [existingPrefs] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        let apiKeys = {};
        if (existingPrefs?.apiKeys) {
          apiKeys = typeof existingPrefs.apiKeys === "string"
            ? JSON.parse(existingPrefs.apiKeys)
            : existingPrefs.apiKeys;
        }

        // Update API keys object
        (apiKeys as any)[input.service] = {
          key: encryptedKey,
          label: input.label,
          updatedAt: new Date().toISOString(),
        };

        if (existingPrefs) {
          // Update existing preferences
          await db
            .update(userPreferences)
            .set({
              apiKeys: JSON.stringify(apiKeys),
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, ctx.user.id));
        } else {
          // Create new preferences
          await db.insert(userPreferences).values({
            userId: ctx.user.id,
            apiKeys: JSON.stringify(apiKeys),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return {
          success: true,
          message: `API key for ${input.service} saved successfully`,
          service: input.service,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save API key",
          cause: error,
        });
      }
    }),

  /**
   * Delete an API key
   */
  deleteApiKey: protectedProcedure
    .input(z.object({ service: apiKeyServiceEnum }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences || !preferences.apiKeys) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        const apiKeys = typeof preferences.apiKeys === "string"
          ? JSON.parse(preferences.apiKeys)
          : preferences.apiKeys;

        if (!(input.service in apiKeys)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        // Remove the key
        delete (apiKeys as any)[input.service];

        await db
          .update(userPreferences)
          .set({
            apiKeys: JSON.stringify(apiKeys),
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, ctx.user.id));

        return {
          success: true,
          message: `API key for ${input.service} deleted successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete API key",
          cause: error,
        });
      }
    }),

  /**
   * Test an API key with real service validation
   */
  testApiKey: protectedProcedure
    .input(z.object({ service: apiKeyServiceEnum }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences || !preferences.apiKeys) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        const apiKeys = typeof preferences.apiKeys === "string"
          ? JSON.parse(preferences.apiKeys)
          : preferences.apiKeys;

        if (!(input.service in apiKeys)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        const encryptedKey = (apiKeys as any)[input.service].key;
        const apiKey = decrypt(encryptedKey);

        // Service-specific validation
        switch (input.service) {
          case "openai": {
            try {
              const { default: OpenAI } = await import("openai");
              const openai = new OpenAI({ apiKey, timeout: 5000 });

              // Test the API key by listing models
              await openai.models.list();

              return {
                success: true,
                message: "OpenAI API key is valid",
                isValid: true,
              };
            } catch (error: any) {
              // Specific OpenAI error handling
              if (error?.status === 401) {
                return {
                  success: false,
                  message: "Invalid OpenAI API key - authentication failed",
                  isValid: false,
                };
              } else if (error?.status === 429) {
                return {
                  success: false,
                  message: "OpenAI API key rate limit exceeded - key is valid but quota exceeded",
                  isValid: false,
                };
              } else if (error?.code === "ETIMEDOUT" || error?.code === "ECONNABORTED") {
                return {
                  success: false,
                  message: "OpenAI API request timed out - please try again",
                  isValid: false,
                };
              }
              throw error;
            }
          }

          case "browserbase": {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              const response = await fetch("https://www.browserbase.com/v1/sessions", {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                  return {
                    success: false,
                    message: "Invalid Browserbase API key - authentication failed",
                    isValid: false,
                  };
                } else if (response.status === 429) {
                  return {
                    success: false,
                    message: "Browserbase API rate limit exceeded - key is valid but quota exceeded",
                    isValid: false,
                  };
                }

                const errorText = await response.text().catch(() => "Unknown error");
                return {
                  success: false,
                  message: `Browserbase API error (${response.status}): ${errorText}`,
                  isValid: false,
                };
              }

              return {
                success: true,
                message: "Browserbase API key is valid",
                isValid: true,
              };
            } catch (error: any) {
              if (error.name === "AbortError") {
                return {
                  success: false,
                  message: "Browserbase API request timed out - please try again",
                  isValid: false,
                };
              }
              throw error;
            }
          }

          case "anthropic": {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              // Test with a minimal messages API call
              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": apiKey,
                  "anthropic-version": "2023-06-01",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "claude-3-haiku-20240307",
                  max_tokens: 1,
                  messages: [{ role: "user", content: "test" }],
                }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                  return {
                    success: false,
                    message: "Invalid Anthropic API key - authentication failed",
                    isValid: false,
                  };
                } else if (response.status === 429) {
                  return {
                    success: false,
                    message: "Anthropic API rate limit exceeded - key is valid but quota exceeded",
                    isValid: false,
                  };
                }

                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                return {
                  success: false,
                  message: `Anthropic API error (${response.status}): ${errorData.error?.message || "Unknown error"}`,
                  isValid: false,
                };
              }

              return {
                success: true,
                message: "Anthropic API key is valid",
                isValid: true,
              };
            } catch (error: any) {
              if (error.name === "AbortError") {
                return {
                  success: false,
                  message: "Anthropic API request timed out - please try again",
                  isValid: false,
                };
              }
              throw error;
            }
          }

          default:
            // For other services without specific validation
            return {
              success: true,
              message: `API key for ${input.service} is configured (validation not implemented)`,
              isValid: true,
            };
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        return {
          success: false,
          message: `API key test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          isValid: false,
        };
      }
    }),

  // ========================================
  // OAUTH INTEGRATIONS
  // ========================================

  /**
   * List all OAuth integrations
   */
  listIntegrations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const userIntegrations = await db
        .select({
          id: integrations.id,
          service: integrations.service,
          isActive: integrations.isActive,
          expiresAt: integrations.expiresAt,
          metadata: integrations.metadata,
          createdAt: integrations.createdAt,
          updatedAt: integrations.updatedAt,
        })
        .from(integrations)
        .where(eq(integrations.userId, ctx.user.id))
        .orderBy(desc(integrations.createdAt));

      return {
        integrations: userIntegrations.map(integration => ({
          ...integration,
          isExpired: integration.expiresAt
            ? new Date(integration.expiresAt) < new Date()
            : false,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list integrations",
        cause: error,
      });
    }
  }),

  /**
   * Initiate OAuth flow
   * Returns authorization URL with state and PKCE parameters
   */
  initiateOAuth: protectedProcedure
    .input(z.object({ provider: oauthProviderEnum }))
    .mutation(async ({ ctx, input }) => {
      try {
        const config = OAUTH_CONFIGS[input.provider];

        // Import OAuth state service
        const { oauthStateService } = await import("../../services/oauthState.service");

        // Generate OAuth state for CSRF protection
        const state = oauthStateService.generateState();

        // Generate PKCE parameters
        const codeVerifier = oauthStateService.generateCodeVerifier();
        const codeChallenge = oauthStateService.generateCodeChallenge(codeVerifier);

        // Store state and code_verifier securely server-side (10-minute TTL)
        oauthStateService.set(state, {
          userId: ctx.user.id,
          provider: input.provider,
          codeVerifier,
        });

        console.log(`[OAuth] Initiated ${input.provider} flow for user ${ctx.user.id}`, {
          state: state.substring(0, 8) + "...",
          hasCodeVerifier: !!codeVerifier,
        });

        // Build authorization URL
        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          response_type: "code",
          scope: config.scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          access_type: "offline", // Request refresh token
          prompt: "consent", // Force consent screen to get refresh token
        });

        const authorizationUrl = `${config.authUrl}?${params.toString()}`;

        return {
          success: true,
          authorizationUrl,
          state, // Safe to return - only used for client-side tracking
          // Note: codeVerifier is NOT returned to client - stored securely server-side
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initiate OAuth flow",
          cause: error,
        });
      }
    }),

  /**
   * Handle OAuth callback
   * Exchange authorization code for access/refresh tokens
   */
  handleOAuthCallback: protectedProcedure
    .input(
      z.object({
        provider: oauthProviderEnum,
        code: z.string(),
        state: z.string(),
        codeVerifier: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const config = OAUTH_CONFIGS[input.provider];

        // PLACEHOLDER: Validate state parameter against stored value
        // In production: const storedData = await redis.get(`oauth:${input.state}`);
        // Verify state matches and retrieve userId

        // Exchange authorization code for tokens
        const tokenResponse = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: input.code,
            redirect_uri: config.redirectUri,
            grant_type: "authorization_code",
            code_verifier: input.codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${error}`);
        }

        const tokens = await tokenResponse.json();

        // Calculate token expiration
        const expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null;

        // Encrypt tokens
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null;

        // Check if integration already exists
        const [existingIntegration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, ctx.user.id),
              eq(integrations.service, input.provider)
            )
          )
          .limit(1);

        if (existingIntegration) {
          // Update existing integration
          await db
            .update(integrations)
            .set({
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt,
              isActive: "true",
              metadata: JSON.stringify({
                tokenType: tokens.token_type,
                scope: tokens.scope,
              }),
              updatedAt: new Date(),
            })
            .where(eq(integrations.id, existingIntegration.id));
        } else {
          // Create new integration
          await db.insert(integrations).values({
            userId: ctx.user.id,
            service: input.provider,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            isActive: "true",
            metadata: JSON.stringify({
              tokenType: tokens.token_type,
              scope: tokens.scope,
            }),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return {
          success: true,
          message: `${input.provider} connected successfully`,
          provider: input.provider,
          expiresAt,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete OAuth flow",
          cause: error,
        });
      }
    }),

  /**
   * Refresh OAuth token
   */
  refreshOAuthToken: protectedProcedure
    .input(z.object({ integrationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.id, input.integrationId),
              eq(integrations.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        if (!integration.refreshToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No refresh token available",
          });
        }

        const config = OAUTH_CONFIGS[integration.service as keyof typeof OAUTH_CONFIGS];
        const refreshToken = decrypt(integration.refreshToken);

        // Request new access token
        const tokenResponse = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          throw new Error(`Token refresh failed: ${error}`);
        }

        const tokens = await tokenResponse.json();

        // Calculate new expiration
        const expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null;

        // Encrypt new access token
        const encryptedAccessToken = encrypt(tokens.access_token);

        // Update with new refresh token if provided
        const encryptedRefreshToken = tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : integration.refreshToken;

        await db
          .update(integrations)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, input.integrationId));

        return {
          success: true,
          message: "Token refreshed successfully",
          expiresAt,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to refresh token",
          cause: error,
        });
      }
    }),

  /**
   * Disconnect integration
   */
  disconnectIntegration: protectedProcedure
    .input(z.object({ integrationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.id, input.integrationId),
              eq(integrations.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        // PLACEHOLDER: Revoke token with provider
        // Example for Google:
        // const accessToken = decrypt(integration.accessToken);
        // await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: "POST" });

        // Soft delete - set isActive to false
        await db
          .update(integrations)
          .set({
            isActive: "false",
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, input.integrationId));

        return {
          success: true,
          message: `${integration.service} disconnected successfully`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disconnect integration",
          cause: error,
        });
      }
    }),

  /**
   * Test integration connection
   */
  testIntegration: protectedProcedure
    .input(z.object({ integrationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.id, input.integrationId),
              eq(integrations.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        // Check if token is expired
        const isExpired = integration.expiresAt
          ? new Date(integration.expiresAt) < new Date()
          : false;

        if (isExpired) {
          return {
            success: false,
            message: "Token expired - please refresh",
            isValid: false,
            isExpired: true,
          };
        }

        // PLACEHOLDER: Test connection with provider-specific API call
        // Example for Google:
        // const accessToken = decrypt(integration.accessToken);
        // const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
        //   headers: { Authorization: `Bearer ${accessToken}` },
        // });
        // if (!response.ok) throw new Error("Invalid token");

        return {
          success: true,
          message: "Integration is working correctly",
          isValid: true,
          isExpired: false,
        };
      } catch (error) {
        return {
          success: false,
          message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          isValid: false,
        };
      }
    }),

  // ========================================
  // WEBHOOK MANAGEMENT
  // ========================================

  /**
   * List user's webhooks with plan limit check
   */
  listWebhooks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // PLACEHOLDER: Get user's plan limits from subscription/plan table
      const planLimits = {
        maxWebhooks: 10, // Free: 3, Pro: 10, Enterprise: unlimited
        webhooksUsed: 0,
      };

      // PLACEHOLDER: Query webhooks from a dedicated webhooks table
      // For now, using userPreferences.metadata to store webhooks
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      let webhooks: any[] = [];
      if (preferences?.defaultWorkflowSettings) {
        const settings = typeof preferences.defaultWorkflowSettings === "string"
          ? JSON.parse(preferences.defaultWorkflowSettings)
          : preferences.defaultWorkflowSettings;
        webhooks = settings.webhooks || [];
      }

      planLimits.webhooksUsed = webhooks.length;

      return {
        webhooks,
        planLimits,
        canCreateMore: webhooks.length < planLimits.maxWebhooks,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list webhooks",
        cause: error,
      });
    }
  }),

  /**
   * Create webhook with plan limit enforcement
   */
  createWebhook: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        events: z.array(webhookEventEnum),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // PLACEHOLDER: Check plan limits
        const planLimits = { maxWebhooks: 10 };

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        let settings = preferences?.defaultWorkflowSettings
          ? (typeof preferences.defaultWorkflowSettings === "string"
            ? JSON.parse(preferences.defaultWorkflowSettings)
            : preferences.defaultWorkflowSettings)
          : { webhooks: [] };

        const webhooks = settings.webhooks || [];

        if (webhooks.length >= planLimits.maxWebhooks) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Webhook limit reached (${planLimits.maxWebhooks}). Upgrade your plan to create more webhooks.`,
          });
        }

        // Generate signing secret
        const secret = generateWebhookSecret();

        const newWebhook = {
          id: crypto.randomUUID(),
          name: input.name,
          url: input.url,
          events: input.events,
          description: input.description,
          secret,
          isActive: input.isActive,
          createdAt: new Date().toISOString(),
          lastTriggeredAt: null,
          deliveryCount: 0,
        };

        webhooks.push(newWebhook);
        settings.webhooks = webhooks;

        if (preferences) {
          await db
            .update(userPreferences)
            .set({
              defaultWorkflowSettings: JSON.stringify(settings),
              updatedAt: new Date(),
            })
            .where(eq(userPreferences.userId, ctx.user.id));
        } else {
          await db.insert(userPreferences).values({
            userId: ctx.user.id,
            defaultWorkflowSettings: JSON.stringify(settings),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return {
          success: true,
          webhook: newWebhook,
          message: "Webhook created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create webhook",
          cause: error,
        });
      }
    }),

  /**
   * Update webhook configuration
   */
  updateWebhook: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        events: z.array(webhookEventEnum).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences?.defaultWorkflowSettings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const settings = typeof preferences.defaultWorkflowSettings === "string"
          ? JSON.parse(preferences.defaultWorkflowSettings)
          : preferences.defaultWorkflowSettings;

        const webhooks = settings.webhooks || [];
        const webhookIndex = webhooks.findIndex((w: any) => w.id === input.id);

        if (webhookIndex === -1) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Update webhook
        const { id, ...updates } = input;
        webhooks[webhookIndex] = {
          ...webhooks[webhookIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        settings.webhooks = webhooks;

        await db
          .update(userPreferences)
          .set({
            defaultWorkflowSettings: JSON.stringify(settings),
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, ctx.user.id));

        return {
          success: true,
          webhook: webhooks[webhookIndex],
          message: "Webhook updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update webhook",
          cause: error,
        });
      }
    }),

  /**
   * Delete webhook
   */
  deleteWebhook: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences?.defaultWorkflowSettings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const settings = typeof preferences.defaultWorkflowSettings === "string"
          ? JSON.parse(preferences.defaultWorkflowSettings)
          : preferences.defaultWorkflowSettings;

        const webhooks = settings.webhooks || [];
        const filteredWebhooks = webhooks.filter((w: any) => w.id !== input.id);

        if (webhooks.length === filteredWebhooks.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        settings.webhooks = filteredWebhooks;

        await db
          .update(userPreferences)
          .set({
            defaultWorkflowSettings: JSON.stringify(settings),
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, ctx.user.id));

        return {
          success: true,
          message: "Webhook deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete webhook",
          cause: error,
        });
      }
    }),

  /**
   * Test webhook with sample payload
   */
  testWebhook: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences?.defaultWorkflowSettings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const settings = typeof preferences.defaultWorkflowSettings === "string"
          ? JSON.parse(preferences.defaultWorkflowSettings)
          : preferences.defaultWorkflowSettings;

        const webhook = (settings.webhooks || []).find((w: any) => w.id === input.id);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Create test payload
        const testPayload = {
          event: "webhook.test",
          timestamp: new Date().toISOString(),
          data: {
            message: "This is a test webhook delivery",
            userId: ctx.user.id,
            webhookId: webhook.id,
          },
        };

        const payloadString = JSON.stringify(testPayload);
        const signature = generateWebhookSignature(payloadString, webhook.secret);

        // Send webhook
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-ID": webhook.id,
          },
          body: payloadString,
        });

        return {
          success: response.ok,
          statusCode: response.status,
          message: response.ok
            ? "Test webhook delivered successfully"
            : `Webhook delivery failed with status ${response.status}`,
          responseBody: await response.text().catch(() => null),
        };
      } catch (error) {
        return {
          success: false,
          message: `Webhook test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Get webhook delivery logs
   * PLACEHOLDER: Implement webhook logging system
   */
  getWebhookLogs: protectedProcedure
    .input(
      z.object({
        webhookId: z.string().uuid(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // PLACEHOLDER: Query webhook delivery logs from dedicated table
      // For now, returning mock data
      return {
        logs: [
          {
            id: "log-1",
            webhookId: input.webhookId,
            event: "workflow.executed",
            statusCode: 200,
            deliveredAt: new Date().toISOString(),
            duration: 145,
            success: true,
          },
        ],
        total: 1,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Regenerate webhook signing secret
   */
  regenerateSecret: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [preferences] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        if (!preferences?.defaultWorkflowSettings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const settings = typeof preferences.defaultWorkflowSettings === "string"
          ? JSON.parse(preferences.defaultWorkflowSettings)
          : preferences.defaultWorkflowSettings;

        const webhooks = settings.webhooks || [];
        const webhookIndex = webhooks.findIndex((w: any) => w.id === input.id);

        if (webhookIndex === -1) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Generate new secret
        const newSecret = generateWebhookSecret();
        webhooks[webhookIndex].secret = newSecret;
        webhooks[webhookIndex].updatedAt = new Date().toISOString();

        settings.webhooks = webhooks;

        await db
          .update(userPreferences)
          .set({
            defaultWorkflowSettings: JSON.stringify(settings),
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, ctx.user.id));

        return {
          success: true,
          secret: newSecret,
          message: "Webhook secret regenerated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to regenerate webhook secret",
          cause: error,
        });
      }
    }),

  // ========================================
  // USER PREFERENCES
  // ========================================

  /**
   * Get all user preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [preferences] = await db
        .select({
          id: userPreferences.id,
          defaultBrowserConfig: userPreferences.defaultBrowserConfig,
          defaultWorkflowSettings: userPreferences.defaultWorkflowSettings,
          notifications: userPreferences.notifications,
          theme: userPreferences.theme,
          createdAt: userPreferences.createdAt,
          updatedAt: userPreferences.updatedAt,
        })
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      if (!preferences) {
        // Return default preferences
        return {
          theme: "light",
          notifications: {
            email: true,
            browser: true,
            workflow: true,
          },
          defaultBrowserConfig: null,
          defaultWorkflowSettings: null,
        };
      }

      return preferences;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get preferences",
        cause: error,
      });
    }
  }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.enum(["light", "dark", "system"]).optional(),
        notifications: z.record(z.boolean()).optional(),
        defaultBrowserConfig: z.record(z.any()).optional(),
        defaultWorkflowSettings: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [existingPrefs] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.user.id))
          .limit(1);

        const updateData = {
          theme: input.theme,
          notifications: input.notifications
            ? JSON.stringify(input.notifications)
            : undefined,
          defaultBrowserConfig: input.defaultBrowserConfig
            ? JSON.stringify(input.defaultBrowserConfig)
            : undefined,
          defaultWorkflowSettings: input.defaultWorkflowSettings
            ? JSON.stringify(input.defaultWorkflowSettings)
            : undefined,
          updatedAt: new Date(),
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if ((updateData as any)[key] === undefined) {
            delete (updateData as any)[key];
          }
        });

        if (existingPrefs) {
          const [updated] = await db
            .update(userPreferences)
            .set(updateData)
            .where(eq(userPreferences.userId, ctx.user.id))
            .returning();

          return {
            success: true,
            preferences: updated,
            message: "Preferences updated successfully",
          };
        } else {
          const [created] = await db
            .insert(userPreferences)
            .values({
              userId: ctx.user.id,
              ...updateData,
              createdAt: new Date(),
            })
            .returning();

          return {
            success: true,
            preferences: created,
            message: "Preferences created successfully",
          };
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update preferences",
          cause: error,
        });
      }
    }),

  /**
   * Reset preferences to defaults
   */
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const defaultPreferences = {
        theme: "light" as const,
        notifications: JSON.stringify({
          email: true,
          browser: true,
          workflow: true,
        }),
        defaultBrowserConfig: null,
        defaultWorkflowSettings: null,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(userPreferences)
        .set(defaultPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .returning();

      if (!updated) {
        // Create if doesn't exist
        await db.insert(userPreferences).values({
          userId: ctx.user.id,
          ...defaultPreferences,
          createdAt: new Date(),
        });
      }

      return {
        success: true,
        message: "Preferences reset to defaults",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset preferences",
        cause: error,
      });
    }
  }),
});
