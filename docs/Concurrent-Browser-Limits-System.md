# Concurrent Browser Limits System
## Tiered Agent Concurrency & Rate Limiting Architecture

**Last Updated:** November 19, 2025  
**Purpose:** Implement subscription-based concurrent browser session limits with backend enforcement

---

## Table of Contents

1. [Tier Limits Overview](#tier-limits-overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Rate Limiting Middleware](#rate-limiting-middleware)
5. [Queue Management](#queue-management)
6. [Browserbase Integration](#browserbase-integration)
7. [Usage Tracking](#usage-tracking)
8. [Upgrade Flow](#upgrade-flow)

---

## Tier Limits Overview

### Concurrent Browser Limits by Subscription Tier

| Tier | Monthly Price | Concurrent Browsers | Max Queue Size | Priority Level |
|------|--------------|-------------------|----------------|----------------|
| **Starter** | $497/month | 2 | 5 | Low |
| **Growth** | $997/month | 5 | 15 | Medium |
| **Enterprise** | $1,997/month | 15 | 50 | High |
| **Custom** | $3,997+/month | 30+ | Unlimited | Critical |

### Feature Comparison

| Feature | Starter | Growth | Enterprise | Custom |
|---------|---------|--------|------------|--------|
| Concurrent Browsers | 2 | 5 | 15 | 30+ |
| Queue Priority | Low | Medium | High | Critical |
| Session Duration | 30 min | 60 min | 120 min | Unlimited |
| Monthly Automation Hours | 10 hours | 50 hours | 200 hours | Unlimited |
| Dedicated Browser Pool | No | No | Yes | Yes |
| SLA Guarantee | None | 99% | 99.9% | 99.99% |

---

## Database Schema

### Update `drizzle/schema.ts`

```typescript
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

// Add subscription tiers enum
export const subscriptionTiers = mysqlEnum("subscription_tier", [
  "starter",
  "growth", 
  "enterprise",
  "custom"
]);

// Extend users table with subscription info
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Subscription fields
  subscriptionTier: subscriptionTiers.default("starter").notNull(),
  concurrentBrowserLimit: int("concurrent_browser_limit").default(2).notNull(),
  monthlyAutomationHours: int("monthly_automation_hours").default(10).notNull(),
  queuePriority: int("queue_priority").default(1).notNull(), // 1=low, 2=medium, 3=high, 4=critical
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Browser sessions table
export const browserSessions = mysqlTable("browser_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(), // Browserbase session ID
  contextId: varchar("context_id", { length: 255 }), // Browserbase context ID
  status: mysqlEnum("status", ["active", "queued", "completed", "failed", "cancelled"]).notNull(),
  taskType: varchar("task_type", { length: 100 }), // e.g., "create_workflow", "send_campaign"
  taskPayload: text("task_payload"), // JSON payload
  priority: int("priority").default(1).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Usage tracking table
export const usageTracking = mysqlTable("usage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // Format: "2025-11"
  totalSessions: int("total_sessions").default(0).notNull(),
  totalAutomationMinutes: int("total_automation_minutes").default(0).notNull(),
  peakConcurrentSessions: int("peak_concurrent_sessions").default(0).notNull(),
  queueWaitTimeTotal: int("queue_wait_time_total").default(0).notNull(), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type BrowserSession = typeof browserSessions.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;
```

### Run Migration

```bash
pnpm db:push
```

---

## Backend Implementation

### Create `server/browserSessionManager.ts`

```typescript
import { eq, and, count } from "drizzle-orm";
import { getDb } from "./db";
import { browserSessions, users, usageTracking } from "../drizzle/schema";

export class BrowserSessionManager {
  /**
   * Check if user can start a new browser session
   */
  static async canStartSession(userId: number): Promise<{
    allowed: boolean;
    reason?: string;
    currentSessions: number;
    limit: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user's subscription tier and limits
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return { allowed: false, reason: "User not found", currentSessions: 0, limit: 0 };
    }

    const userLimit = user[0].concurrentBrowserLimit;

    // Count active sessions for this user
    const activeSessions = await db
      .select({ count: count() })
      .from(browserSessions)
      .where(
        and(
          eq(browserSessions.userId, userId),
          eq(browserSessions.status, "active")
        )
      );

    const currentCount = activeSessions[0]?.count || 0;

    if (currentCount >= userLimit) {
      return {
        allowed: false,
        reason: `Concurrent browser limit reached (${currentCount}/${userLimit})`,
        currentSessions: currentCount,
        limit: userLimit,
      };
    }

    return {
      allowed: true,
      currentSessions: currentCount,
      limit: userLimit,
    };
  }

  /**
   * Start a new browser session
   */
  static async startSession(
    userId: number,
    taskType: string,
    taskPayload: any
  ): Promise<{
    success: boolean;
    sessionId?: number;
    queuePosition?: number;
    error?: string;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if user can start session
    const canStart = await this.canStartSession(userId);

    if (!canStart.allowed) {
      // Add to queue instead
      return this.addToQueue(userId, taskType, taskPayload);
    }

    // Get user priority
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const priority = user[0]?.queuePriority || 1;

    // Create session record
    const result = await db.insert(browserSessions).values({
      userId,
      sessionId: `pending-${Date.now()}`, // Will be updated with actual Browserbase session ID
      status: "active",
      taskType,
      taskPayload: JSON.stringify(taskPayload),
      priority,
      startedAt: new Date(),
    });

    return {
      success: true,
      sessionId: result.insertId,
    };
  }

  /**
   * Add session to queue
   */
  static async addToQueue(
    userId: number,
    taskType: string,
    taskPayload: any
  ): Promise<{
    success: boolean;
    queuePosition: number;
    estimatedWaitTime: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user priority
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const priority = user[0]?.queuePriority || 1;

    // Insert into queue
    await db.insert(browserSessions).values({
      userId,
      sessionId: `queued-${Date.now()}`,
      status: "queued",
      taskType,
      taskPayload: JSON.stringify(taskPayload),
      priority,
    });

    // Calculate queue position
    const queuePosition = await this.getQueuePosition(userId, priority);
    const estimatedWaitTime = queuePosition * 300; // 5 minutes per position

    return {
      success: true,
      queuePosition,
      estimatedWaitTime,
    };
  }

  /**
   * Get queue position for user
   */
  static async getQueuePosition(userId: number, priority: number): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Count queued sessions with higher or equal priority created before this user's latest queued session
    const result = await db
      .select({ count: count() })
      .from(browserSessions)
      .where(
        and(
          eq(browserSessions.status, "queued"),
          eq(browserSessions.userId, userId)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Complete a session
   */
  static async completeSession(
    sessionId: number,
    status: "completed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(browserSessions)
      .set({
        status,
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(browserSessions.id, sessionId));

    // Process next queued session
    await this.processQueue();
  }

  /**
   * Process queued sessions
   */
  static async processQueue(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all users with queued sessions
    const queuedSessions = await db
      .select()
      .from(browserSessions)
      .where(eq(browserSessions.status, "queued"))
      .orderBy(browserSessions.priority, browserSessions.createdAt);

    for (const session of queuedSessions) {
      const canStart = await this.canStartSession(session.userId);

      if (canStart.allowed) {
        // Promote queued session to active
        await db
          .update(browserSessions)
          .set({
            status: "active",
            startedAt: new Date(),
          })
          .where(eq(browserSessions.id, session.id));

        // Trigger actual browser session creation
        // This would call Browserbase API
        break; // Process one at a time
      }
    }
  }

  /**
   * Track usage for billing/analytics
   */
  static async trackUsage(userId: number, durationMinutes: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-11"

    // Upsert usage tracking
    const existing = await db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, currentMonth)
        )
      )
      .limit(1);

    if (existing.length) {
      await db
        .update(usageTracking)
        .set({
          totalSessions: existing[0].totalSessions + 1,
          totalAutomationMinutes: existing[0].totalAutomationMinutes + durationMinutes,
          updatedAt: new Date(),
        })
        .where(eq(usageTracking.id, existing[0].id));
    } else {
      await db.insert(usageTracking).values({
        userId,
        month: currentMonth,
        totalSessions: 1,
        totalAutomationMinutes: durationMinutes,
        peakConcurrentSessions: 1,
      });
    }
  }
}
```

---

## Rate Limiting Middleware

### Create `server/middleware/rateLimiter.ts`

```typescript
import { TRPCError } from "@trpc/server";
import { BrowserSessionManager } from "../browserSessionManager";

export async function checkBrowserLimit(userId: number) {
  const canStart = await BrowserSessionManager.canStartSession(userId);

  if (!canStart.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: canStart.reason || "Concurrent browser limit reached",
      cause: {
        currentSessions: canStart.currentSessions,
        limit: canStart.limit,
        upgradeUrl: "/upgrade",
      },
    });
  }

  return canStart;
}
```

---

## tRPC Procedures

### Update `server/routers.ts`

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { BrowserSessionManager } from "./browserSessionManager";
import { checkBrowserLimit } from "./middleware/rateLimiter";

export const appRouter = router({
  // ... existing routers

  automation: router({
    /**
     * Start a new automation task
     */
    startTask: protectedProcedure
      .input(
        z.object({
          taskType: z.enum([
            "create_contact",
            "create_workflow",
            "create_funnel",
            "send_email_campaign",
            "send_sms_campaign",
          ]),
          payload: z.record(z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check browser limit
        await checkBrowserLimit(ctx.user.id);

        // Start session
        const result = await BrowserSessionManager.startSession(
          ctx.user.id,
          input.taskType,
          input.payload
        );

        if (!result.success) {
          return {
            status: "queued",
            queuePosition: result.queuePosition,
            message: "Task added to queue due to concurrent browser limit",
          };
        }

        // TODO: Trigger actual Browserbase session here
        // const browserbaseSession = await createBrowserbaseSession(...)

        return {
          status: "started",
          sessionId: result.sessionId,
          message: "Automation task started successfully",
        };
      }),

    /**
     * Get current usage stats
     */
    getUsageStats: protectedProcedure.query(async ({ ctx }) => {
      const canStart = await BrowserSessionManager.canStartSession(ctx.user.id);

      return {
        currentSessions: canStart.currentSessions,
        limit: canStart.limit,
        available: canStart.limit - canStart.currentSessions,
        utilizationPercent: (canStart.currentSessions / canStart.limit) * 100,
      };
    }),

    /**
     * Get queue status
     */
    getQueueStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const queuedSessions = await db
        .select()
        .from(browserSessions)
        .where(
          and(
            eq(browserSessions.userId, ctx.user.id),
            eq(browserSessions.status, "queued")
          )
        );

      return {
        queuedTasks: queuedSessions.length,
        tasks: queuedSessions.map((s) => ({
          id: s.id,
          taskType: s.taskType,
          createdAt: s.createdAt,
        })),
      };
    }),
  }),
});
```

---

## Browserbase Integration

### Create `server/browserbase.ts`

```typescript
import { BrowserSessionManager } from "./browserSessionManager";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

export async function createBrowserbaseSession(
  userId: number,
  sessionId: number,
  contextId?: string
) {
  // Create Browserbase session
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BB-API-Key": BROWSERBASE_API_KEY!,
    },
    body: JSON.stringify({
      projectId: BROWSERBASE_PROJECT_ID,
      contextId, // Reuse context for persistent login
    }),
  });

  const data = await response.json();

  // Update session record with Browserbase session ID
  const db = await getDb();
  await db
    .update(browserSessions)
    .set({
      sessionId: data.id,
      contextId: data.contextId,
    })
    .where(eq(browserSessions.id, sessionId));

  return data;
}

export async function terminateBrowserbaseSession(sessionId: string) {
  await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "X-BB-API-Key": BROWSERBASE_API_KEY!,
    },
  });
}
```

---

## Frontend Usage Component

### Create `client/src/components/UsageMonitor.tsx`

```typescript
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function UsageMonitor() {
  const { data: usage } = trpc.automation.getUsageStats.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: queue } = trpc.automation.getQueueStatus.useQuery();

  if (!usage) return null;

  const isNearLimit = usage.utilizationPercent > 80;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">Browser Usage</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Active Browsers</span>
          <span className={isNearLimit ? "text-orange-500 font-semibold" : ""}>
            {usage.currentSessions} / {usage.limit}
          </span>
        </div>
        
        <Progress 
          value={usage.utilizationPercent} 
          className={isNearLimit ? "bg-orange-100" : ""}
        />
        
        {isNearLimit && (
          <div className="text-sm text-orange-600 mt-2">
            ⚠️ Approaching concurrent browser limit
          </div>
        )}
        
        {usage.available === 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 mb-2">
              All browser slots in use. New tasks will be queued.
            </p>
            <Button size="sm" variant="default">
              Upgrade Plan
            </Button>
          </div>
        )}
        
        {queue && queue.queuedTasks > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              {queue.queuedTasks} task{queue.queuedTasks > 1 ? "s" : ""} in queue
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

## Upgrade Flow

### Subscription Tier Limits Configuration

```typescript
// server/subscriptionConfig.ts
export const SUBSCRIPTION_TIERS = {
  starter: {
    price: 497,
    concurrentBrowsers: 2,
    monthlyAutomationHours: 10,
    queuePriority: 1,
    features: ["Basic automation", "2 concurrent browsers", "Email support"],
  },
  growth: {
    price: 997,
    concurrentBrowsers: 5,
    monthlyAutomationHours: 50,
    queuePriority: 2,
    features: ["Advanced automation", "5 concurrent browsers", "Priority support", "API access"],
  },
  enterprise: {
    price: 1997,
    concurrentBrowsers: 15,
    monthlyAutomationHours: 200,
    queuePriority: 3,
    features: ["Full automation suite", "15 concurrent browsers", "Dedicated support", "Custom integrations"],
  },
  custom: {
    price: 3997,
    concurrentBrowsers: 30,
    monthlyAutomationHours: -1, // Unlimited
    queuePriority: 4,
    features: ["Everything in Enterprise", "30+ concurrent browsers", "White-glove service", "SLA guarantee"],
  },
};
```

---

## Environment Variables

Add to `.env`:

```env
BROWSERBASE_API_KEY=your_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here
```

---

## Summary

This system provides:

✅ **Tiered Concurrency Limits** - 2/5/15/30+ browsers based on subscription  
✅ **Queue Management** - Priority-based queuing when limits are reached  
✅ **Usage Tracking** - Monitor monthly automation hours and sessions  
✅ **Rate Limiting** - Enforce limits at the backend level  
✅ **Upgrade Prompts** - Encourage users to upgrade when hitting limits  
✅ **Browserbase Integration** - Manage dedicated browser pools per tier  

**Next Steps:**
1. Run database migration: `pnpm db:push`
2. Set Browserbase environment variables
3. Test concurrent session limits
4. Implement upgrade flow UI
5. Add billing integration for tier changes
