/**
 * Alerting Service - Handles alert notifications and delivery
 */

import { getDb } from "../db";
import { inAppNotifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const alertingService = {
  /**
   * Get in-app notifications for a user
   */
  async getInAppNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
    } = {}
  ) {
    const database = await getDb();
    if (!database) {
      return [];
    }

    const { unreadOnly = false, limit = 50 } = options;

    let whereConditions = [
      eq(inAppNotifications.userId, userId),
      eq(inAppNotifications.isDismissed, false),
    ];

    if (unreadOnly) {
      whereConditions.push(eq(inAppNotifications.isRead, false));
    }

    const notifications = await database
      .select()
      .from(inAppNotifications)
      .where(and(...whereConditions))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit);

    return notifications;
  },

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: number, userId: string) {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    await database
      .update(inAppNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inAppNotifications.id, notificationId),
          eq(inAppNotifications.userId, userId)
        )
      );
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string) {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    await database
      .update(inAppNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.isRead, false)
        )
      );
  },

  /**
   * Create an in-app notification
   */
  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: "info" | "warning" | "error" | "success";
    priority?: number;
    alertHistoryId?: number;
    metadata?: Record<string, any>;
  }) {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    const [notification] = await database
      .insert(inAppNotifications)
      .values({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "info",
        priority: params.priority || 5,
        alertHistoryId: params.alertHistoryId,
        metadata: params.metadata || {},
      })
      .returning();

    return notification;
  },
};
