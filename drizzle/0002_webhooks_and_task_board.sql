-- Webhooks & Communication Channels Migration
-- This migration creates tables for:
-- 1. User-configurable webhooks (SMS, Email, Custom HTTP)
-- 2. Inbound message logging
-- 3. Bot conversation context
-- 4. Agency task board
-- 5. Task execution tracking
-- 6. Outbound messages

-- ========================================
-- USER WEBHOOKS
-- ========================================

CREATE TABLE "user_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"webhookToken" uuid DEFAULT gen_random_uuid() NOT NULL,
	"webhookUrl" text,
	"channelType" varchar(50) NOT NULL,
	"channelName" varchar(100) NOT NULL,
	"channelOrder" integer DEFAULT 1 NOT NULL,
	"providerConfig" jsonb,
	"outboundEnabled" boolean DEFAULT true NOT NULL,
	"outboundConfig" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"verifiedAt" timestamp,
	"verificationCode" varchar(10),
	"rateLimitPerMinute" integer DEFAULT 30 NOT NULL,
	"rateLimitPerHour" integer DEFAULT 200 NOT NULL,
	"totalMessagesReceived" integer DEFAULT 0 NOT NULL,
	"totalMessagesSent" integer DEFAULT 0 NOT NULL,
	"lastMessageAt" timestamp,
	"metadata" jsonb,
	"tags" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_webhooks_webhookToken_unique" UNIQUE("webhookToken")
);

--> statement-breakpoint

-- ========================================
-- BOT CONVERSATIONS
-- ========================================

CREATE TABLE "bot_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"webhookId" integer,
	"conversationUuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"participantIdentifier" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"topic" varchar(255),
	"contextSummary" text,
	"contextMemory" jsonb,
	"aiPersonality" varchar(50) DEFAULT 'professional',
	"autoCreateTasks" boolean DEFAULT true NOT NULL,
	"requireConfirmation" boolean DEFAULT false NOT NULL,
	"messageCount" integer DEFAULT 0 NOT NULL,
	"tasksCreated" integer DEFAULT 0 NOT NULL,
	"lastMessageAt" timestamp,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_conversations_conversationUuid_unique" UNIQUE("conversationUuid")
);

--> statement-breakpoint

-- ========================================
-- INBOUND MESSAGES
-- ========================================

CREATE TABLE "inbound_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"userId" integer NOT NULL,
	"externalMessageId" varchar(255),
	"senderIdentifier" varchar(255) NOT NULL,
	"senderName" varchar(255),
	"messageType" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"contentParsed" jsonb,
	"hasAttachments" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"processingStatus" varchar(50) DEFAULT 'received' NOT NULL,
	"processingError" text,
	"taskId" integer,
	"conversationId" integer,
	"isPartOfThread" boolean DEFAULT false NOT NULL,
	"parentMessageId" integer,
	"rawPayload" jsonb,
	"providerMetadata" jsonb,
	"receivedAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- ========================================
-- AGENCY TASK BOARD
-- ========================================

CREATE TABLE "agency_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"taskUuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"sourceType" varchar(50) NOT NULL,
	"sourceWebhookId" integer,
	"sourceMessageId" integer,
	"conversationId" integer,
	"title" varchar(500) NOT NULL,
	"description" text,
	"originalMessage" text,
	"category" varchar(100) DEFAULT 'general',
	"taskType" varchar(100) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"urgency" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"statusReason" text,
	"assignedToBot" boolean DEFAULT true NOT NULL,
	"requiresHumanReview" boolean DEFAULT false NOT NULL,
	"humanReviewedBy" integer,
	"humanReviewedAt" timestamp,
	"executionType" varchar(50) DEFAULT 'automatic',
	"executionConfig" jsonb,
	"scheduledFor" timestamp,
	"deadline" timestamp,
	"dependsOn" jsonb,
	"blockedBy" integer,
	"result" jsonb,
	"resultSummary" text,
	"lastError" text,
	"errorCount" integer DEFAULT 0 NOT NULL,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"notifyOnComplete" boolean DEFAULT true NOT NULL,
	"notifyOnFailure" boolean DEFAULT true NOT NULL,
	"notificationsSent" jsonb,
	"tags" jsonb,
	"metadata" jsonb,
	"queuedAt" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_tasks_taskUuid_unique" UNIQUE("taskUuid")
);

--> statement-breakpoint

-- ========================================
-- TASK EXECUTIONS
-- ========================================

CREATE TABLE "task_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer NOT NULL,
	"executionUuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"attemptNumber" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'started' NOT NULL,
	"triggeredBy" varchar(50) NOT NULL,
	"triggeredByUserId" integer,
	"browserSessionId" varchar(255),
	"debugUrl" text,
	"recordingUrl" text,
	"stepsTotal" integer DEFAULT 0 NOT NULL,
	"stepsCompleted" integer DEFAULT 0 NOT NULL,
	"currentStep" varchar(255),
	"stepResults" jsonb,
	"output" jsonb,
	"logs" jsonb,
	"screenshots" jsonb,
	"error" text,
	"errorCode" varchar(100),
	"errorStack" text,
	"duration" integer,
	"resourceUsage" jsonb,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_executions_executionUuid_unique" UNIQUE("executionUuid")
);

--> statement-breakpoint

-- ========================================
-- OUTBOUND MESSAGES
-- ========================================

CREATE TABLE "outbound_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"userId" integer NOT NULL,
	"inboundMessageId" integer,
	"taskId" integer,
	"conversationId" integer,
	"messageType" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"recipientIdentifier" varchar(255) NOT NULL,
	"recipientName" varchar(255),
	"deliveryStatus" varchar(50) DEFAULT 'pending' NOT NULL,
	"deliveryError" text,
	"externalMessageId" varchar(255),
	"providerResponse" jsonb,
	"scheduledFor" timestamp,
	"sentAt" timestamp,
	"deliveredAt" timestamp,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- User webhooks
ALTER TABLE "user_webhooks" ADD CONSTRAINT "user_webhooks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Bot conversations
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Inbound messages
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_conversationId_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."bot_conversations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_parentMessageId_inbound_messages_id_fk" FOREIGN KEY ("parentMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Agency tasks
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_sourceWebhookId_user_webhooks_id_fk" FOREIGN KEY ("sourceWebhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_sourceMessageId_inbound_messages_id_fk" FOREIGN KEY ("sourceMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_conversationId_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."bot_conversations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_humanReviewedBy_users_id_fk" FOREIGN KEY ("humanReviewedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_blockedBy_agency_tasks_id_fk" FOREIGN KEY ("blockedBy") REFERENCES "public"."agency_tasks"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Task executions
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_taskId_agency_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."agency_tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_triggeredByUserId_users_id_fk" FOREIGN KEY ("triggeredByUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Outbound messages
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_inboundMessageId_inbound_messages_id_fk" FOREIGN KEY ("inboundMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_taskId_agency_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."agency_tasks"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_conversationId_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."bot_conversations"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Update inbound_messages to reference agency_tasks (deferred because of circular dependency)
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_taskId_agency_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."agency_tasks"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX "idx_user_webhooks_userId" ON "user_webhooks" ("userId");
--> statement-breakpoint
CREATE INDEX "idx_user_webhooks_channelType" ON "user_webhooks" ("channelType");
--> statement-breakpoint
CREATE INDEX "idx_user_webhooks_isActive" ON "user_webhooks" ("isActive");

--> statement-breakpoint

CREATE INDEX "idx_inbound_messages_webhookId" ON "inbound_messages" ("webhookId");
--> statement-breakpoint
CREATE INDEX "idx_inbound_messages_userId" ON "inbound_messages" ("userId");
--> statement-breakpoint
CREATE INDEX "idx_inbound_messages_conversationId" ON "inbound_messages" ("conversationId");
--> statement-breakpoint
CREATE INDEX "idx_inbound_messages_processingStatus" ON "inbound_messages" ("processingStatus");
--> statement-breakpoint
CREATE INDEX "idx_inbound_messages_receivedAt" ON "inbound_messages" ("receivedAt");

--> statement-breakpoint

CREATE INDEX "idx_bot_conversations_userId" ON "bot_conversations" ("userId");
--> statement-breakpoint
CREATE INDEX "idx_bot_conversations_webhookId" ON "bot_conversations" ("webhookId");
--> statement-breakpoint
CREATE INDEX "idx_bot_conversations_status" ON "bot_conversations" ("status");
--> statement-breakpoint
CREATE INDEX "idx_bot_conversations_participantIdentifier" ON "bot_conversations" ("participantIdentifier");

--> statement-breakpoint

CREATE INDEX "idx_agency_tasks_userId" ON "agency_tasks" ("userId");
--> statement-breakpoint
CREATE INDEX "idx_agency_tasks_status" ON "agency_tasks" ("status");
--> statement-breakpoint
CREATE INDEX "idx_agency_tasks_priority" ON "agency_tasks" ("priority");
--> statement-breakpoint
CREATE INDEX "idx_agency_tasks_sourceType" ON "agency_tasks" ("sourceType");
--> statement-breakpoint
CREATE INDEX "idx_agency_tasks_scheduledFor" ON "agency_tasks" ("scheduledFor");
--> statement-breakpoint
CREATE INDEX "idx_agency_tasks_createdAt" ON "agency_tasks" ("createdAt");

--> statement-breakpoint

CREATE INDEX "idx_task_executions_taskId" ON "task_executions" ("taskId");
--> statement-breakpoint
CREATE INDEX "idx_task_executions_status" ON "task_executions" ("status");
--> statement-breakpoint
CREATE INDEX "idx_task_executions_startedAt" ON "task_executions" ("startedAt");

--> statement-breakpoint

CREATE INDEX "idx_outbound_messages_webhookId" ON "outbound_messages" ("webhookId");
--> statement-breakpoint
CREATE INDEX "idx_outbound_messages_userId" ON "outbound_messages" ("userId");
--> statement-breakpoint
CREATE INDEX "idx_outbound_messages_taskId" ON "outbound_messages" ("taskId");
--> statement-breakpoint
CREATE INDEX "idx_outbound_messages_deliveryStatus" ON "outbound_messages" ("deliveryStatus");
