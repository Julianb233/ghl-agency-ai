/**
 * Alerts Router - API endpoints for alert management
 *
 * Provides comprehensive alert rule management and notification control
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  alertRules,
  alertHistory,
  inAppNotifications,
  alertDeliveryQueue,
  InsertAlertRule,
} from "../../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { alertingService } from "../../services/alerting.service";

// Validation schemas
const notificationChannelSchema = z.object({
  type: z.enum(["email", "slack", "discord", "sms", "in_app"]),
  config: z.any(),
});

const alertConditionsSchema = z.any(); // Flexible schema for different rule types

const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ruleType: z.enum([
    "task_failed",
    "task_timeout",
    "execution_slow",
    "consecutive_failures",
    "high_error_rate",
    "task_not_running",
  ]),
  targetType: z.enum(["all_tasks", "specific_task", "task_group"]).default("all_tasks"),
  targetTaskIds: z.array(z.number()).optional(),
  targetTags: z.array(z.string()).optional(),
  conditions: alertConditionsSchema,
  notificationChannels: z.array(notificationChannelSchema).min(1),
  cooldownMinutes: z.number().min(1).max(1440).default(5),
  aggregationEnabled: z.boolean().default(true),
  maxAlertsPerHour: z.number().min(1).max(100).default(12),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  priority: z.number().min(1).max(10).default(5),
  isActive: z.boolean().default(true),
});

const updateAlertRuleSchema = createAlertRuleSchema.partial().extend({
  id: z.number(),
});

const testAlertRuleSchema = z.object({
  ruleId: z.number(),
  testContext: z.object({
    taskId: z.number().optional(),
    taskName: z.string().optional(),
    executionId: z.number().optional(),
    error: z.string().optional(),
  }).optional(),
});

export const alertsRouter = router({
  /**
   * Create a new alert rule
   */
  createAlertRule: protectedProcedure
    .input(createAlertRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const userId = ctx.user.id;

      // Create alert rule
      const [rule] = await database
        .insert(alertRules)
        .values({
          userId,
          name: input.name,
          description: input.description,
          ruleType: input.ruleType,
          targetType: input.targetType,
          targetTaskIds: input.targetTaskIds,
          targetTags: input.targetTags,
          conditions: input.conditions,
          notificationChannels: input.notificationChannels,
          cooldownMinutes: input.cooldownMinutes,
          aggregationEnabled: input.aggregationEnabled,
          maxAlertsPerHour: input.maxAlertsPerHour,
          severity: input.severity,
          priority: input.priority,
          isActive: input.isActive,
          hourlyResetAt: new Date(Date.now() + 60 * 60 * 1000),
          createdBy: userId,
          lastModifiedBy: userId,
        })
        .returning();

      return {
        success: true,
        rule,
        message: "Alert rule created successfully",
      };
    }),

  /**
   * List all alert rules for current user
   */
  listAlertRules: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        ruleType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const userId = ctx.user.id;
      const filters = {
        isActive: input?.isActive,
        ruleType: input?.ruleType,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      };

      let query = database
        .select()
        .from(alertRules)
        .where(eq(alertRules.userId, userId))
        .orderBy(desc(alertRules.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Apply filters
      if (filters.isActive !== undefined) {
        query = query.where(
          and(
            eq(alertRules.userId, userId),
            eq(alertRules.isActive, filters.isActive)
          )
        ) as typeof query;
      }

      if (filters.ruleType) {
        query = query.where(
          and(
            eq(alertRules.userId, userId),
            eq(alertRules.ruleType, filters.ruleType)
          )
        ) as typeof query;
      }

      const rules = await query;

      // Get total count
      const [{ count }] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(alertRules)
        .where(eq(alertRules.userId, userId));

      return {
        rules,
        total: count,
        limit: filters.limit,
        offset: filters.offset,
      };
    }),

  /**
   * Get a single alert rule by ID
   */
  getAlertRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const rule = await database.query.alertRules.findFirst({
        where: and(
          eq(alertRules.id, input.id),
          eq(alertRules.userId, ctx.user.id)
        ),
      });

      if (!rule) {
        throw new Error("Alert rule not found");
      }

      return rule;
    }),

  /**
   * Update an alert rule
   */
  updateAlertRule: protectedProcedure
    .input(updateAlertRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { id, ...updates } = input;

      // Verify ownership
      const existing = await database.query.alertRules.findFirst({
        where: and(
          eq(alertRules.id, id),
          eq(alertRules.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new Error("Alert rule not found");
      }

      // Update rule
      const [updated] = await database
        .update(alertRules)
        .set({
          ...updates,
          lastModifiedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, id))
        .returning();

      return {
        success: true,
        rule: updated,
        message: "Alert rule updated successfully",
      };
    }),

  /**
   * Delete an alert rule
   */
  deleteAlertRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const existing = await database.query.alertRules.findFirst({
        where: and(
          eq(alertRules.id, input.id),
          eq(alertRules.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new Error("Alert rule not found");
      }

      // Delete rule (cascade will delete related history)
      await database
        .delete(alertRules)
        .where(eq(alertRules.id, input.id));

      return {
        success: true,
        message: "Alert rule deleted successfully",
      };
    }),

  /**
   * Pause/Resume an alert rule
   */
  toggleAlertRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      isPaused: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const existing = await database.query.alertRules.findFirst({
        where: and(
          eq(alertRules.id, input.id),
          eq(alertRules.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new Error("Alert rule not found");
      }

      const [updated] = await database
        .update(alertRules)
        .set({
          isPaused: input.isPaused,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, input.id))
        .returning();

      return {
        success: true,
        rule: updated,
        message: `Alert rule ${input.isPaused ? "paused" : "resumed"} successfully`,
      };
    }),

  /**
   * Test an alert rule (send test notification)
   */
  testAlertRule: protectedProcedure
    .input(testAlertRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const rule = await database.query.alertRules.findFirst({
        where: and(
          eq(alertRules.id, input.ruleId),
          eq(alertRules.userId, ctx.user.id)
        ),
      });

      if (!rule) {
        throw new Error("Alert rule not found");
      }

      // Create test alert context
      const testContext = {
        taskId: input.testContext?.taskId || 0,
        taskName: input.testContext?.taskName || "Test Task",
        executionId: input.testContext?.executionId || 0,
        executionStatus: "test",
        error: input.testContext?.error || "This is a test alert",
        consecutiveFailures: 1,
        metadata: {
          isTest: true,
          triggeredBy: ctx.user.id,
        },
      };

      // Temporarily disable cooldown and rate limiting for test
      const originalCooldown = rule.cooldownMinutes;
      const originalLastAlert = rule.lastAlertSentAt;

      await database
        .update(alertRules)
        .set({
          lastAlertSentAt: null,
          alertsThisHour: 0,
        })
        .where(eq(alertRules.id, input.ruleId));

      // Trigger test alert using the alerting service
      // Note: This is a simplified test - in production, you'd call the service directly
      const title = `TEST ALERT: ${rule.name}`;
      const message = `This is a test notification for alert rule "${rule.name}". If you receive this, your notification channels are configured correctly.`;

      // Create test alert history
      const [testAlert] = await database
        .insert(alertHistory)
        .values({
          ruleId: rule.id,
          userId: ctx.user.id,
          taskId: testContext.taskId,
          executionId: testContext.executionId,
          alertType: rule.ruleType,
          severity: rule.severity,
          title,
          message,
          details: { ...testContext, isTest: true },
          channels: rule.notificationChannels,
          deliveryStatus: [],
          status: "pending",
          triggeredAt: new Date(),
        })
        .returning();

      // Queue test notifications
      const channels = rule.notificationChannels as any[];
      for (const channelConfig of channels) {
        if (channelConfig.type === "in_app") {
          // Create in-app notification
          await database.insert(inAppNotifications).values({
            userId: ctx.user.id,
            alertHistoryId: testAlert.id,
            title,
            message,
            type: "info",
            priority: 5,
            metadata: { isTest: true },
          });
        } else {
          // Queue for delivery
          await database.insert(alertDeliveryQueue).values({
            alertHistoryId: testAlert.id,
            channel: channelConfig.type,
            destination: channelConfig.type === "email"
              ? channelConfig.config.recipients?.join(",") || ""
              : channelConfig.config.webhookUrl || channelConfig.config.phoneNumbers?.join(",") || "",
            payload: { title, message, isTest: true },
            status: "pending",
            priority: 10, // High priority for tests
          });
        }
      }

      // Restore original values
      await database
        .update(alertRules)
        .set({
          lastAlertSentAt: originalLastAlert,
        })
        .where(eq(alertRules.id, input.ruleId));

      return {
        success: true,
        message: "Test alert sent successfully. Check your configured notification channels.",
        alertId: testAlert.id,
      };
    }),

  /**
   * Get alert history
   */
  getAlertHistory: protectedProcedure
    .input(
      z.object({
        ruleId: z.number().optional(),
        taskId: z.number().optional(),
        severity: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const filters = {
        ruleId: input?.ruleId,
        taskId: input?.taskId,
        severity: input?.severity,
        startDate: input?.startDate,
        endDate: input?.endDate,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      };
      const userId = ctx.user.id;

      let whereConditions = [eq(alertHistory.userId, userId)];

      if (filters.ruleId) {
        whereConditions.push(eq(alertHistory.ruleId, filters.ruleId));
      }

      if (filters.taskId) {
        whereConditions.push(eq(alertHistory.taskId, filters.taskId));
      }

      if (filters.severity) {
        whereConditions.push(eq(alertHistory.severity, filters.severity));
      }

      if (filters.startDate) {
        whereConditions.push(gte(alertHistory.triggeredAt, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(alertHistory.triggeredAt, filters.endDate));
      }

      const alerts = await database
        .select()
        .from(alertHistory)
        .where(and(...whereConditions))
        .orderBy(desc(alertHistory.triggeredAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Get total count
      const [{ count }] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(alertHistory)
        .where(and(...whereConditions));

      return {
        alerts,
        total: count,
        limit: filters.limit,
        offset: filters.offset,
      };
    }),

  /**
   * Get alert statistics
   */
  getAlertStats: protectedProcedure
    .input(
      z.object({
        ruleId: z.number().optional(),
        days: z.number().min(1).max(90).default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const filters = input || {};
      const userId = ctx.user.id;
      const cutoffDate = new Date(Date.now() - (filters.days || 30) * 24 * 60 * 60 * 1000);

      let whereConditions = [
        eq(alertHistory.userId, userId),
        gte(alertHistory.triggeredAt, cutoffDate),
      ];

      if (filters.ruleId) {
        whereConditions.push(eq(alertHistory.ruleId, filters.ruleId));
      }

      // Total alerts
      const [{ total }] = await database
        .select({ total: sql<number>`count(*)::int` })
        .from(alertHistory)
        .where(and(...whereConditions));

      // Alerts by severity
      const bySeverity = await database
        .select({
          severity: alertHistory.severity,
          count: sql<number>`count(*)::int`,
        })
        .from(alertHistory)
        .where(and(...whereConditions))
        .groupBy(alertHistory.severity);

      // Alerts by status
      const byStatus = await database
        .select({
          status: alertHistory.status,
          count: sql<number>`count(*)::int`,
        })
        .from(alertHistory)
        .where(and(...whereConditions))
        .groupBy(alertHistory.status);

      // Alerts by rule
      const byRule = await database
        .select({
          ruleId: alertHistory.ruleId,
          ruleName: alertRules.name,
          count: sql<number>`count(*)::int`,
        })
        .from(alertHistory)
        .leftJoin(alertRules, eq(alertHistory.ruleId, alertRules.id))
        .where(and(...whereConditions))
        .groupBy(alertHistory.ruleId, alertRules.name)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(10);

      // Recent alerts
      const recent = await database
        .select()
        .from(alertHistory)
        .where(and(...whereConditions))
        .orderBy(desc(alertHistory.triggeredAt))
        .limit(10);

      return {
        total,
        bySeverity,
        byStatus,
        byRule,
        recent,
        periodDays: filters.days || 30,
      };
    }),

  /**
   * Get in-app notifications
   */
  getNotifications: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      const notifications = await alertingService.getInAppNotifications(
        ctx.user.id,
        {
          unreadOnly: filters.unreadOnly,
          limit: filters.limit,
        }
      );

      const database = await getDb();
      if (!database) {
        return { notifications, total: 0, unreadCount: 0 };
      }

      // Get unread count
      const [{ unreadCount }] = await database
        .select({ unreadCount: sql<number>`count(*)::int` })
        .from(inAppNotifications)
        .where(
          and(
            eq(inAppNotifications.userId, ctx.user.id),
            eq(inAppNotifications.isRead, false)
          )
        );

      return {
        notifications,
        total: notifications.length,
        unreadCount,
      };
    }),

  /**
   * Mark notification as read
   */
  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await alertingService.markNotificationAsRead(input.id, ctx.user.id);

      return {
        success: true,
        message: "Notification marked as read",
      };
    }),

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await alertingService.markAllNotificationsAsRead(ctx.user.id);

      return {
        success: true,
        message: "All notifications marked as read",
      };
    }),

  /**
   * Dismiss notification
   */
  dismissNotification: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      await database
        .update(inAppNotifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inAppNotifications.id, input.id),
            eq(inAppNotifications.userId, ctx.user.id)
          )
        );

      return {
        success: true,
        message: "Notification dismissed",
      };
    }),
});
