/**
 * Agent Permissions Service Tests
 * Unit tests for permission checking and validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AgentPermissionsService,
  AgentPermissionLevel,
  PermissionDeniedError,
  TOOL_RISK_CATEGORIES,
} from "./agentPermissions.service";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([mockUserData])),
              })),
            })),
          })),
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockUserData])),
          })),
        })),
      })),
    })
  ),
}));

let mockUserData: any;

describe("AgentPermissionsService", () => {
  let service: AgentPermissionsService;

  beforeEach(() => {
    service = new AgentPermissionsService();
    mockUserData = {
      id: 1,
      role: "user",
      tierId: 1,
      tierSlug: "starter",
      maxAgents: 5,
      maxConcurrentAgents: 2,
      monthlyExecutionLimit: 200,
      features: {},
    };
  });

  describe("Permission Levels", () => {
    it("should grant admin permission to admin users", async () => {
      mockUserData.role = "admin";
      const level = await service.getUserPermissionLevel(1);
      expect(level).toBe(AgentPermissionLevel.ADMIN);
    });

    it("should grant view_only to users without subscription", async () => {
      mockUserData.tierSlug = null;
      const level = await service.getUserPermissionLevel(1);
      expect(level).toBe(AgentPermissionLevel.VIEW_ONLY);
    });

    it("should grant execute_basic to starter tier users", async () => {
      mockUserData.tierSlug = "starter";
      const level = await service.getUserPermissionLevel(1);
      expect(level).toBe(AgentPermissionLevel.EXECUTE_BASIC);
    });

    it("should grant execute_advanced to enterprise tier users", async () => {
      mockUserData.tierSlug = "enterprise";
      const level = await service.getUserPermissionLevel(1);
      expect(level).toBe(AgentPermissionLevel.EXECUTE_ADVANCED);
    });

    it("should grant execute_advanced to growth tier with feature flag", async () => {
      mockUserData.tierSlug = "growth";
      mockUserData.features = { advancedAgentExecution: true };
      const level = await service.getUserPermissionLevel(1);
      expect(level).toBe(AgentPermissionLevel.EXECUTE_ADVANCED);
    });
  });

  describe("Tool Risk Categories", () => {
    it("should classify file_read as safe", () => {
      const category = (service as any).getToolCategory("file_read");
      expect(category).toBe("safe");
    });

    it("should classify http_request as moderate", () => {
      const category = (service as any).getToolCategory("http_request");
      expect(category).toBe("moderate");
    });

    it("should classify shell_exec as dangerous", () => {
      const category = (service as any).getToolCategory("shell_exec");
      expect(category).toBe("dangerous");
    });

    it("should classify unknown tools as dangerous by default", () => {
      const category = (service as any).getToolCategory("unknown_tool");
      expect(category).toBe("dangerous");
    });
  });

  describe("Tool Execution Permissions", () => {
    it("should allow safe tools for execute_basic level", async () => {
      mockUserData.tierSlug = "starter";
      const result = await service.checkToolExecutionPermission(1, "file_read");
      expect(result.allowed).toBe(true);
      expect(result.permissionLevel).toBe(AgentPermissionLevel.EXECUTE_BASIC);
    });

    it("should deny moderate tools for execute_basic level", async () => {
      mockUserData.tierSlug = "starter";
      const result = await service.checkToolExecutionPermission(1, "http_request");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("cannot execute moderate tools");
    });

    it("should deny dangerous tools for execute_basic level", async () => {
      mockUserData.tierSlug = "starter";
      const result = await service.checkToolExecutionPermission(1, "shell_exec");
      expect(result.allowed).toBe(false);
    });

    it("should allow moderate tools for execute_advanced level", async () => {
      mockUserData.tierSlug = "enterprise";
      const result = await service.checkToolExecutionPermission(1, "http_request");
      expect(result.allowed).toBe(true);
    });

    it("should deny dangerous tools for execute_advanced level", async () => {
      mockUserData.tierSlug = "enterprise";
      const result = await service.checkToolExecutionPermission(1, "file_write");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Admin role required");
    });

    it("should allow all tools for admin level", async () => {
      mockUserData.role = "admin";

      const safeResult = await service.checkToolExecutionPermission(1, "file_read");
      expect(safeResult.allowed).toBe(true);

      const moderateResult = await service.checkToolExecutionPermission(1, "http_request");
      expect(moderateResult.allowed).toBe(true);

      const dangerousResult = await service.checkToolExecutionPermission(1, "shell_exec");
      expect(dangerousResult.allowed).toBe(true);
    });

    it("should deny all execution for view_only level", async () => {
      mockUserData.tierSlug = null;
      const result = await service.checkToolExecutionPermission(1, "file_read");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("View-only access");
    });
  });

  describe("requirePermission", () => {
    it("should throw PermissionDeniedError when permission denied", async () => {
      mockUserData.tierSlug = "starter";

      await expect(
        service.requirePermission(1, "shell_exec")
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("should not throw when permission granted", async () => {
      mockUserData.tierSlug = "starter";

      await expect(
        service.requirePermission(1, "file_read")
      ).resolves.not.toThrow();
    });
  });

  describe("Permission Summary", () => {
    it("should return correct summary for execute_basic level", async () => {
      mockUserData.tierSlug = "starter";
      const summary = await service.getPermissionSummary(1);

      expect(summary.permissionLevel).toBe(AgentPermissionLevel.EXECUTE_BASIC);
      expect(summary.allowedTools.safe.length).toBeGreaterThan(0);
      expect(summary.allowedTools.moderate.length).toBe(0);
      expect(summary.allowedTools.dangerous.length).toBe(0);
    });

    it("should return correct summary for execute_advanced level", async () => {
      mockUserData.tierSlug = "enterprise";
      const summary = await service.getPermissionSummary(1);

      expect(summary.permissionLevel).toBe(AgentPermissionLevel.EXECUTE_ADVANCED);
      expect(summary.allowedTools.safe.length).toBeGreaterThan(0);
      expect(summary.allowedTools.moderate.length).toBeGreaterThan(0);
      expect(summary.allowedTools.dangerous.length).toBe(0);
    });

    it("should return correct summary for admin level", async () => {
      mockUserData.role = "admin";
      const summary = await service.getPermissionSummary(1);

      expect(summary.permissionLevel).toBe(AgentPermissionLevel.ADMIN);
      expect(summary.allowedTools.safe.length).toBeGreaterThan(0);
      expect(summary.allowedTools.moderate.length).toBeGreaterThan(0);
      expect(summary.allowedTools.dangerous.length).toBeGreaterThan(0);
    });
  });

  describe("Tool Risk Categories Constants", () => {
    it("should have defined safe tools", () => {
      expect(TOOL_RISK_CATEGORIES.safe).toContain("file_read");
      expect(TOOL_RISK_CATEGORIES.safe).toContain("retrieve_documentation");
    });

    it("should have defined moderate tools", () => {
      expect(TOOL_RISK_CATEGORIES.moderate).toContain("http_request");
      expect(TOOL_RISK_CATEGORIES.moderate).toContain("browser_click");
    });

    it("should have defined dangerous tools", () => {
      expect(TOOL_RISK_CATEGORIES.dangerous).toContain("file_write");
      expect(TOOL_RISK_CATEGORIES.dangerous).toContain("shell_exec");
    });

    it("should not have overlapping tools between categories", () => {
      const allTools = [
        ...TOOL_RISK_CATEGORIES.safe,
        ...TOOL_RISK_CATEGORIES.moderate,
        ...TOOL_RISK_CATEGORIES.dangerous,
      ];

      const uniqueTools = new Set(allTools);
      expect(allTools.length).toBe(uniqueTools.size);
    });
  });
});

describe("PermissionDeniedError", () => {
  it("should have correct properties", () => {
    const error = new PermissionDeniedError(
      "Access denied",
      AgentPermissionLevel.EXECUTE_BASIC,
      "dangerous"
    );

    expect(error.message).toBe("Access denied");
    expect(error.permissionLevel).toBe(AgentPermissionLevel.EXECUTE_BASIC);
    expect(error.toolCategory).toBe("dangerous");
    expect(error.code).toBe("PERMISSION_DENIED");
    expect(error.name).toBe("PermissionDeniedError");
  });

  it("should be instance of Error", () => {
    const error = new PermissionDeniedError(
      "Access denied",
      AgentPermissionLevel.VIEW_ONLY,
      "safe"
    );

    expect(error).toBeInstanceOf(Error);
  });
});
