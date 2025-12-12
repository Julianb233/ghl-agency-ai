-- Migration: Add admin dashboard tables
-- Created: 2025-12-11
-- Description: Adds tables for admin dashboard functionality including audit logs,
--              feature flags, system config, support tickets, and security events

-- Audit logs table
-- Tracks all admin actions for compliance and security auditing
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "action" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "entityId" VARCHAR(100),
  "oldValues" JSONB,
  "newValues" JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("createdAt");

-- Feature flags table
-- Feature toggle system for gradual rollout and A/B testing
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "description" TEXT,
  "enabled" BOOLEAN DEFAULT false NOT NULL,
  "rolloutPercentage" INTEGER DEFAULT 0 NOT NULL,
  "userWhitelist" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for feature_flags
CREATE INDEX IF NOT EXISTS "idx_feature_flags_name" ON "feature_flags"("name");
CREATE INDEX IF NOT EXISTS "idx_feature_flags_enabled" ON "feature_flags"("enabled");

-- System configuration table
-- Runtime configuration values for dynamic system settings
CREATE TABLE IF NOT EXISTS "system_config" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedBy" INTEGER REFERENCES "users"("id"),
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for system_config
CREATE INDEX IF NOT EXISTS "idx_system_config_key" ON "system_config"("key");

-- Support tickets table
-- Customer support ticketing system
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "subject" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "status" VARCHAR(20) DEFAULT 'open' NOT NULL,
  "priority" VARCHAR(20) DEFAULT 'medium' NOT NULL,
  "assignedTo" INTEGER REFERENCES "users"("id"),
  "category" VARCHAR(50),
  "tags" JSONB,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP,
  "closedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for support_tickets
CREATE INDEX IF NOT EXISTS "idx_support_tickets_user_id" ON "support_tickets"("userId");
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "idx_support_tickets_priority" ON "support_tickets"("priority");
CREATE INDEX IF NOT EXISTS "idx_support_tickets_assigned" ON "support_tickets"("assignedTo");

-- Ticket messages table
-- Messages/replies within support tickets
CREATE TABLE IF NOT EXISTS "ticket_messages" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "senderId" INTEGER NOT NULL REFERENCES "users"("id"),
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN DEFAULT false NOT NULL,
  "attachments" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for ticket_messages
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_ticket_id" ON "ticket_messages"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_sender_id" ON "ticket_messages"("senderId");

-- Announcements table
-- System-wide or targeted in-app announcements
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "type" VARCHAR(20) DEFAULT 'info' NOT NULL,
  "targetRoles" JSONB,
  "targetUsers" JSONB,
  "startsAt" TIMESTAMP NOT NULL,
  "endsAt" TIMESTAMP,
  "isDismissible" BOOLEAN DEFAULT true NOT NULL,
  "priority" INTEGER DEFAULT 0 NOT NULL,
  "linkUrl" TEXT,
  "linkText" VARCHAR(100),
  "createdBy" INTEGER NOT NULL REFERENCES "users"("id"),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for announcements
CREATE INDEX IF NOT EXISTS "idx_announcements_starts_at" ON "announcements"("startsAt");
CREATE INDEX IF NOT EXISTS "idx_announcements_ends_at" ON "announcements"("endsAt");
CREATE INDEX IF NOT EXISTS "idx_announcements_type" ON "announcements"("type");

-- Security events table
-- Security monitoring and threat detection
CREATE TABLE IF NOT EXISTS "security_events" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "users"("id"),
  "eventType" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) DEFAULT 'low' NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "geoLocation" JSONB,
  "resolved" BOOLEAN DEFAULT false NOT NULL,
  "resolvedBy" INTEGER REFERENCES "users"("id"),
  "resolvedAt" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS "idx_security_events_user_id" ON "security_events"("userId");
CREATE INDEX IF NOT EXISTS "idx_security_events_type" ON "security_events"("eventType");
CREATE INDEX IF NOT EXISTS "idx_security_events_severity" ON "security_events"("severity");
CREATE INDEX IF NOT EXISTS "idx_security_events_resolved" ON "security_events"("resolved");
CREATE INDEX IF NOT EXISTS "idx_security_events_ip" ON "security_events"("ipAddress");
CREATE INDEX IF NOT EXISTS "idx_security_events_created_at" ON "security_events"("createdAt");
