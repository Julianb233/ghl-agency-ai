CREATE TABLE "ai_call_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"listId" integer,
	"name" varchar(500) NOT NULL,
	"description" text,
	"script" text NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"callsMade" integer DEFAULT 0 NOT NULL,
	"callsSuccessful" integer DEFAULT 0 NOT NULL,
	"callsFailed" integer DEFAULT 0 NOT NULL,
	"callsAnswered" integer DEFAULT 0 NOT NULL,
	"totalDuration" integer DEFAULT 0 NOT NULL,
	"costInCredits" integer DEFAULT 0 NOT NULL,
	"settings" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaignId" integer NOT NULL,
	"userId" integer NOT NULL,
	"leadId" integer,
	"phoneNumber" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"outcome" varchar(50),
	"vapiCallId" varchar(255),
	"duration" integer,
	"recordingUrl" text,
	"transcript" text,
	"analysis" jsonb,
	"notes" text,
	"creditsUsed" integer DEFAULT 1 NOT NULL,
	"error" text,
	"calledAt" timestamp DEFAULT now() NOT NULL,
	"answeredAt" timestamp,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"keyHash" text NOT NULL,
	"keyPrefix" varchar(12) NOT NULL,
	"scopes" jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"rateLimitPerMinute" integer DEFAULT 100 NOT NULL,
	"rateLimitPerHour" integer DEFAULT 1000 NOT NULL,
	"rateLimitPerDay" integer DEFAULT 10000 NOT NULL,
	"lastUsedAt" timestamp,
	"totalRequests" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"apiKeyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"method" varchar(10) NOT NULL,
	"endpoint" text NOT NULL,
	"statusCode" integer NOT NULL,
	"responseTime" integer NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"referer" text,
	"requestBody" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" text NOT NULL,
	"subaccountName" text,
	"subaccountId" text,
	"brandVoice" text,
	"primaryGoal" text,
	"website" text,
	"seoConfig" jsonb,
	"assets" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"creditType" varchar(50) NOT NULL,
	"transactionType" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"balanceAfter" integer NOT NULL,
	"description" text NOT NULL,
	"referenceId" varchar(255),
	"referenceType" varchar(50),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_app_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"alertHistoryId" integer,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(20) DEFAULT 'info' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"isDismissed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"actionUrl" text,
	"actionLabel" varchar(100),
	"readAt" timestamp,
	"dismissedAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"fileName" varchar(500),
	"fileSize" integer,
	"status" varchar(50) DEFAULT 'uploading' NOT NULL,
	"totalLeads" integer DEFAULT 0 NOT NULL,
	"enrichedLeads" integer DEFAULT 0 NOT NULL,
	"failedLeads" integer DEFAULT 0 NOT NULL,
	"costInCredits" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"processingStartedAt" timestamp,
	"processedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"companyName" text,
	"industry" varchar(100),
	"monthlyRevenue" varchar(50),
	"employeeCount" varchar(50),
	"website" text,
	"phone" varchar(30),
	"goals" jsonb,
	"currentTools" jsonb,
	"referralSource" varchar(100),
	"ghlApiKey" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"creditType" varchar(50) NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"totalPurchased" integer DEFAULT 0 NOT NULL,
	"totalUsed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"verificationCodeExpiresAt" timestamp,
	"tokenExpiresAt" timestamp,
	"tokenRotationRequired" boolean DEFAULT false,
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
CREATE TABLE "rag_action_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"task_type" varchar(100),
	"trigger_instruction" text,
	"trigger_keywords" jsonb,
	"steps" jsonb NOT NULL,
	"expected_outcome" text,
	"success_indicator" text,
	"avg_execution_time" real,
	"success_rate" real DEFAULT 0.5,
	"execution_count" integer DEFAULT 0,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_element_selectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer,
	"website_id" integer NOT NULL,
	"element_name" varchar(255) NOT NULL,
	"element_type" varchar(50),
	"description" text,
	"primary_selector" text NOT NULL,
	"fallback_selectors" jsonb,
	"xpath_selector" text,
	"aria_label" text,
	"test_id" text,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"reliability_score" real DEFAULT 0.5,
	"last_success" timestamp,
	"last_failure" timestamp,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_error_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" integer,
	"error_type" varchar(100) NOT NULL,
	"error_pattern" text NOT NULL,
	"description" text,
	"recovery_strategy" varchar(50),
	"recovery_steps" jsonb,
	"max_retries" integer DEFAULT 3,
	"retry_delay" integer DEFAULT 1000,
	"occurrence_count" integer DEFAULT 0,
	"recovery_success_count" integer DEFAULT 0,
	"recovery_rate" real DEFAULT 0.5,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" integer,
	"action_sequence_id" integer,
	"session_id" varchar(255),
	"user_id" varchar(255),
	"instruction" text,
	"steps" jsonb,
	"total_duration" integer,
	"success" boolean NOT NULL,
	"error_message" text,
	"error_type" varchar(100),
	"recovery_attempts" jsonb,
	"final_state" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_page_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" integer NOT NULL,
	"url_pattern" text NOT NULL,
	"page_name" varchar(255),
	"page_type" varchar(50),
	"description" text,
	"main_content_selector" text,
	"navigation_selector" text,
	"load_indicator" text,
	"dom_snapshot" jsonb,
	"accessibility_tree" jsonb,
	"known_elements" jsonb,
	"embedding" vector(1536),
	"confidence" real DEFAULT 0.5,
	"last_verified" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_support_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" integer,
	"title" varchar(500) NOT NULL,
	"document_type" varchar(50),
	"source_url" text,
	"content" text NOT NULL,
	"summary" text,
	"chunk_index" integer DEFAULT 0,
	"parent_document_id" integer,
	"embedding" vector(1536),
	"retrieval_count" integer DEFAULT 0,
	"helpfulness_score" real DEFAULT 0.5,
	"last_updated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_websites" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"name" varchar(255),
	"description" text,
	"login_url" text,
	"dashboard_url" text,
	"requires_auth" boolean DEFAULT false,
	"auth_method" varchar(50),
	"default_timeout" integer DEFAULT 30000,
	"wait_for_selector" text,
	"load_strategy" varchar(50) DEFAULT 'domcontentloaded',
	"avg_load_time" real,
	"reliability_score" real DEFAULT 0.5,
	"last_crawled" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rag_websites_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "oauth_integrations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhooks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "oauth_integrations" CASCADE;--> statement-breakpoint
DROP TABLE "user_settings" CASCADE;--> statement-breakpoint
DROP TABLE "user_subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE "webhook_logs" CASCADE;--> statement-breakpoint
DROP TABLE "webhooks" CASCADE;--> statement-breakpoint
ALTER TABLE "rag_query_logs" RENAME TO "alert_delivery_queue";--> statement-breakpoint
ALTER TABLE "system_prompt_templates" RENAME TO "alert_history";--> statement-breakpoint
ALTER TABLE "media_processing_queue" RENAME TO "alert_rules";--> statement-breakpoint
ALTER TABLE "media_storage" RENAME TO "credit_packages";--> statement-breakpoint
ALTER TABLE "documentation_chunks" DROP CONSTRAINT "documentation_chunks_sourceId_documentation_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "documentation_sources" DROP CONSTRAINT "documentation_sources_uploadedBy_users_id_fk";
--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP CONSTRAINT "rag_query_logs_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP CONSTRAINT "cron_job_registry_taskId_scheduled_browser_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP CONSTRAINT "scheduled_task_executions_sessionId_browser_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP CONSTRAINT "scheduled_task_executions_taskId_scheduled_browser_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "alert_rules" DROP CONSTRAINT "media_processing_queue_mediaId_media_storage_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_packages" DROP CONSTRAINT "media_storage_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_packages" DROP CONSTRAINT "media_storage_sessionId_browser_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_packages" DROP CONSTRAINT "media_storage_workflowExecutionId_workflow_executions_id_fk";
--> statement-breakpoint
DROP INDEX "source_id_idx";--> statement-breakpoint
DROP INDEX "platform_category_idx";--> statement-breakpoint
DROP INDEX "embedding_idx";--> statement-breakpoint
DROP INDEX "platform_idx";--> statement-breakpoint
DROP INDEX "category_idx";--> statement-breakpoint
DROP INDEX "active_idx";--> statement-breakpoint
DROP INDEX "platform_keywords_platform_idx";--> statement-breakpoint
DROP INDEX "platform_keywords_keyword_idx";--> statement-breakpoint
DROP INDEX "platform_keywords_type_idx";--> statement-breakpoint
DROP INDEX "rag_user_id_idx";--> statement-breakpoint
DROP INDEX "rag_created_at_idx";--> statement-breakpoint
DROP INDEX "prompt_platform_idx";--> statement-breakpoint
DROP INDEX "prompt_default_idx";--> statement-breakpoint
DROP INDEX "cron_job_registry_next_execution_idx";--> statement-breakpoint
DROP INDEX "scheduled_browser_tasks_user_idx";--> statement-breakpoint
DROP INDEX "scheduled_browser_tasks_status_idx";--> statement-breakpoint
DROP INDEX "scheduled_browser_tasks_next_run_idx";--> statement-breakpoint
DROP INDEX "scheduled_task_executions_task_idx";--> statement-breakpoint
DROP INDEX "scheduled_task_executions_status_idx";--> statement-breakpoint
DROP INDEX "scheduled_task_executions_started_idx";--> statement-breakpoint
DROP INDEX "media_processing_media_id_idx";--> statement-breakpoint
DROP INDEX "media_processing_status_idx";--> statement-breakpoint
DROP INDEX "media_processing_priority_idx";--> statement-breakpoint
DROP INDEX "media_processing_created_at_idx";--> statement-breakpoint
DROP INDEX "media_user_id_idx";--> statement-breakpoint
DROP INDEX "media_session_id_idx";--> statement-breakpoint
DROP INDEX "media_workflow_id_idx";--> statement-breakpoint
DROP INDEX "media_type_idx";--> statement-breakpoint
DROP INDEX "media_expires_at_idx";--> statement-breakpoint
DROP INDEX "media_expired_idx";--> statement-breakpoint
DROP INDEX "media_created_at_idx";--> statement-breakpoint
DROP INDEX "media_share_token_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "openId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documentation_sources" ALTER COLUMN "sourceType" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "documentation_sources" ALTER COLUMN "sourceType" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "documentation_sources" ALTER COLUMN "version" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "platform_keywords" ALTER COLUMN "keyword" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cron_job_registry" ALTER COLUMN "jobId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cron_job_registry" ALTER COLUMN "cronExpression" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cron_job_registry" ALTER COLUMN "timezone" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "cron_job_registry" ALTER COLUMN "timezone" SET DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "automationType" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "scheduleType" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "cronExpression" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "timezone" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "timezone" SET DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "nextRun" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "lastRunStatus" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "averageDuration" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "maxHistoryRecords" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "createdBy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_browser_tasks" ALTER COLUMN "lastModifiedBy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ALTER COLUMN "sessionId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ALTER COLUMN "status" SET DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ALTER COLUMN "triggerType" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ALTER COLUMN "startedAt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "listId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "userId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "rawData" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "enrichedData" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "enrichmentStatus" varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "creditsUsed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "enrichedAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "googleId" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboardingCompleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documentation_sources" ADD COLUMN "userId" integer;--> statement-breakpoint
ALTER TABLE "documentation_sources" ADD COLUMN "contentHash" varchar(64);--> statement-breakpoint
ALTER TABLE "documentation_sources" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "platform_keywords" ADD COLUMN "weight" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_keywords" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "alertHistoryId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "channel" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "destination" text NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "payload" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "maxAttempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "lastAttemptAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "priority" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "scheduledFor" timestamp;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD COLUMN "sentAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "ruleId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "userId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "taskId" integer;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "executionId" integer;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "alertType" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "severity" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "title" varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "channels" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "deliveryStatus" jsonb;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "triggeredAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "acknowledgedAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "acknowledgedBy" integer;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "jobName" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "lastStartedAt" timestamp;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "lastCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "nextRunAt" timestamp;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ADD COLUMN "debugUrl" text;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "userId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "ruleType" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "targetType" varchar(50) DEFAULT 'all_tasks' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "targetTaskIds" jsonb;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "targetTags" jsonb;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "conditions" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "notificationChannels" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "cooldownMinutes" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "aggregationEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "maxAlertsPerHour" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "severity" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "isPaused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "lastAlertSentAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "alertsThisHour" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "hourlyResetAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "createdBy" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "lastModifiedBy" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "name" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "creditAmount" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "price" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "creditType" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_packages" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_call_campaigns" ADD CONSTRAINT "ai_call_campaigns_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_campaigns" ADD CONSTRAINT "ai_call_campaigns_listId_lead_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."lead_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_campaignId_ai_call_campaigns_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."ai_call_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_apiKeyId_api_keys_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_alertHistoryId_alert_history_id_fk" FOREIGN KEY ("alertHistoryId") REFERENCES "public"."alert_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_sourceWebhookId_user_webhooks_id_fk" FOREIGN KEY ("sourceWebhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_sourceMessageId_inbound_messages_id_fk" FOREIGN KEY ("sourceMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_conversationId_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."bot_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_humanReviewedBy_users_id_fk" FOREIGN KEY ("humanReviewedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_blockedBy_agency_tasks_id_fk" FOREIGN KEY ("blockedBy") REFERENCES "public"."agency_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_parentMessageId_inbound_messages_id_fk" FOREIGN KEY ("parentMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_webhookId_user_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."user_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_inboundMessageId_inbound_messages_id_fk" FOREIGN KEY ("inboundMessageId") REFERENCES "public"."inbound_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_taskId_agency_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."agency_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_conversationId_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."bot_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_taskId_agency_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."agency_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_triggeredByUserId_users_id_fk" FOREIGN KEY ("triggeredByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_webhooks" ADD CONSTRAINT "user_webhooks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_action_sequences" ADD CONSTRAINT "rag_action_sequences_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_element_selectors" ADD CONSTRAINT "rag_element_selectors_page_id_rag_page_knowledge_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."rag_page_knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_element_selectors" ADD CONSTRAINT "rag_element_selectors_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_error_patterns" ADD CONSTRAINT "rag_error_patterns_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_execution_logs" ADD CONSTRAINT "rag_execution_logs_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_execution_logs" ADD CONSTRAINT "rag_execution_logs_action_sequence_id_rag_action_sequences_id_fk" FOREIGN KEY ("action_sequence_id") REFERENCES "public"."rag_action_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_page_knowledge" ADD CONSTRAINT "rag_page_knowledge_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_support_documents" ADD CONSTRAINT "rag_support_documents_website_id_rag_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."rag_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_tasks_user_id_idx" ON "agency_tasks" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_tasks_uuid_idx" ON "agency_tasks" USING btree ("taskUuid");--> statement-breakpoint
CREATE INDEX "agency_tasks_status_idx" ON "agency_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agency_tasks_priority_idx" ON "agency_tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "agency_tasks_task_type_idx" ON "agency_tasks" USING btree ("taskType");--> statement-breakpoint
CREATE INDEX "agency_tasks_scheduled_for_idx" ON "agency_tasks" USING btree ("scheduledFor");--> statement-breakpoint
CREATE INDEX "agency_tasks_conversation_id_idx" ON "agency_tasks" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "agency_tasks_user_status_idx" ON "agency_tasks" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "agency_tasks_pending_bot_idx" ON "agency_tasks" USING btree ("status","assignedToBot","scheduledFor");--> statement-breakpoint
CREATE INDEX "bot_conversations_user_id_idx" ON "bot_conversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "bot_conversations_webhook_id_idx" ON "bot_conversations" USING btree ("webhookId");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_conversations_uuid_idx" ON "bot_conversations" USING btree ("conversationUuid");--> statement-breakpoint
CREATE INDEX "bot_conversations_participant_idx" ON "bot_conversations" USING btree ("participantIdentifier");--> statement-breakpoint
CREATE INDEX "bot_conversations_status_idx" ON "bot_conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bot_conversations_user_participant_idx" ON "bot_conversations" USING btree ("userId","participantIdentifier");--> statement-breakpoint
CREATE INDEX "inbound_messages_webhook_id_idx" ON "inbound_messages" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX "inbound_messages_user_id_idx" ON "inbound_messages" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "inbound_messages_sender_idx" ON "inbound_messages" USING btree ("senderIdentifier");--> statement-breakpoint
CREATE INDEX "inbound_messages_status_idx" ON "inbound_messages" USING btree ("processingStatus");--> statement-breakpoint
CREATE INDEX "inbound_messages_conversation_idx" ON "inbound_messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "inbound_messages_received_at_idx" ON "inbound_messages" USING btree ("receivedAt");--> statement-breakpoint
CREATE INDEX "inbound_messages_user_webhook_idx" ON "inbound_messages" USING btree ("userId","webhookId");--> statement-breakpoint
CREATE INDEX "outbound_messages_webhook_id_idx" ON "outbound_messages" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX "outbound_messages_user_id_idx" ON "outbound_messages" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "outbound_messages_task_id_idx" ON "outbound_messages" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "outbound_messages_conversation_id_idx" ON "outbound_messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "outbound_messages_delivery_status_idx" ON "outbound_messages" USING btree ("deliveryStatus");--> statement-breakpoint
CREATE INDEX "outbound_messages_scheduled_for_idx" ON "outbound_messages" USING btree ("scheduledFor");--> statement-breakpoint
CREATE INDEX "outbound_messages_pending_idx" ON "outbound_messages" USING btree ("deliveryStatus","scheduledFor");--> statement-breakpoint
CREATE INDEX "task_executions_task_id_idx" ON "task_executions" USING btree ("taskId");--> statement-breakpoint
CREATE UNIQUE INDEX "task_executions_uuid_idx" ON "task_executions" USING btree ("executionUuid");--> statement-breakpoint
CREATE INDEX "task_executions_status_idx" ON "task_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_executions_started_at_idx" ON "task_executions" USING btree ("startedAt");--> statement-breakpoint
CREATE INDEX "task_executions_browser_session_idx" ON "task_executions" USING btree ("browserSessionId");--> statement-breakpoint
CREATE INDEX "user_webhooks_user_id_idx" ON "user_webhooks" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_webhooks_token_idx" ON "user_webhooks" USING btree ("webhookToken");--> statement-breakpoint
CREATE INDEX "user_webhooks_channel_type_idx" ON "user_webhooks" USING btree ("channelType");--> statement-breakpoint
CREATE INDEX "user_webhooks_is_active_idx" ON "user_webhooks" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "user_webhooks_user_channel_idx" ON "user_webhooks" USING btree ("userId","channelType");--> statement-breakpoint
CREATE INDEX "rag_action_sequences_website_idx" ON "rag_action_sequences" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_action_sequences_task_idx" ON "rag_action_sequences" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "rag_action_sequences_success_idx" ON "rag_action_sequences" USING btree ("success_rate");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_action_sequences_website_name_unique" ON "rag_action_sequences" USING btree ("website_id","name");--> statement-breakpoint
CREATE INDEX "rag_element_selectors_website_idx" ON "rag_element_selectors" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_element_selectors_page_idx" ON "rag_element_selectors" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "rag_element_selectors_type_idx" ON "rag_element_selectors" USING btree ("element_type");--> statement-breakpoint
CREATE INDEX "rag_element_selectors_reliability_idx" ON "rag_element_selectors" USING btree ("reliability_score");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_element_selectors_website_element_unique" ON "rag_element_selectors" USING btree ("website_id","element_name");--> statement-breakpoint
CREATE INDEX "rag_error_patterns_website_idx" ON "rag_error_patterns" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_error_patterns_type_idx" ON "rag_error_patterns" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "rag_execution_logs_website_idx" ON "rag_execution_logs" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_execution_logs_sequence_idx" ON "rag_execution_logs" USING btree ("action_sequence_id");--> statement-breakpoint
CREATE INDEX "rag_execution_logs_success_idx" ON "rag_execution_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "rag_execution_logs_created_idx" ON "rag_execution_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rag_page_knowledge_website_idx" ON "rag_page_knowledge" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_page_knowledge_type_idx" ON "rag_page_knowledge" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX "rag_support_docs_website_idx" ON "rag_support_documents" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "rag_support_docs_type_idx" ON "rag_support_documents" USING btree ("document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_websites_domain_idx" ON "rag_websites" USING btree ("domain");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_listId_lead_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."lead_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentation_chunks" ADD CONSTRAINT "documentation_chunks_sourceId_documentation_sources_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."documentation_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentation_sources" ADD CONSTRAINT "documentation_sources_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" ADD CONSTRAINT "alert_delivery_queue_alertHistoryId_alert_history_id_fk" FOREIGN KEY ("alertHistoryId") REFERENCES "public"."alert_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_ruleId_alert_rules_id_fk" FOREIGN KEY ("ruleId") REFERENCES "public"."alert_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_acknowledgedBy_users_id_fk" FOREIGN KEY ("acknowledgedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD CONSTRAINT "cron_job_registry_taskId_scheduled_browser_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."scheduled_browser_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" ADD CONSTRAINT "scheduled_task_executions_taskId_scheduled_browser_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."scheduled_browser_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_lastModifiedBy_users_id_fk" FOREIGN KEY ("lastModifiedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "campaignId";--> statement-breakpoint
ALTER TABLE "documentation_chunks" DROP COLUMN "platform";--> statement-breakpoint
ALTER TABLE "documentation_chunks" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "documentation_chunks" DROP COLUMN "embedding";--> statement-breakpoint
ALTER TABLE "documentation_chunks" DROP COLUMN "keywords";--> statement-breakpoint
ALTER TABLE "documentation_sources" DROP COLUMN "uploadedBy";--> statement-breakpoint
ALTER TABLE "platform_keywords" DROP COLUMN "keywordType";--> statement-breakpoint
ALTER TABLE "platform_keywords" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "query";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "detectedPlatforms";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "retrievedChunkIds";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "topSimilarityScore";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "averageSimilarityScore";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "retrievalTimeMs";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "chunkCount";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "wasHelpful";--> statement-breakpoint
ALTER TABLE "alert_delivery_queue" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "platform";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "template";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "isDefault";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "isActive";--> statement-breakpoint
ALTER TABLE "alert_history" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "lastTick";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "lastExecution";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "nextExecution";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "consecutiveFailures";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "lastError";--> statement-breakpoint
ALTER TABLE "cron_job_registry" DROP COLUMN "registeredAt";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "errorStack";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "screenshots";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "stepsCompleted";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "stepsTotal";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "pageLoadTime";--> statement-breakpoint
ALTER TABLE "scheduled_task_executions" DROP COLUMN "interactionTime";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "mediaId";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "taskType";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "progress";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "processingStartedAt";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "processingCompletedAt";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "processingDurationMs";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "workerId";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "retryCount";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "maxRetries";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "errorMessage";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "outputMetadata";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "sessionId";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "workflowExecutionId";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "mediaType";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "fileFormat";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "mimeType";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "storageProvider";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "storageUrl";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "storagePath";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "thumbnailUrl";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "fileName";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "fileSizeBytes";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "durationMs";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "width";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "retentionDays";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "expiresAt";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "isExpired";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "context";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "workflowStepName";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "processingStatus";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "processingError";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "isPublic";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "shareToken";--> statement-breakpoint
ALTER TABLE "credit_packages" DROP COLUMN "shareExpiresAt";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_googleId_unique" UNIQUE("googleId");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "cron_job_registry" ADD CONSTRAINT "cron_job_registry_jobId_unique" UNIQUE("jobId");