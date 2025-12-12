# GHL Agency AI - API Reference

## Overview

GHL Agency AI uses tRPC for type-safe API communication. All endpoints are accessible via the `/api/trpc` base path.

## Authentication

All API endpoints require authentication via one of:
- **Session Cookie**: HttpOnly cookie set after login
- **API Key**: `Authorization: Bearer <api_key>` header

## API Routers

### Agent Router (`agent`)

Autonomous AI agent execution and management.

#### `agent.createSession`
Create a new agent session for task execution.

```typescript
// Input
{
  // No input required
}

// Output
{
  sessionId: number;
  sessionUuid: string;
  status: "idle" | "planning" | "executing" | "complete" | "error" | "paused";
}
```

#### `agent.execute`
Execute a task with the AI agent.

```typescript
// Input
{
  task: string;          // Task description
  sessionId?: number;    // Optional existing session
  clientId?: number;     // Optional client context
}

// Output
{
  executionId: number;
  status: string;
  plan?: {
    goal: string;
    phases: Phase[];
  };
}
```

#### `agent.getExecution`
Get execution details and progress.

```typescript
// Input
{
  executionId: number;
}

// Output
{
  id: number;
  taskDescription: string;
  status: string;
  plan: object;
  phases: Phase[];
  thinkingSteps: ThinkingStep[];
  result?: object;
  error?: string;
}
```

---

### Browser Router (`browser`)

Browser automation session management.

#### `browser.createSession`
Create a new browser automation session.

```typescript
// Input
{
  clientId?: number;     // Optional client context
  url?: string;          // Starting URL
}

// Output
{
  sessionId: string;
  liveUrl: string;       // Live view URL
  connectUrl: string;    // WebSocket URL
}
```

#### `browser.act`
Execute an action in the browser.

```typescript
// Input
{
  sessionId: string;
  action: string;        // Natural language action
  screenshot?: boolean;  // Capture screenshot after
}

// Output
{
  success: boolean;
  result?: string;
  screenshot?: string;   // Base64 image
}
```

#### `browser.extract`
Extract data from the current page.

```typescript
// Input
{
  sessionId: string;
  instruction: string;   // What to extract
  schema?: object;       // Expected output schema
}

// Output
{
  success: boolean;
  data: object;
}
```

#### `browser.closeSession`
Close a browser session.

```typescript
// Input
{
  sessionId: string;
}

// Output
{
  success: boolean;
}
```

---

### Workflows Router (`workflows`)

Workflow creation and execution.

#### `workflows.create`
Create a new workflow.

```typescript
// Input
{
  name: string;
  description?: string;
  steps: WorkflowStep[];
  clientId?: number;
}

// Output
{
  id: number;
  name: string;
  steps: WorkflowStep[];
}
```

#### `workflows.execute`
Execute a workflow.

```typescript
// Input
{
  workflowId: number;
  variables?: Record<string, any>;
}

// Output
{
  executionId: number;
  status: string;
}
```

#### `workflows.list`
List all workflows.

```typescript
// Input
{
  page?: number;
  limit?: number;
}

// Output
{
  workflows: Workflow[];
  total: number;
}
```

---

### Agency Tasks Router (`agencyTasks`)

Task board for agency management.

#### `agencyTasks.create`
Create a new agency task.

```typescript
// Input
{
  title: string;
  description?: string;
  status?: "backlog" | "todo" | "in_progress" | "review" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  clientId?: number;
  assignedTo?: number;
  dueDate?: Date;
  tags?: string[];
}

// Output
{
  id: number;
  title: string;
  status: string;
  priority: string;
}
```

#### `agencyTasks.list`
List tasks with filtering.

```typescript
// Input
{
  status?: string;
  clientId?: number;
  page?: number;
  limit?: number;
}

// Output
{
  tasks: AgencyTask[];
  total: number;
}
```

#### `agencyTasks.update`
Update a task.

```typescript
// Input
{
  id: number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
}

// Output
{
  success: boolean;
  task: AgencyTask;
}
```

---

### Webhooks Router (`webhooks`)

Webhook configuration and management.

#### `webhooks.create`
Create a new webhook endpoint.

```typescript
// Input
{
  name: string;
  type: "sms" | "email" | "custom";
  config: {
    systemPrompt?: string;
    autoRespond?: boolean;
    responseDelay?: number;
  };
}

// Output
{
  id: number;
  webhookToken: string;
  webhookUrl: string;
}
```

#### `webhooks.list`
List all webhooks.

```typescript
// Output
{
  webhooks: UserWebhook[];
}
```

#### `webhooks.getMessages`
Get messages for a webhook.

```typescript
// Input
{
  webhookId: number;
  page?: number;
  limit?: number;
}

// Output
{
  messages: InboundMessage[];
  total: number;
}
```

---

### Client Profiles Router (`clientProfiles`)

Client management and context.

#### `clientProfiles.create`
Create a new client profile.

```typescript
// Input
{
  name: string;
  brandVoice?: string;
  targetAudience?: string;
  industry?: string;
  website?: string;
  socialLinks?: object;
  seoConfig?: object;
}

// Output
{
  id: number;
  name: string;
}
```

#### `clientProfiles.list`
List all client profiles.

```typescript
// Output
{
  clients: ClientProfile[];
}
```

#### `clientProfiles.get`
Get a specific client profile.

```typescript
// Input
{
  id: number;
}

// Output
{
  client: ClientProfile;
}
```

---

### Credits Router (`credits`)

Credit system management.

#### `credits.getBalance`
Get current credit balance.

```typescript
// Output
{
  browserMinutes: number;
  aiTokens: number;
  apiCalls: number;
}
```

#### `credits.getTransactions`
Get credit transaction history.

```typescript
// Input
{
  page?: number;
  limit?: number;
  type?: string;
}

// Output
{
  transactions: CreditTransaction[];
  total: number;
}
```

---

### RAG Router (`rag`)

Documentation and knowledge retrieval.

#### `rag.addSource`
Add a documentation source.

```typescript
// Input
{
  name: string;
  url?: string;
  content?: string;
  type: "url" | "file" | "text";
}

// Output
{
  id: number;
  chunksCreated: number;
}
```

#### `rag.search`
Search documentation.

```typescript
// Input
{
  query: string;
  limit?: number;
}

// Output
{
  results: {
    content: string;
    source: string;
    relevance: number;
  }[];
}
```

---

### Scheduled Tasks Router (`scheduledTasks`)

Cron-based task scheduling.

#### `scheduledTasks.create`
Create a scheduled browser task.

```typescript
// Input
{
  name: string;
  description?: string;
  cronExpression: string;
  taskType: "browser_automation" | "data_extraction" | "monitoring";
  config: {
    url?: string;
    steps?: string[];
  };
  clientId?: number;
}

// Output
{
  id: number;
  nextRunAt: Date;
}
```

#### `scheduledTasks.list`
List scheduled tasks.

```typescript
// Output
{
  tasks: ScheduledTask[];
}
```

---

### Settings Router (`settings`)

User settings and preferences.

#### `settings.get`
Get user settings.

```typescript
// Output
{
  theme: string;
  notifications: object;
  integrations: object;
}
```

#### `settings.update`
Update user settings.

```typescript
// Input
{
  theme?: string;
  notifications?: object;
}

// Output
{
  success: boolean;
}
```

---

### API Keys Router (`apiKeys`)

API key management.

#### `apiKeys.create`
Create a new API key.

```typescript
// Input
{
  name: string;
  permissions?: string[];
  expiresAt?: Date;
}

// Output
{
  id: number;
  key: string;        // Only shown once
  prefix: string;
}
```

#### `apiKeys.list`
List API keys.

```typescript
// Output
{
  keys: {
    id: number;
    name: string;
    prefix: string;
    lastUsedAt?: Date;
    expiresAt?: Date;
  }[];
}
```

#### `apiKeys.revoke`
Revoke an API key.

```typescript
// Input
{
  id: number;
}

// Output
{
  success: boolean;
}
```

---

### Swarm Router (`swarm`)

Multi-agent swarm coordination.

#### `swarm.initialize`
Initialize the swarm coordinator.

```typescript
// Output
{
  success: boolean;
  message: string;
}
```

#### `swarm.create`
Create a new swarm.

```typescript
// Input
{
  objective: string;
  strategy?: "development" | "research" | "testing" | "deployment";
  maxAgents?: number;
  agentTypes?: string[];
}

// Output
{
  swarmId: string;
  status: string;
}
```

#### `swarm.executeQuick`
Create and immediately start a swarm.

```typescript
// Input
{
  objective: string;
  strategy?: string;
  maxAgents?: number;
}

// Output
{
  swarmId: string;
  status: string;
}
```

#### `swarm.getStatus`
Get swarm status and progress.

```typescript
// Input
{
  swarmId: string;
}

// Output
{
  swarm: {
    id: string;
    status: string;
    progress: {
      percentComplete: number;
      tasksCompleted: number;
      tasksPending: number;
    };
    agents: Agent[];
  };
}
```

#### `swarm.getHealth`
Get swarm system health.

```typescript
// Output
{
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    agents: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
    tasks: {
      pending: number;
      active: number;
      completed: number;
    };
  };
}
```

---

## Webhook Endpoints

### Inbound Webhook
Receive external messages (SMS, Email, Custom).

```
POST /api/webhooks/:webhookToken
Content-Type: application/json

{
  "from": "+1234567890",
  "body": "Message content",
  "type": "sms"
}
```

### Response
```json
{
  "success": true,
  "messageId": "msg_123"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| General API | 100 req/min |
| Browser Sessions | 10 req/min |
| AI Execution | 20 req/min |
| Webhooks | 1000 req/hour |

---

## SDKs and Client Libraries

### TypeScript/JavaScript

```typescript
import { createTRPCClient } from '@trpc/client';
import type { AppRouter } from './server/routers';

const client = createTRPCClient<AppRouter>({
  url: 'https://your-domain.com/api/trpc',
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

// Execute an agent task
const result = await client.agent.execute.mutate({
  task: 'Create a landing page for my client',
});
```

### cURL Examples

```bash
# Create an agent session
curl -X POST https://your-domain.com/api/trpc/agent.createSession \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Execute a task
curl -X POST https://your-domain.com/api/trpc/agent.execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task": "Navigate to google.com and search for AI"}'
```
