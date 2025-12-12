# GHL Agency AI - Documentation Index

## Overview

GHL Agency AI is a white-label SaaS platform for browser automation and workflow orchestration using AI agents. It integrates with GoHighLevel (GHL) to automate client management, campaigns, workflows, and funnels through natural language commands.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](./GETTING_STARTED.md) | Quick start guide and setup instructions |
| [Architecture](./ARCHITECTURE.md) | System architecture and diagrams |
| [API Reference](./API_REFERENCE.md) | Complete API documentation |
| [Database Schema](./DATABASE_SCHEMA.md) | Database tables and relationships |

---

## Core Documentation

### Setup & Configuration

- **[Getting Started](./GETTING_STARTED.md)** - Installation, configuration, and first steps
- **[Deployment](../DEPLOYMENT.md)** - Production deployment guide
- **[Deployment Architecture](../DEPLOYMENT_ARCHITECTURE.md)** - Infrastructure overview
- **[Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification

### Technical Reference

- **[Architecture](./ARCHITECTURE.md)** - System architecture with diagrams
- **[API Reference](./API_REFERENCE.md)** - tRPC endpoints and usage
- **[Database Schema](./DATABASE_SCHEMA.md)** - PostgreSQL schema documentation
- **[Authentication Architecture](./Authentication-Architecture.md)** - Auth flow details

### Feature Documentation

- **[RAG System](./RAG_SYSTEM.md)** - Documentation retrieval and search
- **[RAG Quickstart](./RAG_QUICKSTART.md)** - Quick setup for RAG
- **[Credit System](./CREDIT_SYSTEM_IMPLEMENTATION.md)** - Credit-based billing
- **[SEO Module](./SEO_MODULE.md)** - SEO optimization features
- **[Meta Ads Integration](./META_ADS_INTEGRATION.md)** - Facebook/Meta ads
- **[Email Integration](../EMAIL_INTEGRATION_README.md)** - Email automation

### Browser Automation

- **[Browserbase Integration](./BROWSERBASE_INTEGRATION.md)** - Browser automation setup
- **[Stagehand Examples](./STAGEHAND_EXAMPLES.md)** - AI action examples
- **[Stagehand Prompting](./STAGEHAND_PROMPTING.md)** - Best practices for prompts
- **[Stagehand V3 Features](./STAGEHAND_V3_FEATURES.md)** - Latest features

### Caching & Performance

- **[Redis Cache](./REDIS_CACHE_IMPLEMENTATION.md)** - Cache implementation
- **[Cache Quick Reference](./CACHE_QUICK_REFERENCE.md)** - Cache usage guide

### Agent & Swarm Systems

- **[Agent SSE Integration](./agent-sse-integration.md)** - Real-time agent updates
- **[Agent SSE Flow](./agent-sse-flow.md)** - SSE event flow
- **[Swarm Coordinator](../server/services/swarm/README.md)** - Multi-agent coordination
- **[Swarm Quick Start](../server/services/swarm/QUICK_START.md)** - Swarm setup

---

## API Routers

| Router | Path | Description |
|--------|------|-------------|
| `agent` | `/api/trpc/agent.*` | AI agent execution |
| `browser` | `/api/trpc/browser.*` | Browser automation |
| `workflows` | `/api/trpc/workflows.*` | Workflow management |
| `webhooks` | `/api/trpc/webhooks.*` | Webhook configuration |
| `agencyTasks` | `/api/trpc/agencyTasks.*` | Task board |
| `clientProfiles` | `/api/trpc/clientProfiles.*` | Client management |
| `credits` | `/api/trpc/credits.*` | Credit system |
| `rag` | `/api/trpc/rag.*` | Documentation retrieval |
| `scheduledTasks` | `/api/trpc/scheduledTasks.*` | Cron jobs |
| `swarm` | `/api/trpc/swarm.*` | Multi-agent swarms |
| `settings` | `/api/trpc/settings.*` | User settings |
| `apiKeys` | `/api/trpc/apiKeys.*` | API key management |

---

## Database Schemas

| Schema File | Tables | Purpose |
|-------------|--------|---------|
| `schema.ts` | users, sessions, profiles | Core user data |
| `schema-agent.ts` | agentSessions, agentExecutions | AI agent tracking |
| `schema-webhooks.ts` | userWebhooks, messages | Webhook system |
| `schema-scheduled-tasks.ts` | scheduledTasks | Cron scheduling |
| `schema-lead-enrichment.ts` | leads, credits | Lead management |
| `schema-rag.ts` | documentationSources | Knowledge base |
| `0006_claude_flow_schemas.sql` | cf_* tables | Swarm coordination |

---

## Services

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| Agent Orchestrator | `agentOrchestrator.service.ts` | Task execution |
| Credit Service | `credit.service.ts` | Billing management |
| Message Processing | `messageProcessing.service.ts` | Webhook handling |
| Task Execution | `taskExecution.service.ts` | Task runner |

### Integration Services

| Service | File | Purpose |
|---------|------|---------|
| Email Service | `email.service.ts` | Email sending |
| RAG Service | `rag.service.ts` | Document retrieval |
| Ads Service | `ads.service.ts` | Ad management |
| Browser Service | `browser.service.ts` | Automation |

### Infrastructure Services

| Service | File | Purpose |
|---------|------|---------|
| Cache Service | `cache.service.ts` | Redis caching |
| Cron Scheduler | `cronScheduler.service.ts` | Job scheduling |
| S3 Storage | `s3-storage.service.ts` | File storage |

---

## Workers

| Worker | Queue | Purpose |
|--------|-------|---------|
| Email Worker | `email-queue` | Email delivery |
| Webhook Worker | `webhook-retry` | Failed webhooks |
| Enrichment Worker | `enrichment-queue` | Lead enrichment |
| Workflow Worker | `workflow-queue` | Workflow execution |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Session encryption key |
| `ANTHROPIC_API_KEY` | Claude AI API key |
| `BROWSERBASE_API_KEY` | Browser automation key |
| `BROWSERBASE_PROJECT_ID` | Browserbase project |

### Optional

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI for embeddings |
| `STRIPE_SECRET_KEY` | Payment processing |
| `TWILIO_ACCOUNT_SID` | SMS integration |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `S3_BUCKET` | File storage |

---

## Technology Stack

### Frontend
- React 19
- Tailwind CSS 4
- shadcn/ui + Radix UI
- tRPC Client
- Zustand
- Socket.io

### Backend
- Node.js 20
- Express 4
- tRPC 11
- Drizzle ORM
- BullMQ
- Redis

### AI & Automation
- Claude AI (Anthropic)
- Browserbase + Stagehand
- OpenAI Embeddings

### Database
- PostgreSQL (Neon)
- Redis

---

## Development

### Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Generate database migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Type check
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
ghl-agency-ai/
├── client/              # React frontend
├── server/              # Node.js backend
├── drizzle/             # Database schema
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── tests/               # Test files
└── package.json
```

---

## Support & Resources

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community support
- **Email**: support@example.com

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License - See [LICENSE](../LICENSE) for details.
