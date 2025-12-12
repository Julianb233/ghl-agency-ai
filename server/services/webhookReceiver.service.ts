/**
 * Webhook Receiver Service
 * Handles incoming webhook requests from various channels (SMS, Email, Custom)
 * Parses messages, creates tasks, and manages conversations
 */

import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import {
  userWebhooks,
  inboundMessages,
  botConversations,
  agencyTasks,
  outboundMessages,
} from "../../drizzle/schema-webhooks";
import { MessageProcessingService } from "./messageProcessing.service";

// ========================================
// TYPES
// ========================================

export interface TwilioSmsPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface EmailPayload {
  messageId: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    url: string;
  }>;
}

export interface CustomWebhookPayload {
  messageId?: string;
  sender: string;
  senderName?: string;
  content: string;
  contentType?: string;
  metadata?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    url: string;
  }>;
}

export interface WebhookResponse {
  success: boolean;
  messageId?: number;
  taskId?: number;
  conversationId?: number;
  error?: string;
  reply?: string;
}

// ========================================
// WEBHOOK RECEIVER SERVICE
// ========================================

export class WebhookReceiverService {
  private messageProcessor: MessageProcessingService;

  constructor() {
    this.messageProcessor = new MessageProcessingService();
  }

  /**
   * Process incoming webhook by token
   */
  async processWebhook(
    webhookToken: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<WebhookResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      // Find webhook by token
      const [webhook] = await db
        .select()
        .from(userWebhooks)
        .where(eq(userWebhooks.webhookToken, webhookToken))
        .limit(1);

      if (!webhook) {
        return { success: false, error: "Webhook not found" };
      }

      if (!webhook.isActive) {
        return { success: false, error: "Webhook is inactive" };
      }

      // Validate authentication if configured
      const isValid = await this.validateWebhookAuth(webhook, payload, headers);
      if (!isValid) {
        return { success: false, error: "Authentication failed" };
      }

      // Route to appropriate handler based on channel type
      switch (webhook.channelType) {
        case "sms":
          return this.handleSmsWebhook(webhook, payload);
        case "email":
          return this.handleEmailWebhook(webhook, payload);
        case "custom_webhook":
          return this.handleCustomWebhook(webhook, payload);
        default:
          return { success: false, error: `Unknown channel type: ${webhook.channelType}` };
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate webhook authentication
   */
  private async validateWebhookAuth(
    webhook: typeof userWebhooks.$inferSelect,
    payload: any,
    headers: Record<string, string>
  ): Promise<boolean> {
    const config = webhook.providerConfig as Record<string, any> | null;
    if (!config?.authType || config.authType === "none") {
      return true;
    }

    switch (config.authType) {
      case "bearer":
        const authHeader = headers["authorization"] || headers["Authorization"];
        return authHeader === `Bearer ${config.authToken}`;

      case "api_key":
        const apiKeyHeader = headers[config.authHeader || "x-api-key"];
        return apiKeyHeader === config.authToken;

      case "hmac":
        // Validate HMAC signature
        const signature = headers["x-webhook-signature"] || headers["X-Webhook-Signature"];
        if (!signature) {
          console.warn("HMAC auth configured but no signature provided");
          return false;
        }

        // Use the webhook's secretKey or config hmacSecret
        const secret = webhook.secretKey || config.hmacSecret;
        if (!secret) {
          console.warn("HMAC auth configured but no secret key available");
          return false;
        }

        // Calculate expected signature
        const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(payloadString)
          .digest("hex");

        // Timing-safe comparison to prevent timing attacks
        try {
          return crypto.timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(expectedSignature, "hex")
          );
        } catch {
          // If signatures have different lengths, timingSafeEqual throws
          return false;
        }

      default:
        return true;
    }
  }

  /**
   * Handle SMS webhook (Twilio format)
   */
  private async handleSmsWebhook(
    webhook: typeof userWebhooks.$inferSelect,
    payload: TwilioSmsPayload
  ): Promise<WebhookResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      // Check for attachments
      const hasAttachments = payload.NumMedia && parseInt(payload.NumMedia) > 0;
      const attachments: any[] = [];
      if (hasAttachments) {
        for (let i = 0; i < parseInt(payload.NumMedia!); i++) {
          const urlKey = `MediaUrl${i}` as keyof TwilioSmsPayload;
          const typeKey = `MediaContentType${i}` as keyof TwilioSmsPayload;
          if (payload[urlKey]) {
            attachments.push({
              url: payload[urlKey],
              contentType: payload[typeKey] || "application/octet-stream",
            });
          }
        }
      }

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        webhook,
        payload.From
      );

      // Create inbound message record
      const [message] = await db
        .insert(inboundMessages)
        .values({
          webhookId: webhook.id,
          userId: webhook.userId,
          externalMessageId: payload.MessageSid,
          senderIdentifier: payload.From,
          messageType: "text",
          content: payload.Body,
          hasAttachments: hasAttachments || false,
          attachments: attachments.length > 0 ? attachments : null,
          conversationId: conversation.id,
          rawPayload: payload,
          providerMetadata: {
            accountSid: payload.AccountSid,
            to: payload.To,
          },
          processingStatus: "received",
        })
        .returning();

      // Update webhook stats
      await db
        .update(userWebhooks)
        .set({
          totalMessagesReceived: (webhook.totalMessagesReceived || 0) + 1,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userWebhooks.id, webhook.id));

      // Process the message (parse intent, create task if needed)
      const processingResult = await this.messageProcessor.processMessage(
        message.id,
        webhook.userId
      );

      return {
        success: true,
        messageId: message.id,
        taskId: processingResult.taskId,
        conversationId: conversation.id,
        reply: processingResult.reply,
      };
    } catch (error) {
      console.error("SMS webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle Email webhook
   */
  private async handleEmailWebhook(
    webhook: typeof userWebhooks.$inferSelect,
    payload: EmailPayload
  ): Promise<WebhookResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      const hasAttachments = payload.attachments && payload.attachments.length > 0;

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        webhook,
        payload.from,
        payload.subject
      );

      // Create inbound message record
      const [message] = await db
        .insert(inboundMessages)
        .values({
          webhookId: webhook.id,
          userId: webhook.userId,
          externalMessageId: payload.messageId,
          senderIdentifier: payload.from,
          senderName: payload.fromName,
          messageType: "text",
          content: payload.body,
          contentParsed: {
            subject: payload.subject,
            bodyHtml: payload.bodyHtml,
          },
          hasAttachments: hasAttachments || false,
          attachments: payload.attachments,
          conversationId: conversation.id,
          rawPayload: payload,
          providerMetadata: {
            to: payload.to,
            subject: payload.subject,
          },
          processingStatus: "received",
        })
        .returning();

      // Update webhook stats
      await db
        .update(userWebhooks)
        .set({
          totalMessagesReceived: (webhook.totalMessagesReceived || 0) + 1,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userWebhooks.id, webhook.id));

      // Process the message
      const processingResult = await this.messageProcessor.processMessage(
        message.id,
        webhook.userId
      );

      return {
        success: true,
        messageId: message.id,
        taskId: processingResult.taskId,
        conversationId: conversation.id,
        reply: processingResult.reply,
      };
    } catch (error) {
      console.error("Email webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle Custom webhook
   */
  private async handleCustomWebhook(
    webhook: typeof userWebhooks.$inferSelect,
    payload: CustomWebhookPayload
  ): Promise<WebhookResponse> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      const hasAttachments = payload.attachments && payload.attachments.length > 0;

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        webhook,
        payload.sender
      );

      // Create inbound message record
      const [message] = await db
        .insert(inboundMessages)
        .values({
          webhookId: webhook.id,
          userId: webhook.userId,
          externalMessageId: payload.messageId,
          senderIdentifier: payload.sender,
          senderName: payload.senderName,
          messageType: payload.contentType || "text",
          content: payload.content,
          hasAttachments: hasAttachments || false,
          attachments: payload.attachments,
          conversationId: conversation.id,
          rawPayload: payload,
          providerMetadata: payload.metadata,
          processingStatus: "received",
        })
        .returning();

      // Update webhook stats
      await db
        .update(userWebhooks)
        .set({
          totalMessagesReceived: (webhook.totalMessagesReceived || 0) + 1,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userWebhooks.id, webhook.id));

      // Process the message
      const processingResult = await this.messageProcessor.processMessage(
        message.id,
        webhook.userId
      );

      return {
        success: true,
        messageId: message.id,
        taskId: processingResult.taskId,
        conversationId: conversation.id,
        reply: processingResult.reply,
      };
    } catch (error) {
      console.error("Custom webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find or create a conversation for a sender
   */
  private async findOrCreateConversation(
    webhook: typeof userWebhooks.$inferSelect,
    senderIdentifier: string,
    topic?: string
  ): Promise<typeof botConversations.$inferSelect> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Look for active conversation with this sender
    const [existingConversation] = await db
      .select()
      .from(botConversations)
      .where(and(
        eq(botConversations.userId, webhook.userId),
        eq(botConversations.webhookId, webhook.id),
        eq(botConversations.participantIdentifier, senderIdentifier),
        eq(botConversations.status, "active")
      ))
      .orderBy(desc(botConversations.lastMessageAt))
      .limit(1);

    if (existingConversation) {
      // Update last message time
      await db
        .update(botConversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: (existingConversation.messageCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(botConversations.id, existingConversation.id));

      return existingConversation;
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(botConversations)
      .values({
        userId: webhook.userId,
        webhookId: webhook.id,
        participantIdentifier: senderIdentifier,
        status: "active",
        topic,
        aiPersonality: "professional",
        autoCreateTasks: true,
        requireConfirmation: false,
        messageCount: 1,
        lastMessageAt: new Date(),
      })
      .returning();

    return newConversation;
  }

  /**
   * Send a reply through the webhook's outbound channel
   */
  async sendReply(
    webhookId: number,
    recipientIdentifier: string,
    content: string,
    options?: {
      inboundMessageId?: number;
      taskId?: number;
      conversationId?: number;
      messageType?: string;
    }
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      const [webhook] = await db
        .select()
        .from(userWebhooks)
        .where(eq(userWebhooks.id, webhookId))
        .limit(1);

      if (!webhook) {
        return { success: false, error: "Webhook not found" };
      }

      if (!webhook.outboundEnabled) {
        return { success: false, error: "Outbound messaging is disabled" };
      }

      // Create outbound message record
      const [outbound] = await db
        .insert(outboundMessages)
        .values({
          webhookId,
          userId: webhook.userId,
          inboundMessageId: options?.inboundMessageId,
          taskId: options?.taskId,
          conversationId: options?.conversationId,
          messageType: options?.messageType || "reply",
          content,
          recipientIdentifier,
          deliveryStatus: "pending",
        })
        .returning();

      // TODO: Actually send the message through the provider
      // For now, just mark as sent
      await db
        .update(outboundMessages)
        .set({
          deliveryStatus: "sent",
          sentAt: new Date(),
        })
        .where(eq(outboundMessages.id, outbound.id));

      // Update webhook stats
      await db
        .update(userWebhooks)
        .set({
          totalMessagesSent: (webhook.totalMessagesSent || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(userWebhooks.id, webhookId));

      return { success: true, messageId: outbound.id };
    } catch (error) {
      console.error("Failed to send reply:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const webhookReceiverService = new WebhookReceiverService();
