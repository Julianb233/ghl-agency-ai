# GHL Agency AI - Database Schema Documentation

## Overview

GHL Agency AI uses PostgreSQL (via Neon) with Drizzle ORM. The schema is organized into modular files by domain.

## Schema Files

| File | Domain | Description |
|------|--------|-------------|
| `schema.ts` | Core | Users, sessions, profiles, documents |
| `schema-agent.ts` | Agent | AI agent sessions and executions |
| `schema-webhooks.ts` | Webhooks | Webhook configs, messages, conversations |
| `schema-scheduled-tasks.ts` | Scheduling | Cron jobs and scheduled automations |
| `schema-lead-enrichment.ts` | Leads | Lead data and credit system |
| `schema-rag.ts` | RAG | Documentation storage and retrieval |
| `schema-email.ts` | Email | Email templates and campaigns |
| `schema-seo.ts` | SEO | SEO keywords and metrics |
| `schema-meta-ads.ts` | Ads | Meta/Facebook ads management |
| `schema-alerts.ts` | Alerts | Alert rules and notifications |
| `schema-admin.ts` | Admin | Audit logs and admin functions |

---

## Core Schema (`schema.ts`)

### users
Primary user authentication table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `username` | varchar(255) | Unique username |
| `password` | text | Hashed password |
| `email` | varchar(255) | Unique email |
| `role` | varchar(50) | user, admin, superadmin |
| `isOnboarded` | boolean | Onboarding completion |
| `stripeCustomerId` | varchar(255) | Stripe customer ID |
| `subscriptionStatus` | varchar(50) | Subscription state |
| `createdAt` | timestamp | Creation time |

### sessions
JWT session tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text | Session token (PK) |
| `userId` | integer | FK to users |
| `expiresAt` | timestamp | Expiration time |

### userProfiles
Extended user profile information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `displayName` | varchar(255) | Display name |
| `avatarUrl` | text | Profile image URL |
| `companyName` | varchar(255) | Company name |
| `industry` | varchar(100) | Industry type |
| `teamSize` | varchar(50) | Team size |
| `primaryGoals` | jsonb | User goals |
| `preferences` | jsonb | UI preferences |

### clientProfiles
Client management for agencies.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `name` | varchar(255) | Client name |
| `brandVoice` | text | Brand voice description |
| `targetAudience` | text | Target audience |
| `industry` | varchar(100) | Industry |
| `website` | text | Website URL |
| `socialLinks` | jsonb | Social media links |
| `seoConfig` | jsonb | SEO configuration |
| `assets` | jsonb | Brand assets |
| `createdAt` | timestamp | Creation time |

### documents
File and document storage.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `filename` | varchar(255) | File name |
| `mimeType` | varchar(100) | MIME type |
| `size` | integer | File size in bytes |
| `s3Key` | varchar(500) | S3 storage key |
| `metadata` | jsonb | Additional metadata |
| `createdAt` | timestamp | Upload time |

### browserSessions
Browser automation session tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `sessionId` | varchar(255) | External session ID |
| `status` | varchar(50) | active, completed, error |
| `liveUrl` | text | Live view URL |
| `connectUrl` | text | WebSocket URL |
| `metadata` | jsonb | Session metadata |
| `startedAt` | timestamp | Start time |
| `endedAt` | timestamp | End time |

### automationWorkflows
Workflow definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `name` | varchar(255) | Workflow name |
| `description` | text | Description |
| `steps` | jsonb | Workflow steps array |
| `config` | jsonb | Configuration |
| `isActive` | boolean | Active status |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

### workflowExecutions
Workflow execution history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `workflowId` | integer | FK to workflows |
| `userId` | integer | FK to users |
| `status` | varchar(50) | pending, running, completed, failed |
| `result` | jsonb | Execution result |
| `error` | text | Error message |
| `startedAt` | timestamp | Start time |
| `completedAt` | timestamp | Completion time |

### apiKeys
API key management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `name` | varchar(255) | Key name |
| `keyHash` | text | Hashed key |
| `keyPrefix` | varchar(20) | Key prefix (visible) |
| `permissions` | jsonb | Permissions array |
| `lastUsedAt` | timestamp | Last usage |
| `expiresAt` | timestamp | Expiration |
| `isActive` | boolean | Active status |
| `createdAt` | timestamp | Creation time |

---

## Agent Schema (`schema-agent.ts`)

### agentSessions
Persistent agent context.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `sessionUuid` | uuid | External reference UUID |
| `status` | varchar(50) | idle, planning, executing, complete, error, paused |
| `context` | jsonb | Conversation context |
| `thinkingSteps` | jsonb | Reasoning steps array |
| `toolHistory` | jsonb | Tool execution history |
| `plan` | jsonb | Current execution plan |
| `currentPhase` | varchar(100) | Current phase name |
| `iterationCount` | integer | Iterations performed |
| `maxIterations` | integer | Max allowed iterations |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

### agentExecutions
Task execution tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `sessionId` | integer | FK to agentSessions |
| `userId` | integer | FK to users |
| `taskDescription` | text | Original task request |
| `status` | varchar(50) | pending, planning, executing, completed, failed, cancelled |
| `plan` | jsonb | Execution plan |
| `phases` | jsonb | Execution phases array |
| `currentPhaseIndex` | integer | Current phase index |
| `thinkingSteps` | jsonb | Agent reasoning log |
| `toolExecutions` | jsonb | Tool call results |
| `result` | jsonb | Final result |
| `error` | text | Error message |
| `iterations` | integer | Iterations performed |
| `durationMs` | integer | Execution time in ms |
| `startedAt` | timestamp | Start time |
| `completedAt` | timestamp | Completion time |
| `createdAt` | timestamp | Creation time |

### generatedProjects
Web projects created by agent.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `executionId` | integer | FK to agentExecutions |
| `name` | varchar(255) | Project name |
| `description` | text | Project description |
| `techStack` | varchar(50) | react, vue, next, etc. |
| `features` | jsonb | Project features |
| `filesSnapshot` | jsonb | Generated files |
| `status` | varchar(50) | active, archived, deleted |
| `devServerPort` | integer | Local dev server port |
| `previewUrl` | text | Preview URL |
| `deploymentUrl` | text | Production URL |
| `createdAt` | timestamp | Creation time |

### toolExecutions
Individual tool call tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `executionId` | integer | FK to agentExecutions |
| `toolName` | varchar(100) | Tool name |
| `parameters` | jsonb | Input parameters |
| `result` | jsonb | Tool result |
| `success` | boolean | Success status |
| `durationMs` | integer | Execution time |
| `error` | text | Error message |
| `executedAt` | timestamp | Execution time |

### knowledgeEntries
Agent learning system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `category` | varchar(50) | workflow, brand_voice, preference, etc. |
| `context` | text | Context description |
| `content` | text | Knowledge content |
| `examples` | jsonb | Example applications |
| `confidence` | decimal(3,2) | Confidence score |
| `usageCount` | integer | Usage count |
| `isActive` | boolean | Active status |
| `createdAt` | timestamp | Creation time |

---

## Webhooks Schema (`schema-webhooks.ts`)

### userWebhooks
Webhook endpoint configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `name` | varchar(255) | Webhook name |
| `type` | varchar(50) | sms, email, custom |
| `webhookToken` | varchar(100) | Unique token |
| `isActive` | boolean | Active status |
| `config` | jsonb | Webhook configuration |
| `systemPrompt` | text | AI system prompt |
| `responseFormat` | varchar(50) | Response format |
| `autoRespond` | boolean | Auto-respond enabled |
| `responseDelay` | integer | Delay in seconds |
| `maxResponseLength` | integer | Max response chars |
| `messageCount` | integer | Total messages |
| `lastMessageAt` | timestamp | Last message time |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

### inboundMessages
Incoming webhook messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `webhookId` | integer | FK to userWebhooks |
| `userId` | integer | FK to users |
| `from` | varchar(255) | Sender identifier |
| `to` | varchar(255) | Recipient identifier |
| `body` | text | Message content |
| `mediaUrls` | jsonb | Media attachments |
| `rawPayload` | jsonb | Original payload |
| `status` | varchar(50) | received, processed, error |
| `processedAt` | timestamp | Processing time |
| `error` | text | Error message |
| `receivedAt` | timestamp | Receipt time |

### botConversations
Conversation context tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `webhookId` | integer | FK to userWebhooks |
| `userId` | integer | FK to users |
| `participantId` | varchar(255) | External participant ID |
| `context` | jsonb | Conversation context |
| `messageHistory` | jsonb | Message history array |
| `status` | varchar(50) | active, paused, closed |
| `lastActivityAt` | timestamp | Last activity |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

### outboundMessages
Outgoing messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `webhookId` | integer | FK to userWebhooks |
| `conversationId` | integer | FK to botConversations |
| `inboundMessageId` | integer | FK to inboundMessages |
| `to` | varchar(255) | Recipient |
| `body` | text | Message content |
| `mediaUrls` | jsonb | Media attachments |
| `status` | varchar(50) | pending, sent, delivered, failed |
| `externalId` | varchar(255) | External message ID |
| `error` | text | Error message |
| `sentAt` | timestamp | Send time |
| `createdAt` | timestamp | Creation time |

### agencyTasks
Task board for agency management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | FK to users |
| `clientId` | integer | FK to clientProfiles |
| `webhookId` | integer | FK to userWebhooks |
| `conversationId` | integer | FK to botConversations |
| `title` | varchar(500) | Task title |
| `description` | text | Task description |
| `status` | varchar(50) | backlog, todo, in_progress, review, done |
| `priority` | varchar(20) | low, medium, high, urgent |
| `taskType` | varchar(50) | Task category |
| `tags` | jsonb | Task tags |
| `extractedData` | jsonb | Extracted data |
| `assignedTo` | integer | Assigned user |
| `dueDate` | timestamp | Due date |
| `completedAt` | timestamp | Completion time |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

---

## Claude Flow Schema (`0006_claude_flow_schemas.sql`)

Tables prefixed with `cf_` for Claude Flow swarm coordination.

### cf_swarms
Swarm configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(255) | Primary key |
| `name` | varchar(255) | Swarm name |
| `topology` | varchar(20) | hierarchical, mesh, ring, star |
| `queen_mode` | varchar(20) | centralized, distributed |
| `max_agents` | integer | Max agent count |
| `strategy` | varchar(20) | balanced, specialized, adaptive |
| `status` | varchar(20) | initializing, active, paused, destroyed |
| `config` | jsonb | Configuration |
| `created_at` | timestamp | Creation time |

### cf_agents
Individual agents in swarms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(255) | Primary key |
| `swarm_id` | varchar(255) | FK to cf_swarms |
| `type` | varchar(100) | Agent type |
| `name` | varchar(255) | Agent name |
| `status` | varchar(20) | spawning, idle, busy, error, terminated |
| `capabilities` | jsonb | Agent capabilities |
| `current_task_id` | varchar(255) | Current task |
| `message_count` | integer | Messages processed |
| `error_count` | integer | Errors encountered |
| `success_count` | integer | Successful operations |

### cf_tasks
Task definitions for swarms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(255) | Primary key |
| `swarm_id` | varchar(255) | FK to cf_swarms |
| `description` | text | Task description |
| `priority` | varchar(20) | low, medium, high, critical |
| `strategy` | varchar(20) | parallel, sequential, adaptive |
| `status` | varchar(20) | pending, assigned, running, completed, failed |
| `progress` | integer | Progress percentage |
| `result` | jsonb | Task result |
| `assigned_agents` | jsonb | Assigned agents |

### cf_memory_store
Persistent key-value storage.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(255) | Primary key |
| `namespace` | varchar(255) | Storage namespace |
| `key_name` | varchar(255) | Key name |
| `value` | jsonb | Stored value |
| `ttl` | integer | Time to live (seconds) |
| `expires_at` | timestamp | Expiration time |

### cf_neural_patterns
Learned coordination patterns.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(255) | Primary key |
| `swarm_id` | varchar(255) | FK to cf_swarms |
| `pattern_type` | varchar(50) | coordination, optimization, prediction |
| `pattern_data` | jsonb | Pattern data |
| `confidence` | decimal | Confidence score |
| `usage_count` | integer | Usage count |
| `success_rate` | decimal | Success rate |

---

## Indexes

### Performance Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Session queries
CREATE INDEX idx_sessions_user ON sessions(userId);
CREATE INDEX idx_browser_sessions_user ON browserSessions(userId);
CREATE INDEX idx_browser_sessions_status ON browserSessions(status);

-- Agent queries
CREATE INDEX idx_agent_sessions_user ON agentSessions(userId);
CREATE INDEX idx_agent_executions_session ON agentExecutions(sessionId);
CREATE INDEX idx_agent_executions_status ON agentExecutions(status);

-- Webhook queries
CREATE INDEX idx_webhooks_user ON userWebhooks(userId);
CREATE INDEX idx_webhooks_token ON userWebhooks(webhookToken);
CREATE INDEX idx_inbound_messages_webhook ON inboundMessages(webhookId);
CREATE INDEX idx_conversations_webhook ON botConversations(webhookId);

-- Task queries
CREATE INDEX idx_agency_tasks_user ON agencyTasks(userId);
CREATE INDEX idx_agency_tasks_client ON agencyTasks(clientId);
CREATE INDEX idx_agency_tasks_status ON agencyTasks(status);
```

---

## Migrations

Migrations are managed via Drizzle Kit:

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (development)
npx drizzle-kit push

# View migration status
npx drizzle-kit status
```

### Migration Files

| File | Description |
|------|-------------|
| `0000_outgoing_scarecrow.sql` | Initial schema |
| `0001_moaning_annihilus.sql` | Core tables |
| `0002_webhooks_and_task_board.sql` | Webhook system |
| `0003_add_webhook_indexes_and_cascades.sql` | Performance indexes |
| `0004_chilly_iron_lad.sql` | Agent tables |
| `0005_add_admin_tables.sql` | Admin features |
| `0006_claude_flow_schemas.sql` | Claude Flow integration |

---

## Entity Relationships

```
users
├── userProfiles (1:1)
├── clientProfiles (1:N)
├── agentSessions (1:N)
│   └── agentExecutions (1:N)
│       └── toolExecutions (1:N)
├── userWebhooks (1:N)
│   ├── inboundMessages (1:N)
│   ├── botConversations (1:N)
│   │   └── outboundMessages (1:N)
│   └── agencyTasks (1:N)
├── automationWorkflows (1:N)
│   └── workflowExecutions (1:N)
├── apiKeys (1:N)
├── user_credits (1:N)
└── documents (1:N)

cf_swarms
├── cf_agents (1:N)
├── cf_tasks (1:N)
│   └── cf_task_assignments (1:N)
├── cf_neural_patterns (1:N)
└── cf_session_history (1:N)
```
