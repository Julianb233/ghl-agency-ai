/**
 * Unit Tests for Agency Tasks Router
 *
 * Tests task CRUD operations, status transitions, human review flow,
 * task execution trigger, and filtering/pagination
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { agencyTasksRouter } from "./agencyTasks";
import {
  createMockContext,
  mockEnv,
} from "@/__tests__/helpers/test-helpers";
import { createTestDb } from "@/__tests__/helpers/test-db";

// Mock dependencies
vi.mock("@/server/db");

describe("Agency Tasks Router", () => {
  let mockCtx: any;
  let restoreEnv: () => void;

  beforeEach(() => {
    mockCtx = createMockContext({ id: 1 });
    vi.clearAllMocks();

    // Mock environment variables
    restoreEnv = mockEnv({
      DATABASE_URL: "postgresql://test:test@localhost/test",
    });
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  // ========================================
  // CREATE TASK TESTS
  // ========================================

  describe("create", () => {
    it("should create a new task with required fields", async () => {
      const newTask = {
        id: 1,
        userId: 1,
        sourceType: "manual",
        title: "Test Task",
        description: "Test description",
        category: "general",
        taskType: "api_call",
        priority: "medium",
        urgency: "normal",
        status: "pending",
        assignedToBot: true,
        requiresHumanReview: false,
        executionType: "automatic",
        executionConfig: {},
        scheduledFor: null,
        deadline: null,
        dependsOn: null,
        tags: [],
        metadata: {},
        notifyOnComplete: true,
        notifyOnFailure: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = createTestDb({
        insertResponse: [newTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.create({
        title: "Test Task",
        description: "Test description",
        taskType: "api_call",
        priority: "medium",
      });

      expect(result.id).toBe(1);
      expect(result.title).toBe("Test Task");
      expect(result.status).toBe("pending");
    });

    it("should apply default values for optional fields", async () => {
      const task = {
        id: 1,
        userId: 1,
        sourceType: "manual",
        title: "Minimal Task",
        category: "general",
        taskType: "browser_automation",
        priority: "medium",
        urgency: "normal",
        status: "pending",
        assignedToBot: true,
        requiresHumanReview: false,
        executionType: "automatic",
        createdAt: new Date(),
      };

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.create({
        title: "Minimal Task",
        taskType: "browser_automation",
      });

      expect(result.priority).toBe("medium");
      expect(result.urgency).toBe("normal");
      expect(result.assignedToBot).toBe(true);
      expect(result.requiresHumanReview).toBe(false);
    });

    it("should validate required fields", async () => {
      const db = createTestDb();

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.create({
          title: "",
          taskType: "api_call",
        })
      ).rejects.toThrow();
    });

    it("should support task dependencies", async () => {
      const task = {
        id: 2,
        userId: 1,
        title: "Dependent Task",
        taskType: "api_call",
        dependsOn: [1],
        createdAt: new Date(),
      };

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.create({
        title: "Dependent Task",
        taskType: "api_call",
        dependsOn: [1],
      });

      expect(result.dependsOn).toEqual([1]);
    });

    it("should accept deadline and scheduled dates", async () => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 86400000); // 1 day from now
      const scheduled = new Date(now.getTime() + 3600000); // 1 hour from now

      const task = {
        id: 1,
        userId: 1,
        title: "Scheduled Task",
        taskType: "notification",
        deadline,
        scheduledFor: scheduled,
        createdAt: new Date(),
      };

      const db = createTestDb({
        insertResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.create({
        title: "Scheduled Task",
        taskType: "notification",
        deadline: deadline.toISOString(),
        scheduledFor: scheduled.toISOString(),
      });

      expect(result.deadline).toBeDefined();
      expect(result.scheduledFor).toBeDefined();
    });

    it("should throw error if database not initialized", async () => {
      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(null)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.create({
          title: "Test",
          taskType: "api_call",
        })
      ).rejects.toThrow("Database not initialized");
    });
  });

  // ========================================
  // LIST TASKS TESTS
  // ========================================

  describe("list", () => {
    it("should list tasks with pagination", async () => {
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        title: `Task ${i + 1}`,
        taskType: "api_call",
        priority: "medium",
        status: "pending",
        createdAt: new Date(),
      }));

      const paginatedTasks = tasks.slice(0, 20);

      const db = createTestDb({
        selectResponse: paginatedTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(20);
    });

    it("should filter tasks by status", async () => {
      const pendingTasks = [
        {
          id: 1,
          userId: 1,
          title: "Pending Task",
          status: "pending",
          createdAt: new Date(),
        },
      ];

      const db = createTestDb({
        selectResponse: pendingTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        status: "pending",
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });

    it("should filter tasks by multiple statuses", async () => {
      const tasks = [
        { id: 1, userId: 1, title: "Pending", status: "pending" },
        { id: 2, userId: 1, title: "In Progress", status: "in_progress" },
        { id: 3, userId: 1, title: "Completed", status: "completed" },
      ];

      const filteredTasks = tasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress"
      );

      const db = createTestDb({
        selectResponse: filteredTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        statuses: ["pending", "in_progress"],
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(2);
    });

    it("should filter tasks by priority", async () => {
      const highPriorityTasks = [
        {
          id: 1,
          userId: 1,
          title: "Critical Task",
          priority: "critical",
          status: "pending",
        },
      ];

      const db = createTestDb({
        selectResponse: highPriorityTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        priority: "critical",
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe("critical");
    });

    it("should filter by task type", async () => {
      const automationTasks = [
        {
          id: 1,
          userId: 1,
          title: "Automation",
          taskType: "browser_automation",
        },
      ];

      const db = createTestDb({
        selectResponse: automationTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        taskType: "browser_automation",
        limit: 20,
        offset: 0,
      });

      expect(result[0].taskType).toBe("browser_automation");
    });

    it("should filter by human review requirement", async () => {
      const reviewTasks = [
        {
          id: 1,
          userId: 1,
          title: "Needs Review",
          requiresHumanReview: true,
        },
      ];

      const db = createTestDb({
        selectResponse: reviewTasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        requiresHumanReview: true,
        limit: 20,
        offset: 0,
      });

      expect(result[0].requiresHumanReview).toBe(true);
    });

    it("should sort tasks by different fields", async () => {
      const tasks = [
        {
          id: 1,
          userId: 1,
          title: "Task A",
          priority: "high",
          createdAt: new Date("2024-01-01"),
        },
        {
          id: 2,
          userId: 1,
          title: "Task B",
          priority: "low",
          createdAt: new Date("2024-01-02"),
        },
      ];

      const db = createTestDb({
        selectResponse: tasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(2);
    });

    it("should support text search", async () => {
      const searchResults = [
        {
          id: 1,
          userId: 1,
          title: "Customer notification task",
          description: "Send notification to customer",
        },
      ];

      const db = createTestDb({
        selectResponse: searchResults,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        search: "notification",
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(1);
    });

    it("should filter by scheduled date range", async () => {
      const beforeDate = new Date("2024-01-02");
      const afterDate = new Date("2024-01-01");

      const tasks = [
        {
          id: 1,
          userId: 1,
          title: "Scheduled Task",
          scheduledFor: new Date("2024-01-01T12:00:00"),
        },
      ];

      const db = createTestDb({
        selectResponse: tasks,
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.list({
        scheduledBefore: beforeDate.toISOString(),
        scheduledAfter: afterDate.toISOString(),
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(1);
    });
  });

  // ========================================
  // UPDATE TASK TESTS
  // ========================================

  describe("update", () => {
    it("should update task fields", async () => {
      const originalTask = {
        id: 1,
        userId: 1,
        title: "Original Title",
        priority: "medium",
        status: "pending",
      };

      const updatedTask = {
        ...originalTask,
        title: "Updated Title",
        priority: "high",
      };

      const db = createTestDb({
        selectResponse: [originalTask],
        updateResponse: [updatedTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        title: "Updated Title",
        priority: "high",
      });

      expect(result.title).toBe("Updated Title");
      expect(result.priority).toBe("high");
    });

    it("should throw error if task not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.update({
          id: 999,
          title: "Updated",
        })
      ).rejects.toThrow("Task not found");
    });

    it("should update task status with reason", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "pending",
        statusReason: null,
      };

      const updatedTask = {
        ...task,
        status: "cancelled",
        statusReason: "Cancelled by user",
      };

      const db = createTestDb({
        selectResponse: [task],
        updateResponse: [updatedTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        status: "cancelled",
        statusReason: "Cancelled by user",
      });

      expect(result.status).toBe("cancelled");
      expect(result.statusReason).toBe("Cancelled by user");
    });

    it("should update metadata", async () => {
      const task = {
        id: 1,
        userId: 1,
        metadata: { version: 1 },
      };

      const updatedTask = {
        ...task,
        metadata: { version: 1, lastUpdatedBy: "system" },
      };

      const db = createTestDb({
        selectResponse: [task],
        updateResponse: [updatedTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        metadata: { lastUpdatedBy: "system" },
      });

      expect(result.metadata.lastUpdatedBy).toBe("system");
    });
  });

  // ========================================
  // GET TASK TESTS
  // ========================================

  describe("get", () => {
    it("should retrieve task by id", async () => {
      const task = {
        id: 1,
        userId: 1,
        title: "Test Task",
        priority: "high",
        status: "in_progress",
      };

      const db = createTestDb({
        selectResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.get({ id: 1 });

      expect(result.id).toBe(1);
      expect(result.title).toBe("Test Task");
    });

    it("should throw error if task not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.get({ id: 999 })
      ).rejects.toThrow("Task not found");
    });
  });

  // ========================================
  // DELETE TASK TESTS
  // ========================================

  describe("delete", () => {
    it("should delete task", async () => {
      const task = {
        id: 1,
        userId: 1,
        title: "Task to delete",
      };

      const db = createTestDb({
        selectResponse: [task],
        deleteResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result.success).toBe(true);
    });

    it("should throw error if task not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.delete({ id: 999 })
      ).rejects.toThrow("Task not found");
    });
  });

  // ========================================
  // HUMAN REVIEW TESTS
  // ========================================

  describe("approveTask", () => {
    it("should approve task requiring human review", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "waiting_input",
        requiresHumanReview: true,
        humanReviewStatus: "pending",
      };

      const approvedTask = {
        ...task,
        status: "in_progress",
        humanReviewStatus: "approved",
        approvedBy: 1,
        approvedAt: new Date(),
      };

      const db = createTestDb({
        selectResponse: [task],
        updateResponse: [approvedTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.approveTask({
        id: 1,
        feedback: "Looks good",
      });

      expect(result.humanReviewStatus).toBe("approved");
      expect(result.status).toBe("in_progress");
    });

    it("should throw error if task not waiting for review", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "completed",
        requiresHumanReview: false,
      };

      const db = createTestDb({
        selectResponse: [task],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.approveTask({
          id: 1,
          feedback: "Approved",
        })
      ).rejects.toThrow();
    });
  });

  describe("rejectTask", () => {
    it("should reject task requiring human review", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "waiting_input",
        humanReviewStatus: "pending",
      };

      const rejectedTask = {
        ...task,
        status: "pending",
        humanReviewStatus: "rejected",
        rejectedBy: 1,
        rejectedAt: new Date(),
        rejectionReason: "Needs revision",
      };

      const db = createTestDb({
        selectResponse: [task],
        updateResponse: [rejectedTask],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.rejectTask({
        id: 1,
        reason: "Needs revision",
      });

      expect(result.humanReviewStatus).toBe("rejected");
      expect(result.rejectionReason).toBe("Needs revision");
    });
  });

  // ========================================
  // TASK EXECUTION TESTS
  // ========================================

  describe("executeTask", () => {
    it("should trigger immediate task execution", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "pending",
        executionType: "manual_trigger",
      };

      const executionRecord = {
        id: 1,
        taskId: 1,
        status: "in_progress",
        startedAt: new Date(),
        completedAt: null,
        result: null,
      };

      const db = createTestDb({
        selectResponse: [task],
        insertResponse: [executionRecord],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.executeTask({
        id: 1,
      });

      expect(result.executionId).toBe(1);
      expect(result.status).toBe("in_progress");
    });

    it("should throw error if task not found", async () => {
      const db = createTestDb({
        selectResponse: [],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);

      await expect(
        caller.executeTask({ id: 999 })
      ).rejects.toThrow("Task not found");
    });

    it("should create task execution record", async () => {
      const task = {
        id: 1,
        userId: 1,
        status: "pending",
      };

      const execution = {
        id: 1,
        taskId: 1,
        userId: 1,
        status: "in_progress",
        startedAt: new Date(),
      };

      const db = createTestDb({
        selectResponse: [task],
        insertResponse: [execution],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.executeTask({ id: 1 });

      expect(result.executionId).toBeDefined();
      expect(result.startedAt).toBeDefined();
    });
  });

  // ========================================
  // BULK OPERATIONS TESTS
  // ========================================

  describe("bulkUpdate", () => {
    it("should update multiple tasks", async () => {
      const db = createTestDb({
        updateResponse: [
          { id: 1, status: "completed" },
          { id: 2, status: "completed" },
        ],
      });

      const dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      const caller = agencyTasksRouter.createCaller(mockCtx);
      const result = await caller.bulkUpdate({
        ids: [1, 2],
        status: "completed",
      });

      expect(result.updated).toBe(2);
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe("Integration", () => {
    it("should complete full task lifecycle", async () => {
      // Create task
      let db = createTestDb({
        insertResponse: [
          {
            id: 1,
            userId: 1,
            title: "Integration Test",
            status: "pending",
            requiresHumanReview: true,
          },
        ],
      });

      let dbModule = await import("@/server/db");
      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      let caller = agencyTasksRouter.createCaller(mockCtx);
      const created = await caller.create({
        title: "Integration Test",
        taskType: "api_call",
        requiresHumanReview: true,
      });

      expect(created.id).toBe(1);

      // Update task
      db = createTestDb({
        selectResponse: [created],
        updateResponse: [{ ...created, priority: "high" }],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      caller = agencyTasksRouter.createCaller(mockCtx);
      const updated = await caller.update({
        id: 1,
        priority: "high",
      });

      expect(updated.priority).toBe("high");

      // Approve task
      db = createTestDb({
        selectResponse: [updated],
        updateResponse: [
          {
            ...updated,
            status: "in_progress",
            humanReviewStatus: "approved",
          },
        ],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      caller = agencyTasksRouter.createCaller(mockCtx);
      const approved = await caller.approveTask({
        id: 1,
        feedback: "Proceed",
      });

      expect(approved.humanReviewStatus).toBe("approved");

      // Execute task
      db = createTestDb({
        selectResponse: [approved],
        insertResponse: [
          {
            id: 1,
            taskId: 1,
            status: "in_progress",
            startedAt: new Date(),
          },
        ],
      });

      vi.mocked(dbModule.getDb).mockImplementation(() =>
        Promise.resolve(db as any)
      );

      caller = agencyTasksRouter.createCaller(mockCtx);
      const execution = await caller.executeTask({ id: 1 });

      expect(execution.executionId).toBeDefined();
    });
  });
});
