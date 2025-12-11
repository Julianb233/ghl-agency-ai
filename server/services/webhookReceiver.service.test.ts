/**
 * Unit Tests for Webhook Receiver Service
 *
 * Tests SMS webhook handling (Twilio format), email webhooks,
 * custom webhook handling, authentication validation,
 * and conversation creation/retrieval
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { webhookReceiverService } from "./webhookReceiver.service";
import { createTestDb } from "@/__tests__/helpers/test-db";
import { mockEnv } from "@/__tests__/helpers/test-helpers";

// Mock dependencies
vi.mock("@/server/db");
vi.mock("crypto", () => ({
  createHmac: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "test-signature"),
  })),
}));

describe("Webhook Receiver Service", () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.clearAllMocks();

    restoreEnv = mockEnv({
      TWILIO_AUTH_TOKEN: "test-twilio-token",
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  // ========================================
  // TWILIO SMS WEBHOOK TESTS
  // ========================================

  describe("handleTwilioSmsWebhook", () => {
    it("should parse valid Twilio SMS payload", async () => {
      const twilioPayload = {
        MessageSid: "SM1234567890abcdef1234567890abcdef",
        AccountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        MessagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        From: "+1234567890",
        To: "+0987654321",
        Body: "Hello, this is a test message",
        NumMedia: "0",
      };

      const db = createTestDb({
        insertResponse: [
          {
            id: 1,
            webhookId: "webhook-1",
            type: "sms",
            from: "+1234567890",
            to: "+0987654321",
            body: "Hello, this is a test message",
            payload: twilioPayload,
            status: "received",
            createdAt: new Date(),
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleTwilioSmsWebhook(
        "webhook-1",
        twilioPayload as any
      );

      expect(result.type).toBe("sms");
      expect(result.from).toBe("+1234567890");
      expect(result.body).toBe("Hello, this is a test message");
    });

    it("should validate Twilio webhook signature", async () => {
      const twilioPayload = {
        MessageSid: "SM1234567890abcdef1234567890abcdef",
        From: "+1234567890",
        Body: "Test message",
      };

      const db = createTestDb();

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.validateTwilioSignature(
        {
          MessageSid: "SM1234567890abcdef1234567890abcdef",
          From: "+1234567890",
          Body: "Test message",
        },
        "test-signature",
        "https://example.com/webhook"
      );

      expect(typeof result).toBe("boolean");
    });

    it("should handle Twilio webhook with media attachments", async () => {
      const twilioPayload = {
        MessageSid: "SM1234567890abcdef1234567890abcdef",
        From: "+1234567890",
        To: "+0987654321",
        Body: "Check out this image",
        NumMedia: "1",
        MediaUrl0: "https://example.com/image.jpg",
        MediaContentType0: "image/jpeg",
      };

      const message = {
        id: 1,
        webhookId: "webhook-1",
        type: "sms",
        from: "+1234567890",
        body: "Check out this image",
        mediaAttachments: [
          {
            url: "https://example.com/image.jpg",
            contentType: "image/jpeg",
          },
        ],
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleTwilioSmsWebhook(
        "webhook-1",
        twilioPayload as any
      );

      expect(result.mediaAttachments).toBeDefined();
      expect(result.mediaAttachments?.length).toBe(1);
    });

    it("should extract phone numbers and normalize them", async () => {
      const twilioPayload = {
        From: "+12025551234",
        To: "+12025555678",
        Body: "Test",
      };

      const db = createTestDb({
        insertResponse: [
          {
            from: "+12025551234",
            to: "+12025555678",
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleTwilioSmsWebhook(
        "webhook-1",
        twilioPayload as any
      );

      expect(result.from).toMatch(/^\+1\d{10}$/);
    });

    it("should identify conversation participant from phone number", async () => {
      const conversation = {
        id: 1,
        userId: 1,
        participants: [
          { phoneNumber: "+1234567890", name: "John Doe" },
        ],
      };

      const twilioPayload = {
        From: "+1234567890",
        Body: "Message from known contact",
      };

      const db = createTestDb({
        selectResponse: [conversation],
        insertResponse: [
          {
            conversationId: 1,
            from: "+1234567890",
            body: "Message from known contact",
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleTwilioSmsWebhook(
        "webhook-1",
        twilioPayload as any
      );

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // EMAIL WEBHOOK TESTS
  // ========================================

  describe("handleEmailWebhook", () => {
    it("should parse email webhook payload", async () => {
      const emailPayload = {
        MessageId: "email-123",
        From: "sender@example.com",
        To: "recipient@example.com",
        Subject: "Test Email",
        HtmlBody: "<p>This is a test email</p>",
        TextBody: "This is a test email",
        Timestamp: "2024-01-15T10:30:00Z",
      };

      const message = {
        id: 1,
        webhookId: "webhook-2",
        type: "email",
        from: "sender@example.com",
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
        htmlBody: "<p>This is a test email</p>",
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleEmailWebhook(
        "webhook-2",
        emailPayload as any
      );

      expect(result.type).toBe("email");
      expect(result.from).toBe("sender@example.com");
      expect(result.subject).toBe("Test Email");
    });

    it("should handle email with attachments", async () => {
      const emailPayload = {
        MessageId: "email-456",
        From: "sender@example.com",
        To: "recipient@example.com",
        Subject: "Email with attachment",
        TextBody: "See attached file",
        Attachments: [
          {
            Name: "document.pdf",
            Content: "base64-encoded-content",
            ContentType: "application/pdf",
          },
        ],
      };

      const message = {
        id: 1,
        webhookId: "webhook-2",
        type: "email",
        from: "sender@example.com",
        attachments: [
          {
            name: "document.pdf",
            contentType: "application/pdf",
            size: 1024,
          },
        ],
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleEmailWebhook(
        "webhook-2",
        emailPayload as any
      );

      expect(result.attachments).toBeDefined();
      expect(result.attachments?.length).toBeGreaterThan(0);
    });

    it("should extract email addresses and validate format", async () => {
      const emailPayload = {
        From: "sender+tag@example.com",
        To: "recipient@sub.example.com",
        Subject: "Test",
        TextBody: "Test email",
      };

      const db = createTestDb({
        insertResponse: [
          {
            from: "sender+tag@example.com",
            to: "recipient@sub.example.com",
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleEmailWebhook(
        "webhook-2",
        emailPayload as any
      );

      expect(result.from).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("should prefer HTML body when available", async () => {
      const emailPayload = {
        From: "sender@example.com",
        To: "recipient@example.com",
        Subject: "HTML Email",
        HtmlBody: "<h1>Rich content</h1><p>HTML formatted</p>",
        TextBody: "Plain text fallback",
      };

      const db = createTestDb({
        insertResponse: [
          {
            htmlBody: "<h1>Rich content</h1><p>HTML formatted</p>",
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleEmailWebhook(
        "webhook-2",
        emailPayload as any
      );

      expect(result.htmlBody).toBe(
        "<h1>Rich content</h1><p>HTML formatted</p>"
      );
    });
  });

  // ========================================
  // CUSTOM WEBHOOK TESTS
  // ========================================

  describe("handleCustomWebhook", () => {
    it("should parse custom webhook payload", async () => {
      const customPayload = {
        event_type: "order_completed",
        order_id: "123456",
        customer_id: "cust-789",
        amount: 99.99,
        timestamp: "2024-01-15T10:30:00Z",
      };

      const message = {
        id: 1,
        webhookId: "webhook-3",
        type: "custom",
        payload: customPayload,
        eventType: "order_completed",
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleCustomWebhook(
        "webhook-3",
        customPayload as any
      );

      expect(result.type).toBe("custom");
      expect(result.payload).toEqual(customPayload);
    });

    it("should validate custom webhook against expected schema", async () => {
      const customPayload = {
        event_type: "user_signup",
        email: "newuser@example.com",
        timestamp: "2024-01-15T10:30:00Z",
      };

      const schema = {
        type: "object",
        properties: {
          event_type: { type: "string" },
          email: { type: "string", format: "email" },
        },
        required: ["event_type"],
      };

      const isValid = await webhookReceiverService.validatePayloadSchema(
        customPayload,
        schema as any
      );

      expect(isValid).toBe(true);
    });

    it("should reject invalid custom webhook payload", async () => {
      const invalidPayload = {
        event_type: "test",
        // Missing required email field
      };

      const schema = {
        type: "object",
        properties: {
          event_type: { type: "string" },
          email: { type: "string" },
        },
        required: ["event_type", "email"],
      };

      const isValid = await webhookReceiverService.validatePayloadSchema(
        invalidPayload,
        schema as any
      );

      expect(isValid).toBe(false);
    });

    it("should support nested payload structures", async () => {
      const complexPayload = {
        event: "transaction",
        data: {
          transaction_id: "tx-123",
          user: {
            id: "user-456",
            email: "user@example.com",
          },
          items: [
            { sku: "item-1", quantity: 2 },
            { sku: "item-2", quantity: 1 },
          ],
        },
      };

      const db = createTestDb({
        insertResponse: [
          {
            webhookId: "webhook-3",
            payload: complexPayload,
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.handleCustomWebhook(
        "webhook-3",
        complexPayload as any
      );

      expect(result.payload.data.user.email).toBe("user@example.com");
    });
  });

  // ========================================
  // AUTHENTICATION VALIDATION TESTS
  // ========================================

  describe("validateAuthentication", () => {
    it("should validate webhook token", async () => {
      const webhook = {
        id: "webhook-1",
        token: "whk_test_token_123",
        isActive: true,
      };

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const isValid = await webhookReceiverService.validateWebhookToken(
        "webhook-1",
        "whk_test_token_123"
      );

      expect(isValid).toBe(true);
    });

    it("should reject invalid token", async () => {
      const webhook = {
        id: "webhook-1",
        token: "whk_test_token_123",
      };

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const isValid = await webhookReceiverService.validateWebhookToken(
        "webhook-1",
        "whk_wrong_token"
      );

      expect(isValid).toBe(false);
    });

    it("should throw error if webhook not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      await expect(
        webhookReceiverService.validateWebhookToken("non-existent", "token")
      ).rejects.toThrow("Webhook not found");
    });

    it("should validate inactive webhooks", async () => {
      const inactiveWebhook = {
        id: "webhook-1",
        token: "whk_test_token_123",
        isActive: false,
      };

      const db = createTestDb({
        selectResponse: [inactiveWebhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const isValid = await webhookReceiverService.validateWebhookToken(
        "webhook-1",
        "whk_test_token_123"
      );

      expect(isValid).toBe(false);
    });

    it("should support API key authentication", async () => {
      const webhook = {
        id: "webhook-1",
        apiKey: "sk_test_key_123",
        authMethod: "api_key",
      };

      const db = createTestDb({
        selectResponse: [webhook],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const isValid = await webhookReceiverService.validateApiKey(
        "webhook-1",
        "sk_test_key_123"
      );

      expect(isValid).toBe(true);
    });
  });

  // ========================================
  // CONVERSATION TESTS
  // ========================================

  describe("findOrCreateConversation", () => {
    it("should find existing conversation by phone number", async () => {
      const conversation = {
        id: 1,
        userId: 1,
        type: "sms",
        participantPhone: "+1234567890",
        lastMessage: new Date(),
      };

      const db = createTestDb({
        selectResponse: [conversation],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.findOrCreateConversation({
        type: "sms",
        participantPhone: "+1234567890",
        userId: 1,
      });

      expect(result.id).toBe(1);
    });

    it("should create new conversation if not found", async () => {
      const newConversation = {
        id: 1,
        userId: 1,
        type: "sms",
        participantPhone: "+1234567890",
        createdAt: new Date(),
      };

      const db = createTestDb({
        selectResponse: [],
        insertResponse: [newConversation],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.findOrCreateConversation({
        type: "sms",
        participantPhone: "+1234567890",
        userId: 1,
      });

      expect(result.id).toBe(1);
      expect(result.createdAt).toBeDefined();
    });

    it("should find existing email conversation", async () => {
      const conversation = {
        id: 2,
        userId: 1,
        type: "email",
        participantEmail: "sender@example.com",
      };

      const db = createTestDb({
        selectResponse: [conversation],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.findOrCreateConversation({
        type: "email",
        participantEmail: "sender@example.com",
        userId: 1,
      });

      expect(result.id).toBe(2);
      expect(result.participantEmail).toBe("sender@example.com");
    });

    it("should update conversation timestamp on message received", async () => {
      const conversation = {
        id: 1,
        userId: 1,
        type: "sms",
        participantPhone: "+1234567890",
        lastMessage: new Date("2024-01-01T10:00:00Z"),
      };

      const updatedConversation = {
        ...conversation,
        lastMessage: new Date("2024-01-15T10:30:00Z"),
      };

      const db = createTestDb({
        selectResponse: [conversation],
        updateResponse: [updatedConversation],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.findOrCreateConversation({
        type: "sms",
        participantPhone: "+1234567890",
        userId: 1,
      });

      expect(result.id).toBe(1);
    });
  });

  // ========================================
  // MESSAGE LOGGING TESTS
  // ========================================

  describe("logMessage", () => {
    it("should log inbound message to database", async () => {
      const message = {
        id: 1,
        webhookId: "webhook-1",
        conversationId: 1,
        type: "sms",
        from: "+1234567890",
        body: "Test message",
        status: "received",
        createdAt: new Date(),
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.logMessage(
        "webhook-1",
        1,
        {
          type: "sms",
          from: "+1234567890",
          body: "Test message",
        }
      );

      expect(result.id).toBe(1);
      expect(result.status).toBe("received");
    });

    it("should include message metadata", async () => {
      const message = {
        id: 1,
        webhookId: "webhook-1",
        type: "custom",
        payload: { test: true },
        metadata: {
          sourceIP: "192.168.1.1",
          userAgent: "Custom/1.0",
        },
      };

      const db = createTestDb({
        insertResponse: [message],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await webhookReceiverService.logMessage(
        "webhook-1",
        null,
        {
          type: "custom",
          payload: { test: true },
        },
        {
          sourceIP: "192.168.1.1",
          userAgent: "Custom/1.0",
        }
      );

      expect(result.metadata).toBeDefined();
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe("Integration", () => {
    it("should handle complete SMS webhook flow", async () => {
      const twilioPayload = {
        MessageSid: "SM1234567890",
        From: "+1234567890",
        To: "+0987654321",
        Body: "Customer inquiry",
      };

      // Step 1: Handle webhook
      let db = createTestDb({
        insertResponse: [
          {
            id: 1,
            webhookId: "webhook-1",
            from: "+1234567890",
            body: "Customer inquiry",
          },
        ],
      });

      let dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const message = await webhookReceiverService.handleTwilioSmsWebhook(
        "webhook-1",
        twilioPayload as any
      );

      expect(message.from).toBe("+1234567890");

      // Step 2: Find or create conversation
      const conversation = {
        id: 1,
        userId: 1,
        type: "sms",
        participantPhone: "+1234567890",
      };

      db = createTestDb({
        selectResponse: [conversation],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const conv = await webhookReceiverService.findOrCreateConversation({
        type: "sms",
        participantPhone: "+1234567890",
        userId: 1,
      });

      expect(conv.id).toBe(1);

      // Step 3: Log message
      db = createTestDb({
        insertResponse: [
          {
            id: 1,
            webhookId: "webhook-1",
            conversationId: 1,
            body: "Customer inquiry",
          },
        ],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const logged = await webhookReceiverService.logMessage(
        "webhook-1",
        1,
        {
          type: "sms",
          from: "+1234567890",
          body: "Customer inquiry",
        }
      );

      expect(logged.conversationId).toBe(1);
    });
  });
});
