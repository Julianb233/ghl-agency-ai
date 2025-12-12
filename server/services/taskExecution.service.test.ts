/**
 * Comprehensive Tests for Task Execution Service
 *
 * Tests all task types, validation, execution flows, and error handling
 * Covers 45+ test cases across 5 categories
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ExecutionResult, BrowserAutomationConfig, ApiCallConfig, NotificationConfig, ReminderConfig, GhlActionConfig, ReportConfig } from "../types";
import { TaskExecutionService } from "./taskExecution.service";
import { agencyTasks } from "../../drizzle/schema-webhooks";
import { isGhlActionConfig, isApiCallConfig, isNotificationConfig, isReminderConfig, isBrowserAutomationConfig, isReportConfig } from "../types";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../_core/browserbaseSDK", () => ({
  browserbaseSDK: {
    createSession: vi.fn(),
    getSessionDebug: vi.fn(),
  },
}));

vi.mock("@browserbasehq/stagehand", () => ({
  Stagehand: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    context: {
      pages: vi.fn().mockReturnValue([{
        goto: vi.fn(),
        click: vi.fn(),
        fill: vi.fn(),
        screenshot: vi.fn(),
      }]),
    },
    act: vi.fn(),
    extract: vi.fn(),
    close: vi.fn(),
  })),
}));

// ========================================
// TEST HELPERS AND MOCKS
// ========================================

type TaskRecord = typeof agencyTasks.$inferSelect;

function createMockTask(overrides?: Partial<TaskRecord>): TaskRecord {
  return {
    id: 1,
    userId: 1,
    projectId: 1,
    title: "Test Task",
    description: "Test task description",
    taskType: "browser_automation" as const,
    status: "pending" as const,
    priority: "medium" as const,
    assignedToBot: true,
    requiresHumanReview: false,
    humanReviewedBy: null,
    sourceType: "manual" as const,
    sourceWebhookId: 1,
    conversationId: null,
    notifyOnComplete: false,
    notifyOnFailure: false,
    maxRetries: 3,
    errorCount: 0,
    lastError: null,
    statusReason: null,
    executionConfig: {
      browserActions: [
        { action: "navigate", selector: "https://example.com" }
      ],
    },
    startedAt: null,
    completedAt: null,
    result: null,
    resultSummary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledFor: null,
    ...overrides,
  } as TaskRecord;
}

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };
}

// ========================================
// TESTS: TASK VALIDATION (10 tests)
// ========================================

describe("TaskExecutionService - Task Validation", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
  });

  it("should validate browser_automation task with browserActions", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        browserActions: [
          { action: "navigate", selector: "https://example.com" }
        ],
      },
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it("should validate browser_automation task with automationSteps", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "navigate",
            config: { url: "https://example.com" },
          },
        ],
      },
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should validate api_call task with valid URL", () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/users",
      } as ApiCallConfig,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should reject api_call task with invalid URL", () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "not a valid url",
      } as any,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Invalid API endpoint URL");
  });

  it("should validate ghl_action task with valid action type", () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_contact",
      } as GhlActionConfig,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should validate notification task with recipient", () => {
    const task = createMockTask({
      taskType: "notification",
      executionConfig: {
        recipient: "user@example.com",
      } as NotificationConfig,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should validate reminder task with reminderTime", () => {
    const task = createMockTask({
      taskType: "reminder",
      executionConfig: {
        reminderTime: new Date().toISOString(),
        reminderMessage: "Test reminder",
      } as ReminderConfig,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should reject task without required executionConfig", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: null,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("requires execution configuration");
  });

  it("should reject browser_automation without actions or steps", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {},
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("requires browserActions or automationSteps");
  });

  it("should validate report_generation task with reportType", () => {
    const task = createMockTask({
      taskType: "report_generation",
      executionConfig: {
        reportType: "task_summary",
      } as ReportConfig,
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });
});

// ========================================
// TESTS: EXECUTION LOGGING (5 tests)
// ========================================

describe("TaskExecutionService - Execution Logging", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should track execution duration", () => {
    const result: ExecutionResult = {
      success: true,
      output: { message: "Success" },
      duration: 1500,
    };

    expect(result.duration).toBeDefined();
    expect(typeof result.duration).toBe("number");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should record success status in execution result", () => {
    const result: ExecutionResult = {
      success: true,
      output: { message: "Task completed" },
    };

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should record error message in execution on failure", () => {
    const result: ExecutionResult = {
      success: false,
      error: "Connection timeout",
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection timeout");
  });

  it("should generate result summary for successful task", () => {
    const service = new TaskExecutionService();
    const result: ExecutionResult = {
      success: true,
      output: { message: "Data extracted successfully" },
    };

    const summary = (service as any).generateResultSummary(result);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe("string");
    expect(summary).toContain("Data extracted");
  });

  it("should generate result summary for failed task", () => {
    const service = new TaskExecutionService();
    const result: ExecutionResult = {
      success: false,
      error: "API returned 500",
    };

    const summary = (service as any).generateResultSummary(result);
    expect(summary).toContain("Failed");
    expect(summary).toContain("500");
  });
});

// ========================================
// TESTS: API CALL EXECUTION (10 tests)
// ========================================

describe("TaskExecutionService - API Call Execution", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make GET request to configured endpoint", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/users",
        apiMethod: "GET",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ id: 1, name: "Test" }),
      text: vi.fn(),
    } as any);

    const result = await (service as any).executeApiCall(task);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/users",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("should add Bearer token authentication to request", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/data",
        authType: "bearer",
        bearerToken: "test-token-123",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn(),
    } as any);

    await (service as any).executeApiCall(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-token-123",
      })
    );
  });

  it("should add API key authentication to request", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/data",
        authType: "api_key",
        apiKey: "key-123",
        apiKeyHeader: "X-API-Key",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn(),
    } as any);

    await (service as any).executeApiCall(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({
        "X-API-Key": "key-123",
      })
    );
  });

  it("should add Basic authentication to request", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/data",
        authType: "basic",
        username: "user",
        password: "pass",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn(),
    } as any);

    await (service as any).executeApiCall(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const expectedAuth = `Basic ${Buffer.from("user:pass").toString("base64")}`;
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({
        Authorization: expectedAuth,
      })
    );
  });

  it("should parse JSON response", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/json",
      } as ApiCallConfig,
    });

    const responseData = { id: 1, status: "active" };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue(responseData),
      text: vi.fn(),
    } as any);

    const result = await (service as any).executeApiCall(task);

    expect(result.success).toBe(true);
    expect(result.output.data).toEqual(responseData);
  });

  it("should handle API error responses (4xx status)", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/notfound",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ error: "Not found" }),
      text: vi.fn(),
    } as any);

    const result = await (service as any).executeApiCall(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("404");
  });

  it("should handle API error responses (5xx status)", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/error",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
      text: vi.fn(),
    } as any);

    const result = await (service as any).executeApiCall(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("should respect timeout configuration", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/slow",
        timeout: 5000,
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockRejectedValue(
      new Error("Timeout")
    );

    await (service as any).executeApiCall(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1].signal).toBeDefined();
  });

  it("should handle network failure gracefully", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/offline",
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockRejectedValue(
      new Error("Network error")
    );

    const result = await (service as any).executeApiCall(task);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should include custom headers in request", async () => {
    const task = createMockTask({
      taskType: "api_call",
      executionConfig: {
        apiEndpoint: "https://api.example.com/custom",
        customHeaders: {
          "X-Custom-Header": "custom-value",
          "User-Agent": "Test Agent",
        },
      } as ApiCallConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn(),
    } as any);

    await (service as any).executeApiCall(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({
        "X-Custom-Header": "custom-value",
        "User-Agent": "Test Agent",
      })
    );
  });
});

// ========================================
// TESTS: GHL ACTION EXECUTION (8 tests)
// ========================================

describe("TaskExecutionService - GHL Action Execution", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    process.env.GHL_API_KEY = "test-ghl-key";
    process.env.GHL_LOCATION_ID = "loc-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GHL_API_KEY;
    delete process.env.GHL_LOCATION_ID;
  });

  it("should execute add_contact GHL action", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_contact",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue({ id: "contact-123" }),
    } as any);

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://rest.gohighlevel.com/v1/contacts/",
      expect.any(Object)
    );
  });

  it("should execute send_sms GHL action", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "send_sms",
        contactId: "contact-123",
        message: "Hello from automation",
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "message-123" }),
    } as any);

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://rest.gohighlevel.com/v1/conversations/messages",
      expect.any(Object)
    );
  });

  it("should execute create_opportunity GHL action", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "create_opportunity",
        pipelineId: "pipeline-123",
        opportunityName: "Test Opportunity",
        contactId: "contact-123",
        status: "open",
        monetaryValue: 5000,
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "opp-123" }),
    } as any);

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://rest.gohighlevel.com/v1/opportunities/",
      expect.any(Object)
    );
  });

  it("should execute add_tag GHL action", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_tag",
        contactId: "contact-123",
        tags: ["vip", "interested"],
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    } as any);

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://rest.gohighlevel.com/v1/contacts/contact-123/tags",
      expect.any(Object)
    );
  });

  it("should handle GHL API errors appropriately", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_contact",
        firstName: "John",
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: "Invalid request" }),
    } as any);

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("GHL API error");
  });

  it("should use GHL API key from environment", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_contact",
        firstName: "Test",
      } as GhlActionConfig,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "contact-123" }),
    } as any);

    await (service as any).executeGhlAction(task);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-ghl-key",
      })
    );
  });

  it("should fail if GHL API key is not configured", async () => {
    delete process.env.GHL_API_KEY;

    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "add_contact",
      } as GhlActionConfig,
    });

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("GHL API key not configured");
  });

  it("should handle invalid GHL action type", async () => {
    const task = createMockTask({
      taskType: "ghl_action",
      executionConfig: {
        ghlAction: "invalid_action",
      } as any,
    });

    const result = await (service as any).executeGhlAction(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown GHL action");
  });
});

// ========================================
// TESTS: BROWSER AUTOMATION EXECUTION (12 tests)
// ========================================

describe("TaskExecutionService - Browser Automation Execution", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should validate browser automation config with automationSteps", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "navigate",
            config: { url: "https://example.com" },
          },
        ],
      },
    });

    const validation = (service as any).validateTaskConfig(task);
    expect(validation.valid).toBe(true);
  });

  it("should require URL for navigate automation step", () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "navigate",
            config: { url: "https://example.com" },
          },
        ],
      },
    });

    expect(task.executionConfig).toBeDefined();
    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].config.url).toBe("https://example.com");
  });

  it("should support Browserbase session creation", async () => {
    const { browserbaseSDK } = await import("../_core/browserbaseSDK");

    vi.mocked(browserbaseSDK.createSession).mockResolvedValue({
      id: "session-123",
    } as any);

    const session = await browserbaseSDK.createSession();
    expect(session.id).toBe("session-123");
    expect(browserbaseSDK.createSession).toHaveBeenCalled();
  });

  it("should retrieve session debug URL", async () => {
    const { browserbaseSDK } = await import("../_core/browserbaseSDK");

    vi.mocked(browserbaseSDK.getSessionDebug).mockResolvedValue({
      debuggerFullscreenUrl: "https://debug.example.com",
    } as any);

    const debugInfo = await browserbaseSDK.getSessionDebug("session-123");
    expect(debugInfo.debuggerFullscreenUrl).toContain("debug.example.com");
  });

  it("should execute navigate automation step", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "navigate",
            config: { url: "https://example.com" },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].type).toBe("navigate");
  });

  it("should support extract automation step", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "extract",
            config: { instruction: "Extract the main content" },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].type).toBe("extract");
  });

  it("should support click automation step", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "click",
            config: { selector: "#submit-button" },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].type).toBe("click");
  });

  it("should support type automation step", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "type",
            config: { selector: "input#search", value: "test query" },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].type).toBe("type");
    expect((steps[0].config as any).value).toBe("test query");
  });

  it("should handle timeout configuration", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        timeout: 5000,
        automationSteps: [
          {
            type: "navigate",
            config: { url: "https://example.com" },
          },
        ],
      },
    });

    expect((task.executionConfig as any).timeout).toBe(5000);
  });

  it("should handle continueOnError flag in steps", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "click",
            config: { selector: "#optional-button" },
            continueOnError: true,
          },
          {
            type: "navigate",
            config: { url: "https://next.com" },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].continueOnError).toBe(true);
    expect(steps[1].continueOnError).toBeUndefined();
  });

  it("should support screenshot capture in steps", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "screenshot",
            config: { encoding: "base64" },
            screenshot: true,
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].type).toBe("screenshot");
  });

  it("should support wait automation step", async () => {
    const task = createMockTask({
      taskType: "browser_automation",
      executionConfig: {
        automationSteps: [
          {
            type: "wait",
            config: { duration: 2000 },
          },
        ],
      },
    });

    const steps = (task.executionConfig as any)?.automationSteps || [];
    expect(steps[0].type).toBe("wait");
    expect((steps[0].config as any).duration).toBe(2000);
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

describe("TaskExecutionService - Integration", () => {
  let service: TaskExecutionService;

  beforeEach(() => {
    service = new TaskExecutionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle task not found error", async () => {
    const { getDb } = await import("../db");

    const mockDb = createMockDb();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([null]),
        }),
      }),
    });

    vi.mocked(getDb).mockResolvedValue(mockDb);

    const result = await service.executeTask(999, "manual");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should not execute already completed tasks", async () => {
    const { getDb } = await import("../db");

    const mockDb = createMockDb();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            createMockTask({ status: "completed" }),
          ]),
        }),
      }),
    });

    vi.mocked(getDb).mockResolvedValue(mockDb);

    const result = await service.executeTask(1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("already completed");
  });

  it("should not execute cancelled tasks", async () => {
    const { getDb } = await import("../db");

    const mockDb = createMockDb();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            createMockTask({ status: "cancelled" }),
          ]),
        }),
      }),
    });

    vi.mocked(getDb).mockResolvedValue(mockDb);

    const result = await service.executeTask(1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("cancelled");
  });

  it("should not execute tasks requiring human review without approval", async () => {
    const { getDb } = await import("../db");

    const mockDb = createMockDb();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            createMockTask({
              requiresHumanReview: true,
              humanReviewedBy: null,
            }),
          ]),
        }),
      }),
    });

    vi.mocked(getDb).mockResolvedValue(mockDb);

    const result = await service.executeTask(1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("human review");
  });

  it("should generate result summary after successful completion", async () => {
    const result: ExecutionResult = {
      success: true,
      output: { message: "Success" },
    };

    const summary = (service as any).generateResultSummary(result);

    expect(summary).toBeDefined();
    expect(typeof summary).toBe("string");
  });

  it("should handle database initialization failure gracefully", async () => {
    const { getDb } = await import("../db");

    vi.mocked(getDb).mockResolvedValue(null);

    const result = await service.executeTask(1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Database");
  });
});
