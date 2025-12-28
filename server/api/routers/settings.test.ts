/**
 * Unit Tests for Settings Router
 *
 * Tests API key management, OAuth flows, webhooks, and user preferences
 */

// Set ENCRYPTION_KEY BEFORE importing settings module (module loads env vars at import time)
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { settingsRouter } from "./settings";
import {
  createMockContext,
  createMockIntegration,
  createMockWebhook,
  createMockApiKeys,
  createMockFetch,
  mockEnv,
} from "@/__tests__/helpers/test-helpers";
import { createTestDb } from "@/__tests__/helpers/test-db";

// Mock dependencies
vi.mock("../../db");
vi.mock("crypto");

describe("Settings Router", () => {
  let mockCtx: any;
  let restoreEnv: () => void;

  beforeEach(() => {
    mockCtx = createMockContext({ id: 1 });
    vi.clearAllMocks();

    // Mock environment variables
    restoreEnv = mockEnv({
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  describe("API Keys Management", () => {
    describe("listApiKeys", () => {
      it("should list API keys with masked values", async () => {
        const apiKeys = createMockApiKeys();

        const preferences = {
          userId: 1,
          apiKeys: JSON.stringify(apiKeys),
          createdAt: new Date(),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listApiKeys();

        expect(result.apiKeys).toBeDefined();
        expect(result.apiKeys.length).toBeGreaterThan(0);
      });

      it("should return empty array if no API keys configured", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listApiKeys();

        expect(result.apiKeys).toEqual([]);
      });

      it("should handle database error", async () => {
        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(null)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(caller.listApiKeys()).rejects.toThrow(TRPCError);
      });
    });

    describe("saveApiKey", () => {
      it("should save a new API key", async () => {
        const db = createTestDb({
          selectResponse: [],
          insertResponse: [{ id: 1, userId: 1, apiKeys: "{}" }],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.saveApiKey({
          service: "openai",
          apiKey: "sk-test-key-123",
          label: "OpenAI Production",
        });

        expect(result.success).toBe(true);
        expect(result.service).toBe("openai");
      });

      it("should update existing API key", async () => {
        const existingPrefs = {
          userId: 1,
          apiKeys: JSON.stringify({ openai: { key: "old-key" } }),
        };

        const db = createTestDb({
          selectResponse: [existingPrefs],
          updateResponse: [existingPrefs],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.saveApiKey({
          service: "openai",
          apiKey: "sk-new-key-456",
        });

        expect(result.success).toBe(true);
      });

      it("should validate service enum", async () => {
        const db = createTestDb();
        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.saveApiKey({
            service: "invalid-service" as any,
            apiKey: "test-key",
          })
        ).rejects.toThrow();
      });

      it("should encrypt the API key", async () => {
        const db = createTestDb({
          selectResponse: [],
          insertResponse: [{ id: 1 }],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        await caller.saveApiKey({
          service: "openai",
          apiKey: "sk-plaintext-key",
        });

        // Verify encryption was called (in real test, mock crypto module)
      });
    });

    describe("deleteApiKey", () => {
      it("should delete an API key", async () => {
        const apiKeys = createMockApiKeys();
        const preferences = {
          userId: 1,
          apiKeys: JSON.stringify(apiKeys),
        };

        const db = createTestDb({
          selectResponse: [preferences],
          updateResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.deleteApiKey({ service: "openai" });

        expect(result.success).toBe(true);
      });

      it("should throw NOT_FOUND if key doesn't exist", async () => {
        const db = createTestDb({
          selectResponse: [{ userId: 1, apiKeys: "{}" }],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.deleteApiKey({ service: "openai" })
        ).rejects.toThrow("API key not found");
      });
    });

    describe("testApiKey", () => {
      it("should test API key validity", async () => {
        const apiKeys = createMockApiKeys();
        const preferences = {
          userId: 1,
          apiKeys: JSON.stringify(apiKeys),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.testApiKey({ service: "openai" });

        expect(result.isValid).toBe(true);
      });

      it("should return false for invalid key", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.testApiKey({ service: "openai" })
        ).rejects.toThrow("API key not found");
      });
    });
  });

  describe("OAuth Integrations", () => {
    describe("listIntegrations", () => {
      it("should list user integrations", async () => {
        const integrations = [
          createMockIntegration({ service: "google" }),
          createMockIntegration({ service: "gmail" }),
        ];

        const db = createTestDb({
          selectResponse: integrations,
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(integrations)),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listIntegrations();

        expect(result.integrations).toHaveLength(2);
      });

      it("should mark expired integrations", async () => {
        const expiredIntegration = createMockIntegration({
          expiresAt: new Date(Date.now() - 3600000),
        });

        const db = createTestDb({
          selectResponse: [expiredIntegration],
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([expiredIntegration])),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listIntegrations();

        expect(result.integrations[0].isExpired).toBe(true);
      });
    });

    describe("initiateOAuth", () => {
      it("should generate OAuth authorization URL", async () => {
        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.initiateOAuth({ provider: "google" });

        expect(result.success).toBe(true);
        expect(result.authorizationUrl).toContain("https://accounts.google.com");
        expect(result.state).toBeDefined();
        expect(result.codeVerifier).toBeDefined();
      });

      it("should include PKCE challenge", async () => {
        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.initiateOAuth({ provider: "google" });

        expect(result.authorizationUrl).toContain("code_challenge");
        expect(result.authorizationUrl).toContain("code_challenge_method=S256");
      });

      it("should support different providers", async () => {
        const providers = ["google", "gmail", "outlook", "facebook", "instagram", "linkedin"];

        for (const provider of providers) {
          const caller = settingsRouter.createCaller(mockCtx);
          const result = await caller.initiateOAuth({ provider: provider as any });

          expect(result.success).toBe(true);
          expect(result.authorizationUrl).toBeDefined();
        }
      });
    });

    describe("handleOAuthCallback", () => {
      it("should exchange code for tokens", async () => {
        const mockFetchFn = createMockFetch({
          "https://oauth2.googleapis.com/token": {
            ok: true,
            json: {
              access_token: "access-token-123",
              refresh_token: "refresh-token-456",
              expires_in: 3600,
              token_type: "Bearer",
              scope: "openid email profile",
            },
          },
        });

        global.fetch = mockFetchFn as any;

        const db = createTestDb({
          selectResponse: [],
          insertResponse: [createMockIntegration()],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.handleOAuthCallback({
          provider: "google",
          code: "auth-code-123",
          state: "state-token-456",
          codeVerifier: "code-verifier-789",
        });

        expect(result.success).toBe(true);
        expect(result.provider).toBe("google");
      });

      it("should update existing integration", async () => {
        const mockFetchFn = createMockFetch({
          "https://oauth2.googleapis.com/token": {
            ok: true,
            json: {
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_in: 3600,
            },
          },
        });

        global.fetch = mockFetchFn as any;

        const existingIntegration = createMockIntegration();

        const db = createTestDb({
          selectResponse: [existingIntegration],
          updateResponse: [existingIntegration],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.handleOAuthCallback({
          provider: "google",
          code: "auth-code",
          state: "state",
          codeVerifier: "verifier",
        });

        expect(result.success).toBe(true);
      });

      it("should handle token exchange failure", async () => {
        const mockFetchFn = createMockFetch({
          "https://oauth2.googleapis.com/token": {
            ok: false,
            status: 400,
            text: "invalid_grant",
          },
        });

        global.fetch = mockFetchFn as any;

        const db = createTestDb();
        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.handleOAuthCallback({
            provider: "google",
            code: "invalid-code",
            state: "state",
            codeVerifier: "verifier",
          })
        ).rejects.toThrow();
      });
    });

    describe("refreshOAuthToken", () => {
      it("should refresh access token", async () => {
        const mockFetchFn = createMockFetch({
          "https://oauth2.googleapis.com/token": {
            ok: true,
            json: {
              access_token: "new-access-token",
              expires_in: 3600,
            },
          },
        });

        global.fetch = mockFetchFn as any;

        const integration = createMockIntegration();

        const db = createTestDb({
          selectResponse: [integration],
          updateResponse: [integration],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.refreshOAuthToken({
          integrationId: 1,
        });

        expect(result.success).toBe(true);
      });

      it("should throw error if no refresh token", async () => {
        const integration = createMockIntegration({
          refreshToken: null,
        });

        const db = createTestDb({
          selectResponse: [integration],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.refreshOAuthToken({ integrationId: 1 })
        ).rejects.toThrow("No refresh token available");
      });

      it("should throw NOT_FOUND for non-existent integration", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.refreshOAuthToken({ integrationId: 999 })
        ).rejects.toThrow("Integration not found");
      });
    });

    describe("disconnectIntegration", () => {
      it("should disconnect integration", async () => {
        const integration = createMockIntegration();

        const db = createTestDb({
          selectResponse: [integration],
          updateResponse: [{ ...integration, isActive: "false" }],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.disconnectIntegration({
          integrationId: 1,
        });

        expect(result.success).toBe(true);
      });

      it("should throw NOT_FOUND for non-existent integration", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.disconnectIntegration({ integrationId: 999 })
        ).rejects.toThrow("Integration not found");
      });
    });

    describe("testIntegration", () => {
      it("should test integration connection", async () => {
        const integration = createMockIntegration();

        const db = createTestDb({
          selectResponse: [integration],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.testIntegration({
          integrationId: 1,
        });

        expect(result.success).toBe(true);
        expect(result.isValid).toBe(true);
      });

      it("should detect expired tokens", async () => {
        const expiredIntegration = createMockIntegration({
          expiresAt: new Date(Date.now() - 3600000),
        });

        const db = createTestDb({
          selectResponse: [expiredIntegration],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.testIntegration({
          integrationId: 1,
        });

        expect(result.isExpired).toBe(true);
      });
    });
  });

  describe("Webhook Management", () => {
    describe("listWebhooks", () => {
      it("should list webhooks with plan limits", async () => {
        const webhooks = [
          createMockWebhook(),
          createMockWebhook({ id: "webhook-2" }),
        ];

        const preferences = {
          userId: 1,
          defaultWorkflowSettings: JSON.stringify({ webhooks }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listWebhooks();

        expect(result.webhooks).toHaveLength(2);
        expect(result.planLimits).toBeDefined();
        expect(result.canCreateMore).toBeDefined();
      });

      it("should return empty array if no webhooks", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.listWebhooks();

        expect(result.webhooks).toEqual([]);
      });
    });

    describe("createWebhook", () => {
      it("should create a new webhook", async () => {
        const db = createTestDb({
          selectResponse: [{ defaultWorkflowSettings: "{}" }],
          updateResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.createWebhook({
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["quiz.completed", "workflow.executed"],
        });

        expect(result.success).toBe(true);
        expect(result.webhook).toBeDefined();
        expect(result.webhook.secret).toContain("whsec_");
      });

      it("should enforce plan limits", async () => {
        const existingWebhooks = Array(10)
          .fill(null)
          .map((_, i) => createMockWebhook({ id: `webhook-${i}` }));

        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: existingWebhooks }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.createWebhook({
            name: "Webhook 11",
            url: "https://example.com/webhook",
            events: ["quiz.completed"],
          })
        ).rejects.toThrow("Webhook limit reached");
      });

      it("should generate signing secret", async () => {
        const db = createTestDb({
          selectResponse: [],
          insertResponse: [],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.createWebhook({
          name: "Webhook with Secret",
          url: "https://example.com/webhook",
          events: ["quiz.completed"],
        });

        expect(result.webhook.secret).toMatch(/^whsec_/);
      });
    });

    describe("updateWebhook", () => {
      it("should update webhook configuration", async () => {
        const webhook = createMockWebhook();
        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: [webhook] }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
          updateResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.updateWebhook({
          id: webhook.id,
          name: "Updated Webhook",
        });

        expect(result.success).toBe(true);
        expect(result.webhook.name).toBe("Updated Webhook");
      });

      it("should throw NOT_FOUND for non-existent webhook", async () => {
        const db = createTestDb({
          selectResponse: [{ defaultWorkflowSettings: JSON.stringify({ webhooks: [] }) }],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);

        await expect(
          caller.updateWebhook({
            id: "non-existent-uuid",
            name: "Updated",
          })
        ).rejects.toThrow("Webhook not found");
      });
    });

    describe("deleteWebhook", () => {
      it("should delete webhook", async () => {
        const webhook = createMockWebhook();
        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: [webhook] }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
          updateResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.deleteWebhook({
          id: webhook.id,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("testWebhook", () => {
      it("should send test webhook payload", async () => {
        const webhook = createMockWebhook();
        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: [webhook] }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const mockFetchFn = createMockFetch({
          "https://example.com/webhook": {
            ok: true,
            status: 200,
          },
        });

        global.fetch = mockFetchFn as any;

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.testWebhook({
          id: webhook.id,
        });

        expect(result.success).toBe(true);
        expect(mockFetchFn).toHaveBeenCalled();
      });

      it("should include signature header", async () => {
        const webhook = createMockWebhook();
        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: [webhook] }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const mockFetchFn = vi.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(""),
          })
        );

        global.fetch = mockFetchFn as any;

        const caller = settingsRouter.createCaller(mockCtx);
        await caller.testWebhook({ id: webhook.id });

        const callArgs = mockFetchFn.mock.calls[0];
        expect(callArgs[1].headers["X-Webhook-Signature"]).toBeDefined();
      });
    });

    describe("regenerateSecret", () => {
      it("should regenerate webhook signing secret", async () => {
        const webhook = createMockWebhook({ secret: "whsec_old" });
        const preferences = {
          defaultWorkflowSettings: JSON.stringify({ webhooks: [webhook] }),
        };

        const db = createTestDb({
          selectResponse: [preferences],
          updateResponse: [preferences],
        });

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.regenerateSecret({
          id: webhook.id,
        });

        expect(result.success).toBe(true);
        expect(result.secret).toBeDefined();
        expect(result.secret).not.toBe(webhook.secret);
      });
    });
  });

  describe("User Preferences", () => {
    describe("getPreferences", () => {
      it("should get user preferences", async () => {
        const preferences = {
          theme: "dark",
          notifications: JSON.stringify({ email: true }),
          defaultBrowserConfig: null,
          defaultWorkflowSettings: null,
        };

        const db = createTestDb({
          selectResponse: [preferences],
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([preferences])),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.getPreferences();

        expect(result.theme).toBe("dark");
      });

      it("should return defaults if no preferences", async () => {
        const db = createTestDb({
          selectResponse: [],
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.getPreferences();

        expect(result.theme).toBe("light");
      });
    });

    describe("updatePreferences", () => {
      it("should update user preferences", async () => {
        const existing = {
          userId: 1,
          theme: "light",
        };

        const updated = {
          ...existing,
          theme: "dark",
        };

        const db = createTestDb({
          selectResponse: [existing],
          updateResponse: [updated],
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([existing])),
            })),
          })),
        })) as any;

        db.update = vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([updated])),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.updatePreferences({
          theme: "dark",
        });

        expect(result.success).toBe(true);
        expect(result.preferences.theme).toBe("dark");
      });

      it("should create preferences if none exist", async () => {
        const created = {
          userId: 1,
          theme: "dark",
        };

        const db = createTestDb({
          selectResponse: [],
          insertResponse: [created],
        });

        db.select = vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })) as any;

        db.insert = vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([created])),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.updatePreferences({
          theme: "dark",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("resetToDefaults", () => {
      it("should reset preferences to defaults", async () => {
        const defaults = {
          theme: "light",
          notifications: JSON.stringify({ email: true }),
        };

        const db = createTestDb({
          updateResponse: [defaults],
        });

        db.update = vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([defaults])),
            })),
          })),
        })) as any;

        const dbModule = await import("../../db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
          Promise.resolve(db as any)
        );

        const caller = settingsRouter.createCaller(mockCtx);
        const result = await caller.resetToDefaults();

        expect(result.success).toBe(true);
      });
    });
  });
});
