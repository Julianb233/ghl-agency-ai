/**
 * Message Processing Service
 * Parses incoming messages, extracts intent, and creates tasks
 * Uses AI to understand natural language instructions
 * Supports both Claude (Anthropic) and OpenAI for intent extraction
 */

import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  inboundMessages,
  agencyTasks,
  botConversations,
} from "../../drizzle/schema-webhooks";
import { automationWorkflows } from "../../drizzle/schema";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { addWorkflowExecutionJob } from "../workers/workflowWorker";

// ========================================
// TYPES
// ========================================

export interface ParsedMessage {
  intent: MessageIntent;
  entities: ExtractedEntity[];
  urgency: "low" | "medium" | "high" | "critical";
  confidence: number;
  taskTitle?: string;
  taskDescription?: string;
  taskType?: string;
  category?: string;
  scheduledFor?: Date;
  deadline?: Date;
  requiresConfirmation: boolean;
  // Workflow-specific fields
  workflowId?: number;
  workflowName?: string;
  workflowParameters?: Record<string, any>;
}

export type MessageIntent =
  | "trigger_workflow"   // Trigger a browser automation workflow
  | "create_task"
  | "status_update"
  | "question"
  | "reminder"
  | "cancellation"
  | "follow_up"
  | "list_workflows"     // List available workflows
  | "help"               // Ask for help
  | "greeting"
  | "unknown";

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface ProcessingResult {
  success: boolean;
  taskId?: number;
  executionId?: number;  // Workflow execution ID
  reply?: string;
  error?: string;
}

// ========================================
// MESSAGE PROCESSING SERVICE
// ========================================

export class MessageProcessingService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private preferClaude: boolean = true; // Prefer Claude when available

  constructor() {
    // Initialize Anthropic (preferred)
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize OpenAI (fallback)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Process an inbound message
   */
  async processMessage(
    messageId: number,
    userId: number
  ): Promise<ProcessingResult> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      // Get the message
      const [message] = await db
        .select()
        .from(inboundMessages)
        .where(eq(inboundMessages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, error: "Message not found" };
      }

      // Update status to parsing
      await db
        .update(inboundMessages)
        .set({ processingStatus: "parsing" })
        .where(eq(inboundMessages.id, messageId));

      // Parse the message
      const parsed = await this.parseMessage(message.content, userId);

      // Update message with parsed content
      await db
        .update(inboundMessages)
        .set({
          contentParsed: parsed,
          processingStatus: "parsed",
        })
        .where(eq(inboundMessages.id, messageId));

      let taskId: number | undefined;
      let reply: string;

      // Handle based on intent
      switch (parsed.intent) {
        case "trigger_workflow":
          // Trigger a workflow execution
          if (parsed.workflowId && !parsed.requiresConfirmation) {
            const result = await this.triggerWorkflow(
              userId,
              parsed.workflowId,
              parsed.workflowParameters || {},
              message.id
            );
            if (result.success) {
              reply = `Starting workflow "${parsed.workflowName || parsed.workflowId}"...\n\nExecution ID: ${result.executionId}\nI'll notify you when it's complete.`;
              await db
                .update(inboundMessages)
                .set({ processingStatus: "workflow_triggered" })
                .where(eq(inboundMessages.id, messageId));
            } else {
              reply = `Failed to start workflow: ${result.error}`;
            }
          } else if (parsed.requiresConfirmation) {
            // Need to clarify which workflow
            const workflows = await this.getUserWorkflows(userId);
            if (workflows.length > 0) {
              const workflowList = workflows.slice(0, 5).map(w => `- "${w.name}"`).join("\n");
              reply = `Which workflow would you like to run? Here are your available workflows:\n\n${workflowList}\n\nPlease specify the workflow name.`;
            } else {
              reply = "You don't have any workflows configured yet. Would you like me to help you create one?";
            }
          } else {
            reply = "I couldn't identify a workflow to run. Please specify the workflow name.";
          }
          break;

        case "list_workflows":
          reply = await this.handleListWorkflows(userId);
          break;

        case "help":
          reply = this.handleHelp();
          break;

        case "create_task":
          // Check if confirmation is needed
          if (parsed.requiresConfirmation) {
            reply = this.generateConfirmationMessage(parsed);
            await db
              .update(inboundMessages)
              .set({ processingStatus: "waiting_confirmation" })
              .where(eq(inboundMessages.id, messageId));
          } else {
            // Create the task
            const task = await this.createTask(message, parsed, userId);
            taskId = task.id;

            // Update message with task reference
            await db
              .update(inboundMessages)
              .set({
                taskId: task.id,
                processingStatus: "task_created",
              })
              .where(eq(inboundMessages.id, messageId));

            reply = this.generateTaskCreatedMessage(task, parsed);
          }
          break;

        case "status_update":
          reply = await this.handleStatusUpdate(message.content, userId);
          break;

        case "question":
          reply = await this.handleQuestion(message.content, userId);
          break;

        case "greeting":
          reply = this.handleGreeting(message.senderName);
          break;

        case "cancellation":
          reply = await this.handleCancellation(message.content, userId);
          break;

        default:
          reply = this.generateDefaultResponse();
      }

      // Update final status
      await db
        .update(inboundMessages)
        .set({
          processingStatus: taskId ? "task_created" : "responded",
          processedAt: new Date(),
        })
        .where(eq(inboundMessages.id, messageId));

      // Update conversation if exists
      if (message.conversationId) {
        await db
          .update(botConversations)
          .set({
            tasksCreated: taskId
              ? (await this.getConversationTaskCount(message.conversationId)) + 1
              : undefined,
            contextSummary: await this.updateContextSummary(
              message.conversationId,
              message.content,
              reply
            ),
            updatedAt: new Date(),
          })
          .where(eq(botConversations.id, message.conversationId));
      }

      return { success: true, taskId, reply };
    } catch (error) {
      console.error("Message processing error:", error);

      // Update message with error
      const db2 = await getDb();
      if (db2) {
        await db2
          .update(inboundMessages)
          .set({
            processingStatus: "failed",
            processingError: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(inboundMessages.id, messageId));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Parse message content to extract intent and entities
   */
  private async parseMessage(content: string, userId: number): Promise<ParsedMessage> {
    // Get user's available workflows for context
    const workflows = await this.getUserWorkflows(userId);

    // If Claude is available (preferred), use it
    if (this.anthropic && this.preferClaude) {
      return this.parseWithClaude(content, workflows);
    }

    // If OpenAI is available, use AI parsing
    if (this.openai) {
      return this.parseWithAI(content, workflows);
    }

    // Fallback to rule-based parsing
    return this.parseWithRules(content, workflows);
  }

  /**
   * Get user's available workflows
   */
  private async getUserWorkflows(userId: number): Promise<Array<{ id: number; name: string; description: string | null }>> {
    const db = await getDb();
    if (!db) return [];

    const workflows = await db
      .select({
        id: automationWorkflows.id,
        name: automationWorkflows.name,
        description: automationWorkflows.description,
      })
      .from(automationWorkflows)
      .where(and(
        eq(automationWorkflows.userId, userId),
        eq(automationWorkflows.isActive, true)
      ))
      .orderBy(desc(automationWorkflows.executionCount))
      .limit(20);

    return workflows;
  }

  /**
   * Parse message using Claude (Anthropic) - preferred
   */
  private async parseWithClaude(
    content: string,
    workflows: Array<{ id: number; name: string; description: string | null }>
  ): Promise<ParsedMessage> {
    if (!this.anthropic) {
      return this.parseWithRules(content, workflows);
    }

    const workflowList = workflows.length > 0
      ? workflows.map(w => `- ID ${w.id}: "${w.name}" - ${w.description || "No description"}`).join("\n")
      : "No workflows available";

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are an AI assistant that parses messages from agency owners to understand their intent and determine what action to take.

Available automation workflows for this user:
${workflowList}

Analyze the following message and return a JSON object with:
- intent: one of "trigger_workflow", "create_task", "status_update", "question", "reminder", "cancellation", "follow_up", "list_workflows", "help", "greeting", "unknown"
- confidence: number between 0 and 1 indicating how confident you are
- urgency: "low", "medium", "high", or "critical" based on language cues
- workflowId: (if intent is "trigger_workflow") the workflow ID to trigger from the list above
- workflowName: (if intent is "trigger_workflow") the workflow name
- workflowParameters: (if intent is "trigger_workflow") any parameters extracted from the message
- taskTitle: a concise title for the task (if applicable)
- taskDescription: detailed description of what needs to be done
- taskType: one of "browser_automation", "api_call", "notification", "reminder", "ghl_action", "data_extraction", "report_generation", "custom"
- category: task category like "client_work", "admin", "follow_up", "marketing", "general"
- entities: array of extracted entities like dates, names, amounts
- requiresConfirmation: true if the request is ambiguous and needs clarification

User message: "${content}"

Return only valid JSON, no markdown code blocks.`,
          },
        ],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "{}";
      const parsed = JSON.parse(responseText);

      return {
        intent: parsed.intent || "unknown",
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || [],
        urgency: parsed.urgency || "medium",
        workflowId: parsed.workflowId,
        workflowName: parsed.workflowName,
        workflowParameters: parsed.workflowParameters,
        taskTitle: parsed.taskTitle,
        taskDescription: parsed.taskDescription,
        taskType: parsed.taskType || "custom",
        category: parsed.category || "general",
        scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : undefined,
        deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
        requiresConfirmation: parsed.requiresConfirmation || false,
      };
    } catch (error) {
      console.error("Claude parsing failed, falling back to rules:", error);
      return this.parseWithRules(content, workflows);
    }
  }

  /**
   * Parse message using AI (OpenAI)
   */
  private async parseWithAI(
    content: string,
    workflows: Array<{ id: number; name: string; description: string | null }>
  ): Promise<ParsedMessage> {
    if (!this.openai) {
      return this.parseWithRules(content, workflows);
    }

    const workflowList = workflows.length > 0
      ? workflows.map(w => `- ID ${w.id}: "${w.name}" - ${w.description || "No description"}`).join("\n")
      : "No workflows available";

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that parses messages from agency owners to understand their intent and extract task information.

Available automation workflows:
${workflowList}

Analyze the message and return a JSON object with:
- intent: one of "trigger_workflow", "create_task", "status_update", "question", "reminder", "cancellation", "follow_up", "list_workflows", "help", "greeting", "unknown"
- confidence: number between 0 and 1 indicating confidence
- urgency: "low", "medium", "high", or "critical" based on language cues
- workflowId: (if intent is "trigger_workflow") the workflow ID to trigger
- workflowName: (if intent is "trigger_workflow") the workflow name
- workflowParameters: (if intent is "trigger_workflow") any parameters extracted
- taskTitle: a concise title for the task (if applicable)
- taskDescription: detailed description of what needs to be done
- taskType: one of "browser_automation", "api_call", "notification", "reminder", "ghl_action", "data_extraction", "report_generation", "custom"
- category: task category like "client_work", "admin", "follow_up", "marketing", "general"
- entities: array of extracted entities like dates, names, amounts
- requiresConfirmation: true if the request is ambiguous and needs clarification

Return only valid JSON, no markdown.`,
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseText = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(responseText);

      return {
        intent: parsed.intent || "unknown",
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || [],
        urgency: parsed.urgency || "medium",
        workflowId: parsed.workflowId,
        workflowName: parsed.workflowName,
        workflowParameters: parsed.workflowParameters,
        taskTitle: parsed.taskTitle,
        taskDescription: parsed.taskDescription,
        taskType: parsed.taskType || "custom",
        category: parsed.category || "general",
        scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : undefined,
        deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
        requiresConfirmation: parsed.requiresConfirmation || false,
      };
    } catch (error) {
      console.error("AI parsing failed, falling back to rules:", error);
      return this.parseWithRules(content, workflows);
    }
  }

  /**
   * Parse message using rule-based approach (fallback)
   */
  private parseWithRules(
    content: string,
    workflows: Array<{ id: number; name: string; description: string | null }>
  ): ParsedMessage {
    const lowerContent = content.toLowerCase();

    // Detect intent
    let intent: MessageIntent = "unknown";
    let matchedWorkflow: { id: number; name: string } | undefined;

    // First, check if user wants to trigger a specific workflow
    for (const workflow of workflows) {
      const workflowNameLower = workflow.name.toLowerCase();
      if (
        lowerContent.includes(workflowNameLower) ||
        lowerContent.includes(`run ${workflowNameLower}`) ||
        lowerContent.includes(`trigger ${workflowNameLower}`) ||
        lowerContent.includes(`execute ${workflowNameLower}`) ||
        lowerContent.includes(`start ${workflowNameLower}`)
      ) {
        intent = "trigger_workflow";
        matchedWorkflow = { id: workflow.id, name: workflow.name };
        break;
      }
    }

    // Check for workflow-related keywords
    if (intent === "unknown") {
      if (
        lowerContent.includes("run workflow") ||
        lowerContent.includes("trigger workflow") ||
        lowerContent.includes("execute workflow") ||
        lowerContent.includes("start workflow") ||
        lowerContent.includes("run automation") ||
        lowerContent.includes("start automation")
      ) {
        intent = "trigger_workflow";
      } else if (
        lowerContent.includes("list workflows") ||
        lowerContent.includes("show workflows") ||
        lowerContent.includes("what workflows") ||
        lowerContent.includes("available workflows")
      ) {
        intent = "list_workflows";
      } else if (
        lowerContent.includes("help") ||
        lowerContent.includes("what can you do")
      ) {
        intent = "help";
      } else if (
        lowerContent.includes("create") ||
        lowerContent.includes("add") ||
        lowerContent.includes("schedule") ||
        lowerContent.includes("set up") ||
        lowerContent.includes("need to") ||
        lowerContent.includes("please") ||
        lowerContent.includes("can you")
      ) {
        intent = "create_task";
      } else if (
        lowerContent.includes("status") ||
        lowerContent.includes("update") ||
        lowerContent.includes("progress")
      ) {
        intent = "status_update";
      } else if (
        lowerContent.includes("?") ||
        lowerContent.includes("what") ||
        lowerContent.includes("how") ||
        lowerContent.includes("when") ||
        lowerContent.includes("where")
      ) {
        intent = "question";
      } else if (
        lowerContent.includes("remind") ||
        lowerContent.includes("reminder")
      ) {
        intent = "reminder";
      } else if (
        lowerContent.includes("cancel") ||
        lowerContent.includes("stop") ||
        lowerContent.includes("delete")
      ) {
        intent = "cancellation";
      } else if (
        lowerContent.includes("hi") ||
        lowerContent.includes("hello") ||
        lowerContent.includes("hey")
      ) {
        intent = "greeting";
      }
    }

    // Detect urgency
    let urgency: "low" | "medium" | "high" | "critical" = "medium";

    if (
      lowerContent.includes("urgent") ||
      lowerContent.includes("asap") ||
      lowerContent.includes("immediately") ||
      lowerContent.includes("emergency")
    ) {
      urgency = "critical";
    } else if (
      lowerContent.includes("important") ||
      lowerContent.includes("priority") ||
      lowerContent.includes("soon")
    ) {
      urgency = "high";
    } else if (
      lowerContent.includes("when you can") ||
      lowerContent.includes("no rush") ||
      lowerContent.includes("whenever")
    ) {
      urgency = "low";
    }

    // Generate task title from content
    const taskTitle = content.length > 100 ? content.substring(0, 100) + "..." : content;

    // Detect task type
    let taskType = "custom";
    if (lowerContent.includes("email") || lowerContent.includes("send")) {
      taskType = "notification";
    } else if (lowerContent.includes("scrape") || lowerContent.includes("extract")) {
      taskType = "data_extraction";
    } else if (lowerContent.includes("report")) {
      taskType = "report_generation";
    } else if (lowerContent.includes("remind")) {
      taskType = "reminder";
    } else if (
      lowerContent.includes("ghl") ||
      lowerContent.includes("go high level") ||
      lowerContent.includes("gohighlevel")
    ) {
      taskType = "ghl_action";
    } else if (
      lowerContent.includes("browser") ||
      lowerContent.includes("website") ||
      lowerContent.includes("automate")
    ) {
      taskType = "browser_automation";
    }

    return {
      intent,
      confidence: matchedWorkflow ? 0.8 : 0.5, // Higher confidence if we matched a workflow
      entities: [],
      urgency,
      workflowId: matchedWorkflow?.id,
      workflowName: matchedWorkflow?.name,
      workflowParameters: {},
      taskTitle,
      taskDescription: content,
      taskType,
      category: "general",
      requiresConfirmation: intent === "unknown" || (intent === "trigger_workflow" && !matchedWorkflow),
    };
  }

  /**
   * Create a task from parsed message
   */
  private async createTask(
    message: typeof inboundMessages.$inferSelect,
    parsed: ParsedMessage,
    userId: number
  ): Promise<typeof agencyTasks.$inferSelect> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const sourceType =
      message.webhookId && message.conversationId
        ? "conversation"
        : message.webhookId
        ? "webhook_custom" // Will be refined based on actual webhook type
        : "manual";

    const [task] = await db
      .insert(agencyTasks)
      .values({
        userId,
        sourceType,
        sourceWebhookId: message.webhookId,
        sourceMessageId: message.id,
        conversationId: message.conversationId,
        title: parsed.taskTitle || message.content.substring(0, 100),
        description: parsed.taskDescription,
        originalMessage: message.content,
        category: parsed.category || "general",
        taskType: parsed.taskType || "custom",
        priority: this.mapUrgencyToPriority(parsed.urgency),
        urgency: parsed.urgency,
        status: "pending",
        assignedToBot: true,
        requiresHumanReview: false,
        executionType: "automatic",
        scheduledFor: parsed.scheduledFor,
        deadline: parsed.deadline,
        notifyOnComplete: true,
        notifyOnFailure: true,
      })
      .returning();

    return task;
  }

  /**
   * Map urgency to priority
   */
  private mapUrgencyToPriority(
    urgency: "low" | "medium" | "high" | "critical"
  ): "low" | "medium" | "high" | "critical" {
    return urgency;
  }

  /**
   * Generate confirmation message for ambiguous requests
   */
  private generateConfirmationMessage(parsed: ParsedMessage): string {
    return `I understand you want to ${parsed.taskTitle || "create a task"}. Could you please provide more details about what exactly you need? For example:
- What specific actions should be taken?
- Is there a deadline?
- Any specific requirements?`;
  }

  /**
   * Generate task created message
   */
  private generateTaskCreatedMessage(
    task: typeof agencyTasks.$inferSelect,
    parsed: ParsedMessage
  ): string {
    const urgencyEmoji = {
      low: "",
      medium: "",
      high: "!",
      critical: "!!",
    }[parsed.urgency];

    return `Got it${urgencyEmoji} I've created a task: "${task.title}"

Task ID: #${task.id}
Priority: ${task.priority}
Status: ${task.status}

I'll start working on this ${task.scheduledFor ? `at ${task.scheduledFor.toLocaleString()}` : "right away"}.`;
  }

  /**
   * Handle status update request
   */
  private async handleStatusUpdate(content: string, userId: number): Promise<string> {
    const db = await getDb();
    if (!db) {
      return "I couldn't check task status. Please try again.";
    }

    // Get recent tasks
    const tasks = await db
      .select()
      .from(agencyTasks)
      .where(eq(agencyTasks.userId, userId))
      .orderBy(agencyTasks.createdAt)
      .limit(5);

    if (tasks.length === 0) {
      return "You don't have any active tasks at the moment.";
    }

    const taskList = tasks
      .map((t) => `- #${t.id}: ${t.title} [${t.status}]`)
      .join("\n");

    return `Here are your recent tasks:\n\n${taskList}`;
  }

  /**
   * Handle question
   */
  private async handleQuestion(content: string, userId: number): Promise<string> {
    return "I'd be happy to help answer your question. Could you provide more context about what you're looking for?";
  }

  /**
   * Handle greeting
   */
  private handleGreeting(senderName?: string | null): string {
    const name = senderName ? ` ${senderName}` : "";
    return `Hello${name}! I'm your Bottleneck Bot assistant. How can I help you today?

You can:
- Tell me about tasks you need done
- Ask about task status
- Set reminders
- Or just chat!`;
  }

  /**
   * Handle cancellation request
   */
  private async handleCancellation(content: string, userId: number): Promise<string> {
    return "I can help you cancel a task. Please provide the task ID or describe which task you'd like to cancel.";
  }

  /**
   * Generate default response for unknown intent
   */
  private generateDefaultResponse(): string {
    return "I received your message but I'm not sure how to help. Could you please rephrase or provide more details?";
  }

  /**
   * Get conversation task count
   */
  private async getConversationTaskCount(conversationId: number): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    const [conv] = await db
      .select({ tasksCreated: botConversations.tasksCreated })
      .from(botConversations)
      .where(eq(botConversations.id, conversationId))
      .limit(1);

    return conv?.tasksCreated || 0;
  }

  /**
   * Update conversation context summary
   */
  private async updateContextSummary(
    conversationId: number,
    userMessage: string,
    botReply: string
  ): Promise<string> {
    // Simple summary - could be enhanced with AI
    return `Last exchange: User asked about "${userMessage.substring(0, 50)}..."`;
  }
}

// Export singleton instance
export const messageProcessingService = new MessageProcessingService();
