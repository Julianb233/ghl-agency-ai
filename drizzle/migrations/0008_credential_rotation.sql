-- Credential Rotation System
-- Migration: 0008_credential_rotation.sql
-- Created: 2026-01-13

-- Credential rotation policies table
CREATE TABLE IF NOT EXISTS "credential_policies" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "credentialType" VARCHAR(50) NOT NULL,
  "rotationIntervalDays" INTEGER NOT NULL,
  "lastRotatedAt" TIMESTAMP,
  "nextRotationAt" TIMESTAMP,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Credential rotation logs table
CREATE TABLE IF NOT EXISTS "credential_rotation_logs" (
  "id" SERIAL PRIMARY KEY,
  "policyId" INTEGER NOT NULL REFERENCES "credential_policies"("id"),
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "credentialType" VARCHAR(50) NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "oldKeyHash" VARCHAR(4),
  "newKeyHash" VARCHAR(4),
  "reason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for credential_policies
CREATE INDEX IF NOT EXISTS "credential_policies_user_id_idx" ON "credential_policies"("userId");
CREATE INDEX IF NOT EXISTS "credential_policies_credential_type_idx" ON "credential_policies"("credentialType");
CREATE INDEX IF NOT EXISTS "credential_policies_next_rotation_at_idx" ON "credential_policies"("nextRotationAt");
CREATE INDEX IF NOT EXISTS "credential_policies_user_credential_type_idx" ON "credential_policies"("userId", "credentialType");

-- Indexes for credential_rotation_logs
CREATE INDEX IF NOT EXISTS "credential_rotation_logs_policy_id_idx" ON "credential_rotation_logs"("policyId");
CREATE INDEX IF NOT EXISTS "credential_rotation_logs_user_id_idx" ON "credential_rotation_logs"("userId");
CREATE INDEX IF NOT EXISTS "credential_rotation_logs_created_at_idx" ON "credential_rotation_logs"("createdAt");
