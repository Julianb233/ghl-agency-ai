/**
 * Test Helper Functions
 *
 * Provides mock factories and utilities for testing
 */

import { vi } from "vitest";
import type { TrpcContext } from "../../../../server/_core/context";

/**
 * Create a mock tRPC context with an authenticated user
 */
export function createMockContext(user?: Partial<NonNullable<TrpcContext["user"]>>): TrpcContext {
  const defaultUser = {
    id: 1,
    openId: "test-user-openid",
    googleId: null,
    password: null,
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    onboardingCompleted: true,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...user,
  };

  return {
    user: defaultUser,
    req: {
      protocol: "https",
      headers: {},
      get: vi.fn(),
      header: vi.fn(),
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any,
  };
}

/**
 * Create a mock scheduled task
 */
export function createMockScheduledTask(overrides?: any) {
  return {
    id: 1,
    userId: 1,
    name: "Test Task",
    description: "Test task description",
    automationType: "chat" as const,
    automationConfig: {
      url: "https://example.com",
      instruction: "Test instruction",
    },
    scheduleType: "daily" as const,
    cronExpression: "0 9 * * *",
    timezone: "UTC",
    status: "active" as const,
    isActive: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 60,
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastRun: null,
    nextRun: new Date(),
    averageDuration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 1,
    lastModifiedBy: null,
    ...overrides,
  };
}

/**
 * Create a mock execution result
 */
export function createMockExecutionResult(overrides?: any) {
  return {
    id: 1,
    taskId: 1,
    status: "success" as const,
    startedAt: new Date(),
    completedAt: new Date(),
    duration: 1000,
    result: { success: true },
    error: null,
    retryCount: 0,
    triggeredBy: "schedule" as const,
    ...overrides,
  };
}

/**
 * Create a mock browser session
 */
export function createMockBrowserSession(overrides?: any) {
  return {
    id: 1,
    userId: 1,
    sessionId: "session-123",
    status: "active" as const,
    projectId: "project-123",
    url: "https://example.com",
    debugUrl: "https://browserbase.com/debug/session-123",
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    completedAt: null,
    ...overrides,
  };
}

/**
 * Create a mock integration
 */
export function createMockIntegration(overrides?: any) {
  return {
    id: 1,
    userId: 1,
    service: "google" as const,
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
    expiresAt: new Date(Date.now() + 3600000),
    scope: "email profile",
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock webhook
 */
export function createMockWebhook(overrides?: any) {
  return {
    id: "webhook-uuid-123",
    name: "Test Webhook",
    url: "https://example.com/webhook",
    events: ["quiz.completed", "workflow.executed"],
    secret: "whsec_test123",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock API keys configuration
 */
export function createMockApiKeys() {
  return [
    {
      service: "openai",
      label: "OpenAI Production",
      keyPreview: "sk-...xyz",
      createdAt: new Date().toISOString(),
    },
    {
      service: "anthropic",
      label: "Claude API",
      keyPreview: "sk-ant-...abc",
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Create a mock database instance
 */
export function createMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn(),
  };
}

/**
 * Create a mock fetch function with configurable responses
 */
export function createMockFetch(responses: Record<string, any>) {
  return vi.fn((url: string) => {
    const response = responses[url];
    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        json: () => Promise.reject(new Error("Not found")),
      });
    }

    return Promise.resolve({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      text: () => Promise.resolve(response.text ?? ""),
      json: () => Promise.resolve(response.json ?? {}),
    });
  });
}

/**
 * Mock environment variables
 */
export function mockEnv(vars: Record<string, string>): () => void {
  const originalEnv = { ...process.env };

  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return () => {
    process.env = originalEnv;
  };
}

/**
 * Create a mock Browserbase SDK client
 */
export function createMockBrowserbaseClient() {
  return {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: "session-123",
        createdAt: new Date().toISOString(),
        projectId: "project-123",
        status: "RUNNING",
      }),
      update: vi.fn().mockResolvedValue({
        id: "session-123",
        status: "REQUEST_RELEASE",
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: "session-123",
        status: "RUNNING",
      }),
      list: vi.fn().mockResolvedValue([]),
      debug: vi.fn().mockResolvedValue({
        debuggerUrl: "https://browserbase.com/debug/session-123",
        debuggerFullscreenUrl: "https://browserbase.com/debug/session-123/fullscreen",
        wsUrl: "wss://browserbase.com/ws/session-123",
      }),
      recording: {
        retrieve: vi.fn().mockResolvedValue({
          recordingUrl: "https://browserbase.com/recording/session-123",
          status: "COMPLETED",
        }),
      },
      logs: {
        list: vi.fn().mockResolvedValue([
          {
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Test log",
          },
        ]),
      },
      downloads: {
        list: vi.fn().mockResolvedValue([]),
      },
      uploads: {
        list: vi.fn().mockResolvedValue([]),
      },
    },
  };
}

/**
 * Create a mock Stagehand instance
 */
export function createMockStagehand() {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-screenshot")),
    evaluate: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue("https://example.com"),
  };

  return {
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    act: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn().mockResolvedValue([{ action: "click", selector: "button" }]),
    extract: vi.fn().mockResolvedValue({ data: "extracted" }),
    context: {
      pages: vi.fn().mockReturnValue([mockPage]),
    },
    page: mockPage,
  };
}

/**
 * Create a mock session metrics service
 */
export function createMockSessionMetricsService() {
  return {
    trackSessionStart: vi.fn().mockResolvedValue(undefined),
    trackSessionEnd: vi.fn().mockResolvedValue(undefined),
    trackOperation: vi.fn().mockResolvedValue(undefined),
    getSessionMetrics: vi.fn().mockResolvedValue({
      sessionId: "session-123",
      duration: 1000,
      operationCount: 5,
      operations: [],
    }),
    calculateCost: vi.fn().mockResolvedValue({
      totalCost: 0.50,
      breakdown: {
        sessionTime: 0.25,
        operations: 0.25,
      },
    }),
  };
}

/**
 * Create a mock websocket service
 */
export function createMockWebsocketService() {
  return {
    broadcastToUser: vi.fn(),
    broadcast: vi.fn(),
    sendToUser: vi.fn(),
  };
}

/**
 * Create a mock extracted data record
 */
export function createMockExtractedData(overrides?: any) {
  return {
    id: 1,
    sessionId: 1,
    userId: 1,
    url: "https://example.com",
    dataType: "contactInfo" as const,
    selector: null,
    data: {
      contactInfo: {
        email: "contact@example.com",
        phone: "123-456-7890",
        name: "John Doe",
      },
    },
    metadata: {},
    tags: ["test"],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Wait for a specific amount of time (useful for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock error
 */
export function createMockError(message: string, code?: string) {
  const error = new Error(message) as any;
  if (code) {
    error.code = code;
  }
  return error;
}
