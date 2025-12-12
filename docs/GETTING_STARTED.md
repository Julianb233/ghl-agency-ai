# GHL Agency AI - Getting Started Guide

## Quick Start

Get GHL Agency AI running in 5 minutes.

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Redis instance
- Browserbase account
- Anthropic API key

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ghl-agency-ai.git
cd ghl-agency-ai
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure required variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
SESSION_SECRET=your-secure-secret-key
COOKIE_DOMAIN=localhost

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Browser Automation
BROWSERBASE_API_KEY=bb_...
BROWSERBASE_PROJECT_ID=proj_...

# Optional: Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Database Setup

```bash
# Push schema to database
npx drizzle-kit push

# Or run migrations
npx drizzle-kit migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

---

## Project Structure

```
ghl-agency-ai/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # React components
│       ├── hooks/          # Custom hooks
│       ├── stores/         # Zustand stores
│       └── pages/          # Page components
├── server/                 # Node.js backend
│   ├── api/
│   │   └── routers/        # tRPC routers
│   ├── services/           # Business logic
│   ├── workers/            # Background workers
│   └── _core/              # Infrastructure
├── drizzle/                # Database schema
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

---

## Key Features

### 1. AI Agent Execution

Execute tasks using natural language:

```typescript
// Via tRPC client
const result = await trpc.agent.execute.mutate({
  task: "Navigate to example.com and extract all product names"
});
```

### 2. Browser Automation

Create and control browser sessions:

```typescript
// Create session
const session = await trpc.browser.createSession.mutate({
  url: "https://example.com"
});

// Execute action
await trpc.browser.act.mutate({
  sessionId: session.sessionId,
  action: "Click the login button"
});

// Extract data
const data = await trpc.browser.extract.mutate({
  sessionId: session.sessionId,
  instruction: "Get all prices on the page"
});
```

### 3. Webhook Integration

Set up webhooks for SMS/Email automation:

```typescript
// Create webhook
const webhook = await trpc.webhooks.create.mutate({
  name: "Customer Support Bot",
  type: "sms",
  config: {
    systemPrompt: "You are a helpful customer support agent...",
    autoRespond: true
  }
});

// Webhook URL: POST /api/webhooks/{webhook.webhookToken}
```

### 4. Client Profiles

Manage client context for personalized automation:

```typescript
// Create client profile
const client = await trpc.clientProfiles.create.mutate({
  name: "Acme Corp",
  brandVoice: "Professional, friendly, innovative",
  industry: "Technology",
  targetAudience: "B2B enterprise customers"
});

// Use client context in agent tasks
await trpc.agent.execute.mutate({
  task: "Write a blog post about AI trends",
  clientId: client.id
});
```

### 5. Scheduled Tasks

Set up recurring automations:

```typescript
// Create scheduled task
await trpc.scheduledTasks.create.mutate({
  name: "Daily Price Check",
  cronExpression: "0 9 * * *", // 9 AM daily
  taskType: "data_extraction",
  config: {
    url: "https://competitor.com/pricing",
    steps: ["Extract all price points", "Compare with our prices"]
  }
});
```

---

## Authentication

### Session-Based (Frontend)

The frontend uses HttpOnly cookies for authentication:

```typescript
// Login
await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
  credentials: 'include'
});

// Authenticated requests automatically include cookie
await trpc.agent.execute.mutate({ task: "..." });
```

### API Key (External)

For external integrations, use API keys:

```typescript
// Create API key
const { key } = await trpc.apiKeys.create.mutate({
  name: "Production App"
});

// Use in requests
fetch('/api/trpc/agent.execute', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ task: "..." })
});
```

---

## Real-Time Updates

### SSE (Server-Sent Events)

Subscribe to agent execution updates:

```typescript
import { useAgentSSE } from '@/hooks/useAgentSSE';

function AgentMonitor({ executionId }) {
  useAgentSSE(executionId);

  const { thinkingSteps, currentExecution } = useAgentStore();

  return (
    <div>
      <p>Status: {currentExecution?.status}</p>
      {thinkingSteps.map(step => (
        <div key={step.id}>{step.content}</div>
      ))}
    </div>
  );
}
```

### WebSocket

For real-time browser session updates:

```typescript
const socket = io('ws://localhost:5000');

socket.on('session:update', (data) => {
  console.log('Session updated:', data);
});

socket.on('session:screenshot', (data) => {
  setScreenshot(data.image);
});
```

---

## Credit System

GHL Agency AI uses a credit system for resource consumption:

| Resource | Credit Cost |
|----------|-------------|
| Browser minute | 1 credit |
| AI tokens (1K) | 0.1 credits |
| API call | 0.01 credits |

Check balance:

```typescript
const balance = await trpc.credits.getBalance.query();
console.log(`Browser minutes: ${balance.browserMinutes}`);
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configure environment variables in Vercel dashboard.

### Docker

```bash
# Build image
docker build -t ghl-agency-ai .

# Run container
docker run -p 3000:3000 --env-file .env ghl-agency-ai
```

---

## Common Tasks

### Adding a New API Endpoint

1. Create router in `server/api/routers/`:

```typescript
// server/api/routers/myRouter.ts
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const myRouter = router({
  myEndpoint: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
      return { success: true };
    }),
});
```

2. Add to main router in `server/routers.ts`:

```typescript
import { myRouter } from './api/routers/myRouter';

export const appRouter = router({
  // ...existing routers
  my: myRouter,
});
```

### Adding a New Database Table

1. Define schema in `drizzle/`:

```typescript
// drizzle/schema-my-feature.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

2. Add to `drizzle.config.ts`:

```typescript
export default defineConfig({
  schema: [
    // ...existing schemas
    "./drizzle/schema-my-feature.ts",
  ],
  // ...
});
```

3. Generate and apply migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Creating a Background Worker

```typescript
// server/workers/myWorker.ts
import { Worker } from 'bullmq';
import { redis } from '../_core/redis';

export const myWorker = new Worker(
  'my-queue',
  async (job) => {
    const { data } = job;
    // Process job
    return { processed: true };
  },
  { connection: redis }
);

// Add job to queue
import { Queue } from 'bullmq';
const myQueue = new Queue('my-queue', { connection: redis });
await myQueue.add('my-job', { data: 'example' });
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
npx drizzle-kit push --verbose

# Check DATABASE_URL format
# postgresql://user:password@host:port/database?sslmode=require
```

### Browser Session Errors

1. Verify Browserbase credentials
2. Check concurrent session limits
3. Ensure sufficient credits

### Authentication Problems

1. Clear cookies and local storage
2. Verify SESSION_SECRET is set
3. Check COOKIE_DOMAIN matches your domain

---

## Next Steps

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Database Schema](./DATABASE_SCHEMA.md) - Database structure
- [RAG System](./RAG_SYSTEM.md) - Documentation retrieval setup
- [Webhook Integration](./WEBHOOK_INTEGRATION.md) - SMS/Email automation

---

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Full docs at `/docs`
- Community: Join our Discord server
