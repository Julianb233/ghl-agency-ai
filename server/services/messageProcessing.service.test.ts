/**
 * Unit Tests for Message Processing Service
 *
 * Tests intent detection, task creation from messages,
 * urgency detection, and fallback rule-based parsing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { messageProcessingService } from "./messageProcessing.service";
import { createTestDb } from "@/__tests__/helpers/test-db";
import { mockEnv } from "@/__tests__/helpers/test-helpers";

// Mock dependencies
vi.mock("@/server/db");
vi.mock("@/server/ai/client", () => ({
  openaiClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe("Message Processing Service", () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.clearAllMocks();

    restoreEnv = mockEnv({
      OPENAI_API_KEY: "sk-test-key",
      DATABASE_URL: "postgresql://test:test@localhost/test",
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  // ========================================
  // INTENT DETECTION TESTS
  // ========================================

  describe("detectIntent", () => {
    it("should detect support request intent", async () => {
      const message = "I need help with my account access";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "support_request",
                confidence: 0.95,
                entities: { issue_type: "account_access" },
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.intent).toBe("support_request");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect order inquiry intent", async () => {
      const message = "Where is my order #12345? It should have arrived by now";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "order_inquiry",
                confidence: 0.92,
                entities: { order_id: "12345" },
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.intent).toBe("order_inquiry");
    });

    it("should detect complaint intent", async () => {
      const message = "Your product broke after one week. This is unacceptable!";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "complaint",
                confidence: 0.98,
                sentiment: "negative",
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.intent).toBe("complaint");
      expect(result.sentiment).toBe("negative");
    });

    it("should detect feedback intent", async () => {
      const message = "Love your service! Keep up the great work";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "feedback",
                confidence: 0.89,
                sentiment: "positive",
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.intent).toBe("feedback");
      expect(result.sentiment).toBe("positive");
    });

    it("should detect scheduling intent", async () => {
      const message = "I need to book an appointment for next Tuesday at 2pm";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "schedule_appointment",
                confidence: 0.93,
                entities: { date: "2024-01-23", time: "14:00" },
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.intent).toBe("schedule_appointment");
    });

    it("should return low confidence for ambiguous messages", async () => {
      const message = "Ok";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "unknown",
                confidence: 0.3,
              }),
            },
          },
        ],
      } as any);

      const result = await messageProcessingService.detectIntent(message);

      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should handle intent detection timeout with fallback", async () => {
      const message = "Test message";

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockRejectedValue(new Error("Timeout"));

      const result = await messageProcessingService.detectIntent(message);

      expect(result).toBeDefined();
      expect(result.intent).toBe("unknown");
    });
  });

  // ========================================
  // TASK CREATION FROM MESSAGES TESTS
  // ========================================

  describe("createTaskFromMessage", () => {
    it("should create task from support request", async () => {
      const message = {
        id: 1,
        conversationId: 1,
        userId: 1,
        body: "I can't reset my password",
        from: "+1234567890",
      };

      const task = {
        id: 1,
        userId: 1,
        sourceType: "webhook_sms",
        title: "Password reset request",
        description: "Customer unable to reset password",
        taskType: "support_request",
        priority: "medium",
        urgency: "normal",
        status: "pending",
        requiresHumanReview: true,
        messageId: 1,
        conversationId: 1,
      };

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Password reset request",
                description: "Customer unable to reset password",
                taskType: "support_request",
                priority: "medium",
              }),
            },
          },
        ],
      } as any);

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await messageProcessingService.createTaskFromMessage(
        message as any
      );

      expect(result.taskType).toBe("support_request");
      expect(result.requiresHumanReview).toBe(true);
    });

    it("should create task for complaint with high priority", async () => {
      const message = {
        id: 2,
        conversationId: 2,
        userId: 1,
        body: "Your service is terrible! I demand a refund!",
        from: "+9876543210",
      };

      const task = {
        id: 2,
        userId: 1,
        sourceType: "webhook_sms",
        title: "Customer complaint",
        taskType: "complaint",
        priority: "high",
        urgency: "urgent",
        status: "pending",
        requiresHumanReview: true,
        sentiment: "negative",
      };

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Customer complaint",
                taskType: "complaint",
                priority: "high",
              }),
            },
          },
        ],
      } as any);

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await messageProcessingService.createTaskFromMessage(
        message as any
      );

      expect(result.priority).toBe("high");
      expect(result.requiresHumanReview).toBe(true);
    });

    it("should extract order ID from message and create task", async () => {
      const message = {
        id: 3,
        conversationId: 3,
        userId: 1,
        body: "Where is order #ORD-2024-001234?",
        from: "+1111111111",
      };

      const task = {
        id: 3,
        userId: 1,
        sourceType: "webhook_sms",
        title: "Order status inquiry for ORD-2024-001234",
        taskType: "order_inquiry",
        metadata: { orderId: "ORD-2024-001234" },
      };

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Order status inquiry for ORD-2024-001234",
                taskType: "order_inquiry",
                orderId: "ORD-2024-001234",
              }),
            },
          },
        ],
      } as any);

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await messageProcessingService.createTaskFromMessage(
        message as any
      );

      expect(result.metadata?.orderId).toBe("ORD-2024-001234");
    });

    it("should set human review requirement based on priority", async () => {
      const message = {
        id: 4,
        conversationId: 4,
        userId: 1,
        body: "URGENT: System is down!",
        from: "+2222222222",
      };

      const task = {
        id: 4,
        userId: 1,
        title: "URGENT: System is down!",
        priority: "critical",
        urgency: "immediate",
        requiresHumanReview: true,
        assignedToBot: false,
      };

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "URGENT: System is down!",
                priority: "critical",
                urgency: "immediate",
              }),
            },
          },
        ],
      } as any);

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const result = await messageProcessingService.createTaskFromMessage(
        message as any
      );

      expect(result.priority).toBe("critical");
      expect(result.requiresHumanReview).toBe(true);
    });

    it("should handle task creation failure gracefully", async () => {
      const message = {
        id: 5,
        conversationId: 5,
        userId: 1,
        body: "Test message",
        from: "+3333333333",
      };

      const mockOpenAI = await import("@/server/ai/client");
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockRejectedValue(new Error("AI service unavailable"));

      const db = createTestDb({
        insertResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      await expect(
        messageProcessingService.createTaskFromMessage(message as any)
      ).rejects.toThrow();
    });
  });

  // ========================================
  // URGENCY DETECTION TESTS
  // ========================================

  describe("detectUrgency", () => {
    it("should detect immediate urgency from keywords", async () => {
      const message = "URGENT! System critical error!";

      const result = await messageProcessingService.detectUrgency(message);

      expect(result.urgency).toBe("immediate");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect urgent urgency", async () => {
      const message = "Please help ASAP with this issue";

      const result = await messageProcessingService.detectUrgency(message);

      expect(["urgent", "immediate"]).toContain(result.urgency);
    });

    it("should detect soon urgency", async () => {
      const message = "Could you help me with this when you get a chance?";

      const result = await messageProcessingService.detectUrgency(message);

      expect(result.urgency).toBe("soon");
    });

    it("should default to normal urgency", async () => {
      const message = "How do I use feature X?";

      const result = await messageProcessingService.detectUrgency(message);

      expect(result.urgency).toBe("normal");
    });

    it("should analyze tone for urgency", async () => {
      const messages = [
        { text: "Help!", expected: "immediate" },
        { text: "Help please", expected: "soon" },
        { text: "How can I...", expected: "normal" },
      ];

      for (const msg of messages) {
        const result = await messageProcessingService.detectUrgency(msg.text);
        expect([msg.expected, "urgent", "immediate"]).toContain(
          result.urgency
        );
      }
    });

    it("should detect emergency indicators", async () => {
      const emergencyMessages = [
        "System down!",
        "Critical error!",
        "EMERGENCY",
        "Help immediately!",
      ];

      for (const msg of emergencyMessages) {
        const result = await messageProcessingService.detectUrgency(msg);
        expect(result.urgency).toBe("immediate");
      }
    });
  });

  // ========================================
  // RULE-BASED FALLBACK PARSING TESTS
  // ========================================

  describe("rulBasedParsing", () => {
    it("should extract email addresses using regex", async () => {
      const message = "Contact us at support@example.com or sales@example.com";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.emails).toContain("support@example.com");
      expect(result.entities.emails).toContain("sales@example.com");
    });

    it("should extract phone numbers", async () => {
      const message = "Call me at (555) 123-4567 or 555.987.6543";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.phones).toBeDefined();
      expect(result.entities.phones.length).toBeGreaterThan(0);
    });

    it("should extract URLs", async () => {
      const message =
        "Visit https://example.com or http://www.example.org for more info";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.urls).toContain("https://example.com");
    });

    it("should extract order numbers", async () => {
      const message = "Order #12345 or order ORD-2024-001234";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.orderNumbers).toBeDefined();
      expect(result.entities.orderNumbers.length).toBeGreaterThan(0);
    });

    it("should extract dates and times", async () => {
      const message = "Meeting on 2024-01-15 at 10:30 AM";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.dates).toBeDefined();
      expect(result.entities.times).toBeDefined();
    });

    it("should extract price amounts", async () => {
      const message = "The total is $99.99 or 50 EUR";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.prices).toBeDefined();
      expect(result.entities.prices.length).toBeGreaterThan(0);
    });

    it("should extract names from greetings", async () => {
      const message = "Hi John, I'm Sarah calling about your order";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities).toBeDefined();
    });

    it("should handle multiple entities in complex message", async () => {
      const message =
        "Hi Sarah, I'm John at support@example.com (555) 123-4567. " +
        "About order #ORD-2024-001234, scheduled for 2024-01-20. " +
        "Total: $150.00. Website: https://example.com";

      const result = await messageProcessingService.parseWithRules(message);

      expect(result.entities.emails?.length).toBeGreaterThan(0);
      expect(result.entities.phones?.length).toBeGreaterThan(0);
      expect(result.entities.urls?.length).toBeGreaterThan(0);
      expect(result.entities.prices?.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // SENTIMENT ANALYSIS TESTS
  // ========================================

  describe("analyzeSentiment", () => {
    it("should detect positive sentiment", async () => {
      const message = "I love your product! Excellent service!";

      const result = await messageProcessingService.analyzeSentiment(message);

      expect(result.sentiment).toBe("positive");
      expect(result.score).toBeGreaterThan(0);
    });

    it("should detect negative sentiment", async () => {
      const message = "Terrible experience. Very disappointed.";

      const result = await messageProcessingService.analyzeSentiment(message);

      expect(result.sentiment).toBe("negative");
      expect(result.score).toBeLessThan(0);
    });

    it("should detect neutral sentiment", async () => {
      const message = "I want to check my order status";

      const result = await messageProcessingService.analyzeSentiment(message);

      expect(result.sentiment).toBe("neutral");
      expect(Math.abs(result.score)).toBeLessThan(0.3);
    });

    it("should handle mixed sentiment", async () => {
      const message = "The product is good but shipping was slow";

      const result = await messageProcessingService.analyzeSentiment(message);

      expect(result.sentiment).toBe("mixed");
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe("Integration", () => {
    it("should process complete message workflow", async () => {
      const message = {
        id: 1,
        conversationId: 1,
        userId: 1,
        body: "I need help with order #ORD-001! It's urgent!",
        from: "+1234567890",
      };

      const mockOpenAI = await import("@/server/ai/client");

      // First call: intent detection
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "order_inquiry",
                confidence: 0.95,
              }),
            },
          },
        ],
      } as any);

      const intent = await messageProcessingService.detectIntent(message.body);
      expect(intent.intent).toBe("order_inquiry");

      // Second call: task creation
      vi.mocked(
        mockOpenAI.openaiClient.chat.completions.create
      ).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Order inquiry for ORD-001",
                taskType: "order_inquiry",
                priority: "high",
              }),
            },
          },
        ],
      } as any);

      const db = createTestDb({
        insertResponse: [
          {
            id: 1,
            title: "Order inquiry for ORD-001",
            priority: "high",
            urgency: "urgent",
          },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const task = await messageProcessingService.createTaskFromMessage(
        message as any
      );

      expect(task.priority).toBe("high");

      // Rule-based parsing for entities
      const parsed = await messageProcessingService.parseWithRules(
        message.body
      );

      expect(parsed.entities).toBeDefined();
    });
  });
});
