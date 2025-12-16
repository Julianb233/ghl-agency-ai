-- Memory & Learning System Migration
-- Creates tables for long-term user memory, checkpointing, and pattern learning

-- ========================================
-- USER MEMORY TABLE
-- Stores long-term user preferences and learned patterns
-- ========================================

CREATE TABLE IF NOT EXISTS "user_memory" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "preferences" JSONB DEFAULT '{
    "actionSpeed": "normal",
    "approvalRequired": true,
    "favoriteStrategies": [],
    "autoApprovePatterns": [],
    "defaultTimeout": 30000,
    "maxRetries": 3
  }'::jsonb NOT NULL,
  "taskHistory" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "learnedPatterns" JSONB DEFAULT '{
    "ghlSelectors": {},
    "commonWorkflows": [],
    "errorRecovery": [],
    "customCommands": []
  }'::jsonb NOT NULL,
  "userCorrections" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "stats" JSONB DEFAULT '{
    "totalExecutions": 0,
    "successfulExecutions": 0,
    "avgExecutionTime": 0,
    "mostUsedTasks": {},
    "preferredApproaches": {}
  }'::jsonb NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastAccessedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_memory_user_id_idx" ON "user_memory"("userId");

-- ========================================
-- EXECUTION CHECKPOINTS TABLE
-- Stores execution state for recovery and resumption
-- ========================================

CREATE TABLE IF NOT EXISTS "execution_checkpoints" (
  "id" SERIAL PRIMARY KEY,
  "checkpointId" VARCHAR(255) NOT NULL UNIQUE,
  "executionId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "phaseId" INTEGER,
  "phaseName" TEXT,
  "stepIndex" INTEGER DEFAULT 0 NOT NULL,
  "completedSteps" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "completedPhases" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "partialResults" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "extractedData" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "sessionState" JSONB DEFAULT '{
    "url": null,
    "cookies": [],
    "localStorage": {},
    "sessionStorage": {},
    "authenticatedAs": null
  }'::jsonb,
  "browserContext" JSONB DEFAULT '{
    "pageState": null,
    "domSnapshot": null,
    "screenshotUrl": null
  }'::jsonb,
  "errorInfo" JSONB,
  "checkpointReason" VARCHAR(100),
  "canResume" BOOLEAN DEFAULT true NOT NULL,
  "resumeCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "expiresAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "execution_checkpoint_id_idx" ON "execution_checkpoints"("checkpointId");
CREATE INDEX IF NOT EXISTS "execution_checkpoint_execution_id_idx" ON "execution_checkpoints"("executionId");
CREATE INDEX IF NOT EXISTS "execution_checkpoint_user_id_idx" ON "execution_checkpoints"("userId");
CREATE INDEX IF NOT EXISTS "execution_checkpoint_created_at_idx" ON "execution_checkpoints"("createdAt");
CREATE INDEX IF NOT EXISTS "execution_checkpoint_expires_at_idx" ON "execution_checkpoints"("expiresAt");

-- ========================================
-- TASK SUCCESS PATTERNS TABLE
-- Stores successful task execution patterns for reuse
-- ========================================

CREATE TABLE IF NOT EXISTS "task_success_patterns" (
  "id" SERIAL PRIMARY KEY,
  "patternId" VARCHAR(255) NOT NULL UNIQUE,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "taskType" VARCHAR(100) NOT NULL,
  "taskName" TEXT,
  "successfulApproach" JSONB NOT NULL,
  "selectors" JSONB DEFAULT '{}'::jsonb,
  "workflow" JSONB DEFAULT '[]'::jsonb,
  "contextConditions" JSONB DEFAULT '{}'::jsonb,
  "requiredState" JSONB DEFAULT '{}'::jsonb,
  "avgExecutionTime" REAL,
  "successRate" REAL DEFAULT 1.0 NOT NULL,
  "usageCount" INTEGER DEFAULT 1 NOT NULL,
  "confidence" REAL DEFAULT 0.8 NOT NULL,
  "adaptations" JSONB DEFAULT '[]'::jsonb,
  "reasoningPatternId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastUsedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "task_success_user_id_idx" ON "task_success_patterns"("userId");
CREATE INDEX IF NOT EXISTS "task_success_task_type_idx" ON "task_success_patterns"("taskType");
CREATE INDEX IF NOT EXISTS "task_success_success_rate_idx" ON "task_success_patterns"("successRate");
CREATE INDEX IF NOT EXISTS "task_success_confidence_idx" ON "task_success_patterns"("confidence");

-- ========================================
-- USER FEEDBACK TABLE
-- Stores explicit user feedback for learning
-- ========================================

CREATE TABLE IF NOT EXISTS "user_feedback" (
  "id" SERIAL PRIMARY KEY,
  "feedbackId" VARCHAR(255) NOT NULL UNIQUE,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "executionId" INTEGER,
  "feedbackType" VARCHAR(50) NOT NULL,
  "originalAction" JSONB NOT NULL,
  "correctedAction" JSONB,
  "context" JSONB DEFAULT '{}'::jsonb,
  "sentiment" VARCHAR(20),
  "impact" VARCHAR(20),
  "processed" BOOLEAN DEFAULT false NOT NULL,
  "appliedToPattern" BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_feedback_user_id_idx" ON "user_feedback"("userId");
CREATE INDEX IF NOT EXISTS "user_feedback_execution_id_idx" ON "user_feedback"("executionId");
CREATE INDEX IF NOT EXISTS "user_feedback_processed_idx" ON "user_feedback"("processed");
CREATE INDEX IF NOT EXISTS "user_feedback_type_idx" ON "user_feedback"("feedbackType");

-- ========================================
-- WORKFLOW PATTERNS TABLE
-- Pre-built and learned workflow patterns
-- ========================================

CREATE TABLE IF NOT EXISTS "workflow_patterns" (
  "id" SERIAL PRIMARY KEY,
  "patternId" VARCHAR(255) NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100),
  "pattern" JSONB NOT NULL,
  "variables" JSONB DEFAULT '[]'::jsonb,
  "conditions" JSONB DEFAULT '{}'::jsonb,
  "userId" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "isPublic" BOOLEAN DEFAULT false NOT NULL,
  "isSystemPattern" BOOLEAN DEFAULT false NOT NULL,
  "usageCount" INTEGER DEFAULT 0 NOT NULL,
  "successRate" REAL DEFAULT 1.0 NOT NULL,
  "avgExecutionTime" REAL,
  "tags" JSONB DEFAULT '[]'::jsonb,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastUsedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "workflow_pattern_user_id_idx" ON "workflow_patterns"("userId");
CREATE INDEX IF NOT EXISTS "workflow_pattern_category_idx" ON "workflow_patterns"("category");
CREATE INDEX IF NOT EXISTS "workflow_pattern_public_idx" ON "workflow_patterns"("isPublic");
CREATE INDEX IF NOT EXISTS "workflow_pattern_system_idx" ON "workflow_patterns"("isSystemPattern");

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE "user_memory" IS 'Long-term storage of user preferences and learned patterns across sessions';
COMMENT ON TABLE "execution_checkpoints" IS 'Execution checkpoints for resuming failed or interrupted tasks';
COMMENT ON TABLE "task_success_patterns" IS 'Successful task execution patterns for intelligent reuse and adaptation';
COMMENT ON TABLE "user_feedback" IS 'Explicit user feedback (corrections, approvals, rejections) for learning';
COMMENT ON TABLE "workflow_patterns" IS 'Reusable workflow patterns (system-defined and user-created)';

COMMENT ON COLUMN "user_memory"."preferences" IS 'User preferences for action speed, approval requirements, etc.';
COMMENT ON COLUMN "user_memory"."taskHistory" IS 'Array of recent task execution summaries (last 100)';
COMMENT ON COLUMN "user_memory"."learnedPatterns" IS 'Learned patterns including GHL selectors, workflows, and error recovery';
COMMENT ON COLUMN "user_memory"."userCorrections" IS 'User corrections to agent actions for learning';
COMMENT ON COLUMN "user_memory"."stats" IS 'Aggregated statistics about user executions and preferences';

COMMENT ON COLUMN "execution_checkpoints"."sessionState" IS 'Browser session state (URL, cookies, localStorage, etc.)';
COMMENT ON COLUMN "execution_checkpoints"."browserContext" IS 'Browser-specific context (page state, DOM snapshot, screenshot)';
COMMENT ON COLUMN "execution_checkpoints"."checkpointReason" IS 'Why checkpoint was created: error, manual, auto, phase_complete';
COMMENT ON COLUMN "execution_checkpoints"."canResume" IS 'Whether this checkpoint can be resumed from';
COMMENT ON COLUMN "execution_checkpoints"."resumeCount" IS 'Number of times resumed from this checkpoint';

COMMENT ON COLUMN "task_success_patterns"."successfulApproach" IS 'The approach/strategy that led to successful execution';
COMMENT ON COLUMN "task_success_patterns"."selectors" IS 'Successful CSS/XPath selectors used in this pattern';
COMMENT ON COLUMN "task_success_patterns"."workflow" IS 'Step-by-step workflow that succeeded';
COMMENT ON COLUMN "task_success_patterns"."contextConditions" IS 'Conditions under which this pattern applies';
COMMENT ON COLUMN "task_success_patterns"."confidence" IS 'Confidence score (0.0-1.0) in this pattern';
COMMENT ON COLUMN "task_success_patterns"."reasoningPatternId" IS 'Link to reasoning_patterns table if applicable';

COMMENT ON COLUMN "user_feedback"."feedbackType" IS 'Type: correction, approval, rejection, suggestion';
COMMENT ON COLUMN "user_feedback"."sentiment" IS 'User sentiment: positive, negative, neutral';
COMMENT ON COLUMN "user_feedback"."impact" IS 'Feedback impact level: critical, important, minor';
COMMENT ON COLUMN "user_feedback"."processed" IS 'Whether feedback has been processed by learning engine';
COMMENT ON COLUMN "user_feedback"."appliedToPattern" IS 'Whether feedback has been applied to update patterns';

COMMENT ON COLUMN "workflow_patterns"."isPublic" IS 'Whether pattern is shared with other users';
COMMENT ON COLUMN "workflow_patterns"."isSystemPattern" IS 'Whether pattern is system-defined (not user-created)';
