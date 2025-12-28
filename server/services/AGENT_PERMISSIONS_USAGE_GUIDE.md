# Agent Permissions Service - Developer Usage Guide

## Overview

The Agent Permissions Service provides comprehensive access control for agent executions. This guide shows you how to properly use the security methods to protect your endpoints and services.

---

## Quick Start

### Import the Service

```typescript
import { getAgentPermissionsService } from "../services/agentPermissions.service";

const permissionsService = getAgentPermissionsService();
```

---

## Common Use Cases

### 1. Check if User Can Execute a Tool

**Before executing any agent tool, verify permissions:**

```typescript
// In your route handler or service method
async function executeAgentTool(userId: number, taskId: number, toolName: string) {
  const permissionsService = getAgentPermissionsService();

  // Check complete authorization (ownership + permissions + limits)
  const authCheck = await permissionsService.canExecuteTask(taskId, userId, toolName);

  if (!authCheck.allowed) {
    throw new Error(authCheck.reason);
  }

  // Proceed with execution
  // ...
}
```

**What this does:**
- ✅ Verifies task ownership (tenant isolation)
- ✅ Checks execution limits (concurrent + monthly)
- ✅ Validates tool permission (based on user's permission level)

---

### 2. Verify Task Ownership (Tenant Isolation)

**Always verify ownership before reading or modifying tasks:**

```typescript
// GET /api/tasks/:taskId
async function getTask(userId: number, taskId: number) {
  const permissionsService = getAgentPermissionsService();

  // Verify ownership
  const ownsTask = await permissionsService.verifyTaskOwnership(taskId, userId);

  if (!ownsTask) {
    throw new Error("Task not found or access denied");
  }

  // Safe to fetch task details
  const task = await db.select().from(agencyTasks).where(eq(agencyTasks.id, taskId));
  return task;
}
```

**Security Note:** Even though you verify ownership, still filter by userId in your query for defense-in-depth.

---

### 3. Verify Execution Ownership

**Always verify ownership before accessing execution details:**

```typescript
// GET /api/executions/:executionId
async function getExecution(userId: number, executionId: number) {
  const permissionsService = getAgentPermissionsService();

  // Verify ownership through task relationship
  const ownsExecution = await permissionsService.verifyExecutionOwnership(executionId, userId);

  if (!ownsExecution) {
    throw new Error("Execution not found or access denied");
  }

  // Safe to fetch execution details
  const execution = await db.select().from(taskExecutions)
    .where(eq(taskExecutions.id, executionId));
  return execution;
}
```

---

### 4. Check Execution Limits Before Creating Tasks

**Prevent users from creating tasks they can't execute:**

```typescript
// POST /api/tasks
async function createTask(userId: number, taskData: CreateTaskInput) {
  const permissionsService = getAgentPermissionsService();

  // Check if user can start a new execution
  const limitsCheck = await permissionsService.checkExecutionLimits(userId);

  if (!limitsCheck.canExecute) {
    throw new Error(limitsCheck.reason);
  }

  // Safe to create task
  const task = await db.insert(agencyTasks).values({
    userId,
    ...taskData,
  });

  return task;
}
```

**Returns:**
```typescript
{
  canExecute: boolean;
  reason?: string;
  limits: {
    maxConcurrent: number;      // From subscription tier
    currentActive: number;       // Currently running executions
    monthlyLimit: number;        // From subscription tier
    monthlyUsed: number;         // Executions this month
  }
}
```

---

### 5. Get User's Permission Level

**Display available features in UI:**

```typescript
// For feature flags, UI rendering, etc.
async function getUserFeatures(userId: number) {
  const permissionsService = getAgentPermissionsService();

  const permissionLevel = await permissionsService.getUserPermissionLevel(userId);

  return {
    canExecuteBasic: permissionLevel !== "view_only",
    canExecuteAdvanced: ["execute_advanced", "admin"].includes(permissionLevel),
    canExecuteDangerous: permissionLevel === "admin",
  };
}
```

---

### 6. Get Permission Summary (for Dashboard)

**Display user's capabilities and limits:**

```typescript
// GET /api/permissions/summary
async function getPermissionsSummary(userId: number) {
  const permissionsService = getAgentPermissionsService();

  const summary = await permissionsService.getPermissionSummary(userId);

  return summary;
}
```

**Returns:**
```typescript
{
  permissionLevel: "view_only" | "execute_basic" | "execute_advanced" | "admin";
  allowedTools: {
    safe: string[];       // Tools like file_read, browser_screenshot
    moderate: string[];   // Tools like http_request, browser_click
    dangerous: string[];  // Tools like file_write, shell_exec
  };
  canExecute: boolean;
  limits: {
    maxConcurrent: number;
    currentActive: number;
    monthlyLimit: number;
    monthlyUsed: number;
  }
}
```

---

### 7. Check Tool Permission (Direct)

**For more granular control:**

```typescript
async function checkSpecificTool(userId: number, toolName: string) {
  const permissionsService = getAgentPermissionsService();

  const result = await permissionsService.checkToolExecutionPermission(userId, toolName);

  if (!result.allowed) {
    console.log(`User ${userId} cannot execute ${toolName}: ${result.reason}`);
  }

  return result;
}
```

**Returns:**
```typescript
{
  allowed: boolean;
  reason?: string;
  permissionLevel: AgentPermissionLevel;
  toolCategory: "safe" | "moderate" | "dangerous";
}
```

---

### 8. Validate Permission (Throws on Failure)

**For simpler error handling:**

```typescript
async function executeToolStrictly(userId: number, toolName: string) {
  const permissionsService = getAgentPermissionsService();

  try {
    // This throws PermissionDeniedError if not allowed
    await permissionsService.requirePermission(userId, toolName);

    // Execute tool
    // ...
  } catch (error) {
    if (error.code === "PERMISSION_DENIED") {
      // Handle permission error
      console.error(error.message);
    }
    throw error;
  }
}
```

---

## API Key Authentication

### Using API Keys with Scoped Permissions

```typescript
async function executeWithApiKey(
  userId: number,
  taskId: number,
  toolName: string,
  apiKeyId: number
) {
  const permissionsService = getAgentPermissionsService();

  // Check permission with API key scope validation
  const result = await permissionsService.checkToolExecutionPermission(
    userId,
    toolName,
    apiKeyId  // Optional: validates API key scopes
  );

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  // Execute tool
  // ...
}
```

**API Key Scopes:**
- `agent:execute:safe` - Can execute safe tools
- `agent:execute:moderate` - Can execute moderate tools
- `agent:execute:dangerous` - Can execute dangerous tools
- `agent:execute:*` - Can execute all tools (within user's permission level)
- `*` - Full access

---

## Security Best Practices

### ✅ DO: Always Verify Ownership First

```typescript
// CORRECT: Verify ownership before operations
async function updateTask(userId: number, taskId: number, updates: any) {
  const ownsTask = await permissionsService.verifyTaskOwnership(taskId, userId);
  if (!ownsTask) {
    throw new Error("Access denied");
  }

  // Now safe to update
  await db.update(agencyTasks)
    .set(updates)
    .where(and(
      eq(agencyTasks.id, taskId),
      eq(agencyTasks.userId, userId)  // Defense-in-depth
    ));
}
```

### ❌ DON'T: Skip Ownership Verification

```typescript
// WRONG: No ownership check (SECURITY VULNERABILITY)
async function updateTask(userId: number, taskId: number, updates: any) {
  // Missing ownership verification!
  await db.update(agencyTasks)
    .set(updates)
    .where(eq(agencyTasks.id, taskId));  // User can modify ANY task
}
```

---

### ✅ DO: Check Limits Before Creating Tasks

```typescript
// CORRECT: Check limits before resource creation
async function createTask(userId: number, taskData: any) {
  const limitsCheck = await permissionsService.checkExecutionLimits(userId);
  if (!limitsCheck.canExecute) {
    throw new Error(limitsCheck.reason);
  }

  // Create task
  return await db.insert(agencyTasks).values({ userId, ...taskData });
}
```

### ❌ DON'T: Create Unlimited Tasks

```typescript
// WRONG: No limit checking (users can exceed quota)
async function createTask(userId: number, taskData: any) {
  return await db.insert(agencyTasks).values({ userId, ...taskData });
}
```

---

### ✅ DO: Use canExecuteTask for Complete Authorization

```typescript
// CORRECT: Single method for complete auth check
async function executeAgent(userId: number, taskId: number, toolName: string) {
  const authCheck = await permissionsService.canExecuteTask(taskId, userId, toolName);
  if (!authCheck.allowed) {
    throw new Error(authCheck.reason);
  }

  // Execute
}
```

### ❌ DON'T: Manually Combine Checks (Error-Prone)

```typescript
// WRONG: Manual combination (easy to miss a check)
async function executeAgent(userId: number, taskId: number, toolName: string) {
  const ownsTask = await permissionsService.verifyTaskOwnership(taskId, userId);
  // Oops! Forgot to check limits and tool permissions
  if (!ownsTask) {
    throw new Error("Access denied");
  }
  // Execute (VULNERABILITY: No limit or permission check)
}
```

---

## Common Patterns

### Pattern 1: tRPC Route with Permissions

```typescript
import { protectedProcedure } from "../trpc";
import { z } from "zod";
import { getAgentPermissionsService } from "../../services/agentPermissions.service";

export const agentRouter = router({
  executeTask: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      toolName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const permissionsService = getAgentPermissionsService();

      // Complete authorization check
      const authCheck = await permissionsService.canExecuteTask(
        input.taskId,
        ctx.user.id,
        input.toolName
      );

      if (!authCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: authCheck.reason,
        });
      }

      // Execute task
      // ...
    }),
});
```

---

### Pattern 2: Express Middleware

```typescript
import { Request, Response, NextFunction } from "express";
import { getAgentPermissionsService } from "../services/agentPermissions.service";

export async function requireTaskOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const permissionsService = getAgentPermissionsService();
  const userId = req.user.id;
  const taskId = parseInt(req.params.taskId);

  const ownsTask = await permissionsService.verifyTaskOwnership(taskId, userId);

  if (!ownsTask) {
    return res.status(404).json({ error: "Task not found or access denied" });
  }

  next();
}

// Usage
app.get("/api/tasks/:taskId", requireTaskOwnership, async (req, res) => {
  // Task ownership verified by middleware
  const task = await getTask(req.params.taskId);
  res.json(task);
});
```

---

### Pattern 3: Service Layer Authorization

```typescript
export class TaskExecutionService {
  private permissionsService = getAgentPermissionsService();

  async executeTask(userId: number, taskId: number, toolName: string) {
    // Authorization at service layer
    const authCheck = await this.permissionsService.canExecuteTask(
      taskId,
      userId,
      toolName
    );

    if (!authCheck.allowed) {
      throw new Error(authCheck.reason);
    }

    // Business logic
    return this.performExecution(taskId, toolName);
  }

  private async performExecution(taskId: number, toolName: string) {
    // Internal method - assumes authorization already checked
    // ...
  }
}
```

---

## Error Handling

### Permission Denied Error

```typescript
import { PermissionDeniedError } from "../services/agentPermissions.service";

try {
  await permissionsService.requirePermission(userId, toolName);
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error("Permission denied:", {
      message: error.message,
      permissionLevel: error.permissionLevel,
      toolCategory: error.toolCategory,
      code: error.code, // "PERMISSION_DENIED"
    });
  }
}
```

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getAgentPermissionsService } from "../services/agentPermissions.service";

describe("Agent Permissions", () => {
  let permissionsService: AgentPermissionsService;

  beforeEach(() => {
    permissionsService = getAgentPermissionsService();
  });

  it("should verify task ownership correctly", async () => {
    const userId = 1;
    const taskId = 100;

    const ownsTask = await permissionsService.verifyTaskOwnership(taskId, userId);

    expect(ownsTask).toBe(true);
  });

  it("should deny cross-tenant access", async () => {
    const userId = 1;
    const otherUserTaskId = 999;

    const ownsTask = await permissionsService.verifyTaskOwnership(otherUserTaskId, userId);

    expect(ownsTask).toBe(false);
  });

  it("should enforce execution limits", async () => {
    const userId = 1; // User at limit

    const limitsCheck = await permissionsService.checkExecutionLimits(userId);

    expect(limitsCheck.canExecute).toBe(false);
    expect(limitsCheck.reason).toContain("limit reached");
  });
});
```

---

## Performance Considerations

### Database Queries

Each method makes the following database queries:

| Method | Queries | Joins | Impact |
|--------|---------|-------|--------|
| `getUserPermissionLevel` | 1 | 2 (LEFT JOIN) | Low |
| `verifyTaskOwnership` | 1 | 0 | Very Low |
| `verifyExecutionOwnership` | 1 | 1 (INNER JOIN) | Low |
| `checkExecutionLimits` | 3 | 2 (INNER JOIN each) | Medium |
| `canExecuteTask` | 5 | 4 (combined) | Medium |
| `getPermissionSummary` | 3 | 2 | Medium |

**Optimization Tips:**
1. Cache permission levels for 5 minutes (consider implementing)
2. Use `canExecuteTask` instead of calling methods separately (fewer queries)
3. Batch permission checks when possible
4. Ensure proper database indexes on:
   - `agencyTasks.userId`
   - `taskExecutions.status`
   - `taskExecutions.startedAt`
   - `userSubscriptions.userId`

---

## Security Checklist

Before deploying code that uses agent execution:

- [ ] Ownership verification implemented for all task operations
- [ ] Execution limits checked before creating tasks
- [ ] Tool permissions validated before execution
- [ ] API key scopes verified (if using API keys)
- [ ] Error messages don't leak sensitive information
- [ ] Database queries filter by userId (defense-in-depth)
- [ ] Tests cover cross-tenant access attempts
- [ ] Tests cover limit enforcement
- [ ] Tests cover permission escalation attempts

---

## Support

For questions or security concerns:
- Review: `/root/github-repos/ghl-agency-ai/AGENT_PERMISSIONS_SECURITY_AUDIT.md`
- Service Code: `/root/github-repos/ghl-agency-ai/server/services/agentPermissions.service.ts`
- Contact: Security team or backend lead

---

**Last Updated:** 2025-12-20
**Maintained By:** Sage-Security
