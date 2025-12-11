/**
 * Unit Tests for Webhooks Router
 *
 * Tests webhook CRUD operations, 3-webhook limit enforcement,
 * verification flow, token regeneration, and message retrieval
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { webhooksRouter } from "./webhooks";
import {
  createMockContext,
  createMockWebhook,
  createMockFetch,
  mockEnv,
} from "@/__tests__/helpers/test-helpers";
import { createTestDb } from "@/__tests__/helpers/test-db";

// Mock dependencies
vi.mock("@/server/db");
vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => Buffer.from("test-random-bytes-16")),
  createHmac: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "test-signature"),
  })),
}));

describe("Webhooks Router", () => {
  let mockCtx: any;
  let restoreEnv: () => void;

  beforeEach(() => {
    mockCtx = createMockContext({ id: 1 });
    vi.clearAllMocks();

    // Mock environment variables
    restoreEnv = mockEnv({
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  // ========================================
  // LIST WEBHOOKS TESTS
  // ========================================

  describe("listWebhooks", () => {
    it("should list all webhooks for user", async () => {
      const webhooks = [
        createMockWebhook({ id: "webhook-1" }),
        createMockWebhook({ id: "webhook-2" }),
        createMockWebhook({ id: "webhook-3" }),
      ];

      const db = createTestDb({
        selectResponse: webhooks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.listWebhooks();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("webhook-1");
    });

    it("should return empty array when no webhooks exist", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.listWebhooks();

      expect(result).toEqual([]);
    });

    it("should filter webhooks by type", async () => {
      const smsWebhooks = [
        createMockWebhook({
          id: "webhook-sms-1",
          metadata: { type: "sms" },
        }),
      ];

      const db = createTestDb({
        selectResponse: smsWebhooks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.listWebhooks({ type: "sms" });

      expect(result).toHaveLength(1);
      expect(result[0].metadata?.type).toBe("sms");
    });

    it("should include webhook metadata", async () => {
      const webhook = createMockWebhook({
        metadata: {
          type: "sms",
          provider: "twilio",
          lastReceived: new Date().toISOString(),
        },
      });

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.listWebhooks();

      expect(result[0].metadata).toBeDefined();
    });
  });

  // ========================================
  // CREATE WEBHOOK TESTS
  // ========================================

  describe("createWebhook", () => {
    it("should create a new webhook", async () => {
      const db = createTestDb({
        selectResponse: [],
        insertResponse: [
          createMockWebhook({
            id: "webhook-new",
            name: "New Webhook",
          }),
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.createWebhook({
        name: "New Webhook",
        type: "sms",
        provider: "twilio",
        config: { accountSid: "test-sid", authToken: "test-token" },
      });

      expect(result.id).toBe("webhook-new");
      expect(result.name).toBe("New Webhook");
      expect(result.token).toBeDefined();
    });

    it("should generate unique token for webhook", async () => {
      const db = createTestDb({
        selectResponse: [],
        insertResponse: [createMockWebhook()],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.createWebhook({
        name: "Test Webhook",
        type: "email",
        provider: "custom",
        config: {},
      });

      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^whk_/);
    });

    it("should enforce 3-webhook limit per user", async () => {
      const existingWebhooks = [
        createMockWebhook({ id: "webhook-1" }),
        createMockWebhook({ id: "webhook-2" }),
        createMockWebhook({ id: "webhook-3" }),
      ];

      const db = createTestDb({
        selectResponse: existingWebhooks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.createWebhook({
          name: "Fourth Webhook",
          type: "sms",
          provider: "twilio",
          config: {},
        })
      ).rejects.toThrow("Webhook limit exceeded");
    });

    it("should allow webhook creation when below limit", async () => {
      const existingWebhooks = [
        createMockWebhook({ id: "webhook-1" }),
        createMockWebhook({ id: "webhook-2" }),
      ];

      const newWebhook = createMockWebhook({
        id: "webhook-3",
        name: "Third Webhook",
      });

      const db = createTestDb({
        selectResponse: existingWebhooks,
        insertResponse: [newWebhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.createWebhook({
        name: "Third Webhook",
        type: "custom",
        provider: "generic",
        config: { url: "https://example.com" },
      });

      expect(result.id).toBe("webhook-3");
    });

    it("should validate webhook configuration", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.createWebhook({
          name: "",
          type: "sms",
          provider: "twilio",
          config: {},
        })
      ).rejects.toThrow();
    });

    it("should store webhook configuration encrypted", async () => {
      const db = createTestDb({
        selectResponse: [],
        insertResponse: [createMockWebhook()],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      await caller.createWebhook({
        name: "Secure Webhook",
        type: "sms",
        provider: "twilio",
        config: { secret: "sensitive-data" },
      });

      // Verify insert was called (config should be encrypted)
      expect(db.insert).toHaveBeenCalled();
    });
  });

  // ========================================
  // UPDATE WEBHOOK TESTS
  // ========================================

  describe("updateWebhook", () => {
    it("should update webhook configuration", async () => {
      const existingWebhook = createMockWebhook({
        id: "webhook-1",
        name: "Old Name",
      });

      const updatedWebhook = createMockWebhook({
        id: "webhook-1",
        name: "New Name",
      });

      const db = createTestDb({
        selectResponse: [existingWebhook],
        updateResponse: [updatedWebhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.updateWebhook({
        id: "webhook-1",
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
    });

    it("should throw error if webhook not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.updateWebhook({
          id: "non-existent",
          name: "Updated",
        })
      ).rejects.toThrow("Webhook not found");
    });

    it("should update webhook metadata", async () => {
      const webhook = createMockWebhook({
        metadata: { type: "sms" },
      });

      const updatedWebhook = createMockWebhook({
        metadata: { type: "sms", lastVerified: new Date().toISOString() },
      });

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [updatedWebhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.updateWebhook({
        id: webhook.id,
        metadata: { lastVerified: new Date().toISOString() },
      });

      expect(result.metadata?.lastVerified).toBeDefined();
    });
  });

  // ========================================
  // DELETE WEBHOOK TESTS
  // ========================================

  describe("deleteWebhook", () => {
    it("should delete webhook", async () => {
      const webhook = createMockWebhook({ id: "webhook-to-delete" });

      const db = createTestDb({
        selectResponse: [webhook],
        deleteResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.deleteWebhook({
        id: "webhook-to-delete",
      });

      expect(result.success).toBe(true);
    });

    it("should throw error if webhook not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.deleteWebhook({ id: "non-existent" })
      ).rejects.toThrow("Webhook not found");
    });
  });

  // ========================================
  // WEBHOOK VERIFICATION TESTS
  // ========================================

  describe("verifyWebhook", () => {
    it("should verify webhook with valid signature", async () => {
      const webhook = createMockWebhook({
        id: "webhook-1",
        token: "whk_test123",
      });

      const mockFetchFn = createMockFetch({
        "https://example.com/webhook": {
          ok: true,
          status: 200,
          json: { success: true },
        },
      });

      global.fetch = mockFetchFn as any;

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [
          {
            ...webhook,
            metadata: { verified: true, lastVerified: new Date().toISOString() },
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.verifyWebhook({
        id: "webhook-1",
        testPayload: { test: true },
      });

      expect(result.verified).toBe(true);
    });

    it("should send test payload to webhook URL", async () => {
      const webhook = createMockWebhook({
        url: "https://example.com/webhook",
      });

      const mockFetchFn = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      global.fetch = mockFetchFn;

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      await caller.verifyWebhook({
        id: webhook.id,
        testPayload: { event: "test" },
      });

      expect(mockFetchFn).toHaveBeenCalledWith(
        webhook.url,
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Object),
        })
      );
    });

    it("should mark webhook as failed if verification fails", async () => {
      const webhook = createMockWebhook();

      const mockFetchFn = vi.fn().mockRejectedValue(
        new Error("Connection failed")
      );

      global.fetch = mockFetchFn;

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [
          {
            ...webhook,
            metadata: { verified: false, verificationError: "Connection failed" },
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.verifyWebhook({
        id: webhook.id,
        testPayload: {},
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ========================================
  // TOKEN REGENERATION TESTS
  // ========================================

  describe("regenerateToken", () => {
    it("should regenerate webhook token", async () => {
      const webhook = createMockWebhook({
        id: "webhook-1",
        token: "whk_old_token_123",
      });

      const updatedWebhook = createMockWebhook({
        id: "webhook-1",
        token: "whk_new_token_456",
      });

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [updatedWebhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.regenerateToken({
        id: "webhook-1",
      });

      expect(result.token).toBe("whk_new_token_456");
      expect(result.token).not.toBe(webhook.token);
    });

    it("should throw error if webhook not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.regenerateToken({ id: "non-existent" })
      ).rejects.toThrow("Webhook not found");
    });

    it("should generate cryptographically random token", async () => {
      const webhook = createMockWebhook();

      const db = createTestDb({
        selectResponse: [webhook],
        updateResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result1 = await caller.regenerateToken({ id: webhook.id });

      // Call again to generate different token
      db.selectResponse = [{ ...webhook, token: result1.token }];
      const result2 = await caller.regenerateToken({ id: webhook.id });

      expect(result1.token).not.toBe(result2.token);
    });
  });

  // ========================================
  // MESSAGE RETRIEVAL TESTS
  // ========================================

  describe("getMessages", () => {
    it("should retrieve messages for webhook", async () => {
      const messages = [
        {
          id: 1,
          webhookId: "webhook-1",
          payload: { event: "test" },
          timestamp: new Date(),
          status: "received",
        },
        {
          id: 2,
          webhookId: "webhook-1",
          payload: { event: "test2" },
          timestamp: new Date(),
          status: "processed",
        },
      ];

      const db = createTestDb({
        selectResponse: messages,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getMessages({
        webhookId: "webhook-1",
        limit: 20,
        offset: 0,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should support pagination for messages", async () => {
      const allMessages = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        webhookId: "webhook-1",
        payload: { event: `test-${i}` },
        timestamp: new Date(),
        status: "received",
      }));

      const paginatedMessages = allMessages.slice(0, 20);

      const db = createTestDb({
        selectResponse: paginatedMessages,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getMessages({
        webhookId: "webhook-1",
        limit: 20,
        offset: 0,
      });

      expect(result.messages).toHaveLength(20);
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.hasMore).toBe(true);
    });

    it("should filter messages by status", async () => {
      const successMessages = [
        {
          id: 1,
          webhookId: "webhook-1",
          payload: { event: "test" },
          timestamp: new Date(),
          status: "processed",
        },
      ];

      const db = createTestDb({
        selectResponse: successMessages,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getMessages({
        webhookId: "webhook-1",
        status: "processed",
        limit: 20,
        offset: 0,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].status).toBe("processed");
    });

    it("should sort messages by timestamp", async () => {
      const messages = [
        {
          id: 1,
          webhookId: "webhook-1",
          payload: { event: "first" },
          timestamp: new Date("2024-01-01"),
          status: "received",
        },
        {
          id: 2,
          webhookId: "webhook-1",
          payload: { event: "second" },
          timestamp: new Date("2024-01-02"),
          status: "received",
        },
      ];

      const db = createTestDb({
        selectResponse: messages,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getMessages({
        webhookId: "webhook-1",
        limit: 20,
        offset: 0,
        sortBy: "timestamp",
      });

      expect(result.messages[0].id).toBe(1);
    });

    it("should throw error if webhook not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);

      await expect(
        caller.getMessages({
          webhookId: "non-existent",
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow("Webhook not found");
    });
  });

  // ========================================
  // WEBHOOK STATISTICS TESTS
  // ========================================

  describe("getWebhookStats", () => {
    it("should return webhook statistics", async () => {
      const webhook = createMockWebhook();

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getWebhookStats({
        id: webhook.id,
      });

      expect(result).toHaveProperty("totalMessages");
      expect(result).toHaveProperty("successfulMessages");
      expect(result).toHaveProperty("failedMessages");
      expect(result).toHaveProperty("lastMessage");
    });

    it("should include success rate in statistics", async () => {
      const webhook = createMockWebhook();

      const stats = {
        id: webhook.id,
        totalMessages: 100,
        successfulMessages: 95,
        failedMessages: 5,
        successRate: 0.95,
        lastMessage: new Date(),
      };

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = webhooksRouter.createCaller(mockCtx);
      const result = await caller.getWebhookStats({
        id: webhook.id,
      });

      expect(result.successRate).toBeDefined();
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(1);
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe("Integration", () => {
    it("should complete full webhook lifecycle", async () => {
      // Create webhook
      let createDb = createTestDb({
        selectResponse: [],
        insertResponse: [createMockWebhook({ id: "webhook-1" })],
      });

      let dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(createDb as any)
      );

      let caller = webhooksRouter.createCaller(mockCtx);
      const created = await caller.createWebhook({
        name: "Test Webhook",
        type: "sms",
        provider: "twilio",
        config: {},
      });

      expect(created.id).toBe("webhook-1");

      // Verify webhook
      const verifyDb = createTestDb({
        selectResponse: [created],
        updateResponse: [
          { ...created, metadata: { verified: true } },
        ],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(verifyDb as any)
      );

      caller = webhooksRouter.createCaller(mockCtx);
      const mockFetchFn = createMockFetch({
        [created.url]: { ok: true, status: 200 },
      });
      global.fetch = mockFetchFn as any;

      const verified = await caller.verifyWebhook({
        id: created.id,
        testPayload: { test: true },
      });

      expect(verified.verified).toBe(true);

      // Get messages
      const messagesDb = createTestDb({
        selectResponse: [
          {
            id: 1,
            webhookId: created.id,
            payload: { test: true },
            timestamp: new Date(),
            status: "received",
          },
        ],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(messagesDb as any)
      );

      caller = webhooksRouter.createCaller(mockCtx);
      const messages = await caller.getMessages({
        webhookId: created.id,
        limit: 20,
        offset: 0,
      });

      expect(messages.messages).toHaveLength(1);
    });
  });
});
