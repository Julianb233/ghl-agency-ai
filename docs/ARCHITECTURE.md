# GHL Agency AI - System Architecture

## Overview

GHL Agency AI is a white-label SaaS platform for browser automation and workflow orchestration using AI agents. It integrates with GoHighLevel (GHL) to automate client management, campaigns, workflows, and funnels through natural language commands.

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React 19 UI]
        WS[WebSocket Client]
        SSE[SSE Client]
    end

    subgraph "API Gateway"
        Express[Express Server]
        TRPC[tRPC Router]
        Auth[Auth Middleware]
    end

    subgraph "Core Services"
        Agent[Agent Orchestrator]
        Browser[Browser Service]
        Workflow[Workflow Engine]
        Email[Email Service]
        RAG[RAG Service]
    end

    subgraph "Integration Layer"
        GHL[GoHighLevel API]
        Browserbase[Browserbase SDK]
        Claude[Claude AI]
        Stripe[Stripe Payments]
        Twilio[Twilio SMS]
    end

    subgraph "Data Layer"
        Postgres[(PostgreSQL/Neon)]
        Redis[(Redis Cache)]
        S3[S3 Storage]
    end

    subgraph "Worker Layer"
        EmailWorker[Email Worker]
        WebhookWorker[Webhook Worker]
        EnrichmentWorker[Enrichment Worker]
        WorkflowWorker[Workflow Worker]
    end

    UI --> Express
    WS --> Express
    SSE --> Express
    Express --> Auth
    Auth --> TRPC
    TRPC --> Agent
    TRPC --> Browser
    TRPC --> Workflow
    TRPC --> Email
    TRPC --> RAG

    Agent --> Claude
    Agent --> Browserbase
    Browser --> Browserbase
    Email --> Twilio

    Agent --> Postgres
    Browser --> Postgres
    Workflow --> Postgres
    RAG --> Postgres

    Agent --> Redis
    Browser --> Redis

    EmailWorker --> Redis
    WebhookWorker --> Redis
    EnrichmentWorker --> Redis
    WorkflowWorker --> Redis
```

## Component Architecture

### Frontend Components

```mermaid
graph LR
    subgraph "Pages"
        Dashboard
        Settings
        Analytics
        Workflows
    end

    subgraph "Feature Components"
        AIBrowserPanel
        AIChatBox
        ExecutionMonitor
        ClientProfileModal
        EmailAgentPanel
    end

    subgraph "UI Components"
        shadcn[shadcn/ui]
        RadixUI[Radix UI]
        Tailwind[Tailwind CSS]
    end

    Dashboard --> AIBrowserPanel
    Dashboard --> AIChatBox
    Dashboard --> ExecutionMonitor
    Settings --> ClientProfileModal

    AIBrowserPanel --> shadcn
    AIChatBox --> shadcn
    ExecutionMonitor --> RadixUI
```

### Backend Services

```mermaid
graph TB
    subgraph "API Layer"
        TRPC[tRPC Router]
    end

    subgraph "Business Services"
        AgentService[Agent Orchestrator]
        CreditService[Credit Service]
        TaskService[Task Execution]
        WebhookService[Webhook Handler]
    end

    subgraph "Integration Services"
        BrowserService[Browser Service]
        EmailService[Email Service]
        RAGService[RAG Service]
        AdsService[Ads Service]
    end

    subgraph "Infrastructure Services"
        CacheService[Cache Service]
        StorageService[S3 Storage]
        CronService[Cron Scheduler]
    end

    TRPC --> AgentService
    TRPC --> CreditService
    TRPC --> TaskService
    TRPC --> WebhookService

    AgentService --> BrowserService
    AgentService --> RAGService
    TaskService --> BrowserService

    BrowserService --> CacheService
    EmailService --> StorageService
    CronService --> TaskService
```

## Data Flow Diagrams

### Agent Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant TRPC
    participant Agent
    participant Claude
    participant Browser
    participant DB

    User->>UI: Submit Task
    UI->>TRPC: executeTask()
    TRPC->>Agent: createExecution()
    Agent->>DB: Save Execution
    Agent->>Claude: Generate Plan
    Claude-->>Agent: Plan Response
    Agent->>DB: Update Plan

    loop Each Phase
        Agent->>Claude: Execute Phase
        Claude-->>Agent: Tool Calls
        Agent->>Browser: Execute Actions
        Browser-->>Agent: Results
        Agent->>DB: Update Progress
        Agent-->>UI: SSE Update
    end

    Agent->>DB: Mark Complete
    Agent-->>UI: Completion Event
    UI-->>User: Show Results
```

### Webhook Processing Flow

```mermaid
sequenceDiagram
    participant External
    participant Webhook
    participant Queue
    participant Worker
    participant Bot
    participant DB

    External->>Webhook: POST /webhooks/:token
    Webhook->>DB: Validate Token
    Webhook->>DB: Log Inbound Message
    Webhook->>Queue: Enqueue Processing
    Webhook-->>External: 200 OK

    Worker->>Queue: Dequeue Message
    Worker->>Bot: Process with Context
    Bot->>DB: Get Conversation
    Bot->>Claude: Generate Response
    Claude-->>Bot: Response
    Bot->>DB: Save Outbound
    Bot->>External: Send Response
```

## Database Schema Overview

```mermaid
erDiagram
    users ||--o{ userProfiles : has
    users ||--o{ clientProfiles : owns
    users ||--o{ agentSessions : creates
    users ||--o{ userWebhooks : configures
    users ||--o{ user_credits : has

    agentSessions ||--o{ agentExecutions : contains
    agentExecutions ||--o{ toolExecutions : logs

    userWebhooks ||--o{ inboundMessages : receives
    userWebhooks ||--o{ botConversations : maintains
    botConversations ||--o{ outboundMessages : sends

    clientProfiles ||--o{ agencyTasks : assigns
    agencyTasks ||--o{ taskExecutions : tracks

    users {
        int id PK
        string username
        string password
        string email
        string role
        boolean isOnboarded
        timestamp createdAt
    }

    agentSessions {
        int id PK
        int userId FK
        uuid sessionUuid
        string status
        jsonb context
        jsonb thinkingSteps
        timestamp createdAt
    }

    agentExecutions {
        int id PK
        int sessionId FK
        text taskDescription
        string status
        jsonb plan
        jsonb phases
        jsonb result
        int durationMs
    }

    userWebhooks {
        int id PK
        int userId FK
        string name
        string type
        string webhookToken
        boolean isActive
        jsonb config
    }
```

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Tailwind CSS 4 | Styling |
| shadcn/ui | Component Library |
| Radix UI | Accessible Primitives |
| tRPC Client | Type-safe API |
| Wouter | Routing |
| Zustand | State Management |
| Socket.io | Real-time Communication |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Express 4 | HTTP Server |
| tRPC 11 | API Framework |
| Drizzle ORM | Database ORM |
| BullMQ | Job Queues |
| Redis | Caching & Queues |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary Database |
| Neon | Serverless Postgres |
| Redis | Cache & Sessions |

### AI & Automation
| Technology | Purpose |
|------------|---------|
| Claude AI | LLM Provider |
| Browserbase | Browser Automation |
| Stagehand | AI Actions |
| OpenAI | Embeddings |

### Integrations
| Service | Purpose |
|---------|---------|
| GoHighLevel | CRM Platform |
| Stripe | Payments |
| Twilio | SMS |
| Google OAuth | Authentication |
| S3 | File Storage |

## Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel Edge"
        Frontend[React App]
        API[API Functions]
    end

    subgraph "External Services"
        Neon[(Neon PostgreSQL)]
        Redis[(Redis Cloud)]
        Browserbase[Browserbase]
        Claude[Anthropic API]
    end

    subgraph "CDN & Storage"
        Vercel_CDN[Vercel CDN]
        S3[AWS S3]
    end

    Users -->|HTTPS| Vercel_CDN
    Vercel_CDN --> Frontend
    Frontend --> API
    API --> Neon
    API --> Redis
    API --> Browserbase
    API --> Claude
    API --> S3
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth
    participant DB
    participant Session

    User->>Frontend: Login Request
    Frontend->>Auth: POST /auth/login
    Auth->>DB: Validate Credentials
    DB-->>Auth: User Data
    Auth->>Session: Create Session
    Session-->>Auth: Session Token
    Auth-->>Frontend: Set HttpOnly Cookie
    Frontend-->>User: Redirect to Dashboard
```

### API Security Layers

1. **Authentication**: JWT tokens in HttpOnly cookies
2. **Authorization**: Role-based access control (user, admin, superadmin)
3. **Rate Limiting**: Per-user API rate limits
4. **Input Validation**: Zod schema validation on all inputs
5. **CORS**: Strict origin validation
6. **API Keys**: Optional API key authentication for external access

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Redis for session storage
- PostgreSQL connection pooling via Neon

### Performance Optimizations
- Redis caching for frequent queries
- Connection pooling
- Lazy loading of heavy components
- CDN for static assets

### Rate Limiting
| Resource | Limit |
|----------|-------|
| API Requests | 100/min per user |
| Browser Sessions | 3 concurrent per user |
| Webhook Calls | 1000/hour per webhook |
| AI Requests | Based on credit balance |

## Monitoring & Observability

### Metrics Collected
- API response times
- Browser session durations
- Task execution metrics
- Error rates and types
- Credit usage patterns

### Alerting
- Failed task thresholds
- Error rate spikes
- Credit depletion warnings
- Session timeout alerts

## Future Architecture Considerations

1. **Multi-Region Deployment**: Geographic distribution for latency
2. **Event Sourcing**: Full audit trail of all state changes
3. **GraphQL Gateway**: Alternative API access pattern
4. **Kubernetes**: Container orchestration for workers
5. **Message Streaming**: Kafka/Pulsar for high-volume events
