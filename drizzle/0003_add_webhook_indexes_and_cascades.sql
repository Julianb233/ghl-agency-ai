-- Migration: Add indexes and cascade deletes for webhook tables
-- Generated: 2024-12-10

-- ========================================
-- USER WEBHOOKS INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "user_webhooks_user_id_idx" ON "user_webhooks" ("userId");
CREATE INDEX IF NOT EXISTS "user_webhooks_channel_type_idx" ON "user_webhooks" ("channelType");
CREATE INDEX IF NOT EXISTS "user_webhooks_is_active_idx" ON "user_webhooks" ("isActive");
CREATE INDEX IF NOT EXISTS "user_webhooks_user_channel_idx" ON "user_webhooks" ("userId", "channelType");

-- ========================================
-- INBOUND MESSAGES INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "inbound_messages_webhook_id_idx" ON "inbound_messages" ("webhookId");
CREATE INDEX IF NOT EXISTS "inbound_messages_user_id_idx" ON "inbound_messages" ("userId");
CREATE INDEX IF NOT EXISTS "inbound_messages_sender_idx" ON "inbound_messages" ("senderIdentifier");
CREATE INDEX IF NOT EXISTS "inbound_messages_status_idx" ON "inbound_messages" ("processingStatus");
CREATE INDEX IF NOT EXISTS "inbound_messages_conversation_idx" ON "inbound_messages" ("conversationId");
CREATE INDEX IF NOT EXISTS "inbound_messages_received_at_idx" ON "inbound_messages" ("receivedAt");
CREATE INDEX IF NOT EXISTS "inbound_messages_user_webhook_idx" ON "inbound_messages" ("userId", "webhookId");

-- ========================================
-- BOT CONVERSATIONS INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "bot_conversations_user_id_idx" ON "bot_conversations" ("userId");
CREATE INDEX IF NOT EXISTS "bot_conversations_webhook_id_idx" ON "bot_conversations" ("webhookId");
CREATE INDEX IF NOT EXISTS "bot_conversations_participant_idx" ON "bot_conversations" ("participantIdentifier");
CREATE INDEX IF NOT EXISTS "bot_conversations_status_idx" ON "bot_conversations" ("status");
CREATE INDEX IF NOT EXISTS "bot_conversations_user_participant_idx" ON "bot_conversations" ("userId", "participantIdentifier");

-- ========================================
-- AGENCY TASKS INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "agency_tasks_user_id_idx" ON "agency_tasks" ("userId");
CREATE INDEX IF NOT EXISTS "agency_tasks_status_idx" ON "agency_tasks" ("status");
CREATE INDEX IF NOT EXISTS "agency_tasks_priority_idx" ON "agency_tasks" ("priority");
CREATE INDEX IF NOT EXISTS "agency_tasks_task_type_idx" ON "agency_tasks" ("taskType");
CREATE INDEX IF NOT EXISTS "agency_tasks_scheduled_for_idx" ON "agency_tasks" ("scheduledFor");
CREATE INDEX IF NOT EXISTS "agency_tasks_conversation_id_idx" ON "agency_tasks" ("conversationId");
CREATE INDEX IF NOT EXISTS "agency_tasks_user_status_idx" ON "agency_tasks" ("userId", "status");
CREATE INDEX IF NOT EXISTS "agency_tasks_pending_bot_idx" ON "agency_tasks" ("status", "assignedToBot", "scheduledFor");

-- ========================================
-- TASK EXECUTIONS INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "task_executions_task_id_idx" ON "task_executions" ("taskId");
CREATE INDEX IF NOT EXISTS "task_executions_status_idx" ON "task_executions" ("status");
CREATE INDEX IF NOT EXISTS "task_executions_started_at_idx" ON "task_executions" ("startedAt");
CREATE INDEX IF NOT EXISTS "task_executions_browser_session_idx" ON "task_executions" ("browserSessionId");

-- ========================================
-- OUTBOUND MESSAGES INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS "outbound_messages_webhook_id_idx" ON "outbound_messages" ("webhookId");
CREATE INDEX IF NOT EXISTS "outbound_messages_user_id_idx" ON "outbound_messages" ("userId");
CREATE INDEX IF NOT EXISTS "outbound_messages_task_id_idx" ON "outbound_messages" ("taskId");
CREATE INDEX IF NOT EXISTS "outbound_messages_conversation_id_idx" ON "outbound_messages" ("conversationId");
CREATE INDEX IF NOT EXISTS "outbound_messages_delivery_status_idx" ON "outbound_messages" ("deliveryStatus");
CREATE INDEX IF NOT EXISTS "outbound_messages_scheduled_for_idx" ON "outbound_messages" ("scheduledFor");
CREATE INDEX IF NOT EXISTS "outbound_messages_pending_idx" ON "outbound_messages" ("deliveryStatus", "scheduledFor");

-- ========================================
-- CASCADE DELETE UPDATES
-- Note: These require dropping and recreating constraints
-- Run these manually if foreign keys were created without cascade
-- ========================================

-- user_webhooks: Add cascade on userId
-- ALTER TABLE "user_webhooks" DROP CONSTRAINT IF EXISTS "user_webhooks_userId_users_id_fk";
-- ALTER TABLE "user_webhooks" ADD CONSTRAINT "user_webhooks_userId_users_id_fk"
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- inbound_messages: Add cascade on webhookId and userId
-- ALTER TABLE "inbound_messages" DROP CONSTRAINT IF EXISTS "inbound_messages_webhookId_user_webhooks_id_fk";
-- ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_webhookId_user_webhooks_id_fk"
--   FOREIGN KEY ("webhookId") REFERENCES "user_webhooks"("id") ON DELETE CASCADE;

-- ALTER TABLE "inbound_messages" DROP CONSTRAINT IF EXISTS "inbound_messages_userId_users_id_fk";
-- ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_userId_users_id_fk"
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- bot_conversations: Add cascade on userId, set null on webhookId
-- ALTER TABLE "bot_conversations" DROP CONSTRAINT IF EXISTS "bot_conversations_userId_users_id_fk";
-- ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_userId_users_id_fk"
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- ALTER TABLE "bot_conversations" DROP CONSTRAINT IF EXISTS "bot_conversations_webhookId_user_webhooks_id_fk";
-- ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_webhookId_user_webhooks_id_fk"
--   FOREIGN KEY ("webhookId") REFERENCES "user_webhooks"("id") ON DELETE SET NULL;

-- agency_tasks: Add cascade on userId, set null on source references
-- ALTER TABLE "agency_tasks" DROP CONSTRAINT IF EXISTS "agency_tasks_userId_users_id_fk";
-- ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_userId_users_id_fk"
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- outbound_messages: Add cascade on webhookId and userId
-- ALTER TABLE "outbound_messages" DROP CONSTRAINT IF EXISTS "outbound_messages_webhookId_user_webhooks_id_fk";
-- ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_webhookId_user_webhooks_id_fk"
--   FOREIGN KEY ("webhookId") REFERENCES "user_webhooks"("id") ON DELETE CASCADE;

-- ALTER TABLE "outbound_messages" DROP CONSTRAINT IF EXISTS "outbound_messages_userId_users_id_fk";
-- ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_userId_users_id_fk"
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
