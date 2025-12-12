# Manus Platform Replica - Complete System Architecture

## Executive Summary

This document outlines the complete architecture for building a white-label Manus platform replica integrated into the GHL Agency AI system. The platform will provide agency clients with full AI agent capabilities, including code generation, website building, visual editing, and deployment - essentially giving each client their own Manus instance.

---

## System Overview

### Core Capabilities

The platform replicates all major Manus features:

1. **Agent Orchestration** - Multi-phase task planning and execution
2. **Tool Framework** - 15+ tools for code, browser, files, search, database
3. **Webdev System** - Full-stack website builder with React + TypeScript
4. **Visual Editor** - Click-to-edit interface for generated websites
5. **Sandbox Environment** - Isolated code execution with Docker
6. **Deployment System** - Instant publishing to production
7. **Knowledge Training** - Learn from user feedback and corrections
8. **MCP Integrations** - Connect to external services
9. **Real-time Updates** - WebSocket-based progress visualization

### Use Case: Meeting-to-Proposal Workflow

```
User Input: "Create a proposal website from my meeting notes with ABC Company"
    ↓
Agent Planning: Break down into phases (content generation, design, deployment)
    ↓
Phase 1: AI generates proposal content from meeting notes
    ↓
Phase 2: Create React website with professional design
    ↓
Phase 3: Deploy to custom URL (abc-proposal.clientdomain.com)
    ↓
Output: Live website + shareable link + visual editor access
```

---

## Architecture Layers

### Layer 1: Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Vercel (Hosting) │ Neon (Database) │ S3 (Storage)          │
│  Redis (Cache)    │ Docker (Sandbox) │ Cloudflare (CDN/DNS) │
└─────────────────────────────────────────────────────────────┘
```

### Layer 2: Core Services

```
┌─────────────────────────────────────────────────────────────┐
│                      Core Services Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Agent Orchestrator │ Tool Registry │ Sandbox Manager       │
│  Project Manager    │ Deploy Service │ Knowledge Base       │
│  WebSocket Server   │ Auth Service   │ MCP Connector        │
└─────────────────────────────────────────────────────────────┘
```

### Layer 3: Tool Framework

```
┌─────────────────────────────────────────────────────────────┐
│                      Tool Framework Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Shell Tool    │ File Tool     │ Browser Tool               │
│  Search Tool   │ Database Tool │ Match Tool                 │
│  Generate Tool │ Map Tool      │ Schedule Tool              │
│  Webdev Tools  │ Slides Tool   │ Expose Tool                │
└─────────────────────────────────────────────────────────────┘
```

### Layer 4: Application

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Agent Dashboard │ Visual Editor │ Project Manager          │
│  Code Editor     │ Preview Panel │ Knowledge Base UI        │
│  Settings        │ Analytics     │ Deployment Manager       │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Users (existing GHL Agency AI table)
users
  - id (PK)
  - email
  - tier (starter, growth, professional, enterprise)
  - concurrent_agents_limit
  - created_at

-- Agent Executions
agent_executions
  - id (PK)
  - user_id (FK)
  - task_description TEXT
  - status (planning, executing, complete, error)
  - plan JSONB
  - thinking_steps JSONB[]
  - iterations INT
  - started_at TIMESTAMP
  - completed_at TIMESTAMP

-- Webdev Projects
webdev_projects
  - id (PK)
  - user_id (FK)
  - name VARCHAR(255)
  - description TEXT
  - tech_stack VARCHAR(50) (react, vue, static)
  - features JSONB (server, db, user, stripe)
  - status (active, archived)
  - created_at TIMESTAMP
  - updated_at TIMESTAMP

-- Project Versions (Checkpoints)
project_versions
  - id (PK)
  - project_id (FK)
  - version_number INT
  - description TEXT
  - files_snapshot JSONB
  - created_at TIMESTAMP

-- Deployments
deployments
  - id (PK)
  - project_id (FK)
  - version_id (FK)
  - url VARCHAR(500)
  - custom_domain VARCHAR(255)
  - status (deploying, live, failed)
  - deployed_at TIMESTAMP

-- Knowledge Base
knowledge_entries
  - id (PK)
  - user_id (FK)
  - category (workflow, brand_voice, preference, process)
  - context TEXT
  - content TEXT
  - embedding VECTOR(1536)
  - created_at TIMESTAMP

-- Tool Executions (for analytics)
tool_executions
  - id (PK)
  - execution_id (FK)
  - tool_name VARCHAR(100)
  - parameters JSONB
  - result JSONB
  - duration_ms INT
  - success BOOLEAN
  - executed_at TIMESTAMP
```

---

## Agent Orchestration System

### Agent Loop Architecture

```typescript
interface AgentLoop {
  // 1. Planning Phase
  createPlan(task: Task): Promise<Plan>;
  
  // 2. Execution Phase
  executePhases(plan: Plan): Promise<void>;
  
  // 3. Phase Execution
  executePhase(phase: Phase): Promise<void> {
    while (!phase.complete) {
      // Think
      const thought = await this.think(phase);
      
      // Select Tool
      const tool = await this.selectTool(thought);
      
      // Execute Tool
      const result = await this.executeTool(tool);
      
      // Observe
      await this.observe(result);
      
      // Decide
      const decision = await this.decide(result);
      
      if (decision === 'complete') break;
      if (decision === 'ask_user') await this.askUser();
    }
  }
}
```

### Tool Selection Logic

```typescript
interface ToolSelector {
  selectTool(context: ExecutionContext): Tool {
    // Analyze current phase capabilities
    const capabilities = context.phase.capabilities;
    
    // Match to available tools
    if (capabilities.includes('web_development')) {
      return new WebdevTool();
    }
    if (capabilities.includes('browser')) {
      return new BrowserTool();
    }
    if (capabilities.includes('file_operations')) {
      return new FileTool();
    }
    
    // Default to thinking/planning
    return new MessageTool();
  }
}
```

---

## Webdev System Architecture

### Project Initialization Flow

```
User Request: "Create a proposal website"
    ↓
1. Create Project Record in Database
    ↓
2. Initialize Git Repository
    ↓
3. Scaffold Project Structure
   - package.json
   - tsconfig.json
   - vite.config.ts
   - tailwind.config.js
   - src/
     ├── App.tsx
     ├── main.tsx
     ├── pages/
     └── components/
    ↓
4. Install Dependencies (pnpm install)
    ↓
5. Start Dev Server (port allocation)
    ↓
6. Create Initial Checkpoint (version 1)
    ↓
7. Return Project Info to User
```

### File Management System

```typescript
interface FileManager {
  // Read operations
  readFile(path: string): Promise<string>;
  listFiles(directory: string): Promise<string[]>;
  
  // Write operations
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  editFile(path: string, edits: Edit[]): Promise<void>;
  
  // Directory operations
  createDirectory(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(from: string, to: string): Promise<void>;
}
```

### Dev Server Management

```typescript
interface DevServerManager {
  // Start dev server for project
  startServer(projectId: string): Promise<ServerInfo>;
  
  // Stop dev server
  stopServer(projectId: string): Promise<void>;
  
  // Get server status
  getStatus(projectId: string): Promise<ServerStatus>;
  
  // Restart server (after dependency changes)
  restartServer(projectId: string): Promise<void>;
  
  // Allocate unique port
  allocatePort(): Promise<number>;
}

interface ServerInfo {
  port: number;
  url: string; // https://3000-{hash}.manusvm.computer
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid: number;
}
```

---

## Visual Editor System

### Editor Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Visual Editor UI                     │
├────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Toolbar    │  │   Preview    │  │  Properties  │ │
│  │              │  │              │  │              │ │
│  │ - Undo/Redo  │  │  Live iframe │  │ - Text       │ │
│  │ - Save       │  │  with click  │  │ - Colors     │ │
│  │ - Deploy     │  │  detection   │  │ - Layout     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Element Selection & Editing

```typescript
interface VisualEditor {
  // Element selection
  selectElement(x: number, y: number): HTMLElement;
  
  // Property editing
  updateText(element: HTMLElement, text: string): void;
  updateStyle(element: HTMLElement, styles: CSSProperties): void;
  updateLayout(element: HTMLElement, layout: LayoutProps): void;
  
  // Component operations
  addComponent(type: string, parent: HTMLElement): void;
  deleteComponent(element: HTMLElement): void;
  duplicateComponent(element: HTMLElement): void;
  
  // Save changes
  saveChanges(): Promise<void>;
  
  // Undo/Redo
  undo(): void;
  redo(): void;
}
```

### Live Preview System

```typescript
interface LivePreview {
  // Iframe management
  loadProject(projectId: string): Promise<void>;
  reloadPreview(): Promise<void>;
  
  // Click detection
  enableClickDetection(): void;
  disableClickDetection(): void;
  
  // Sync with code
  syncFromCode(): Promise<void>;
  syncToCode(): Promise<void>;
  
  // Responsive preview
  setViewport(device: 'mobile' | 'tablet' | 'desktop'): void;
}
```

---

## Deployment System

### Deployment Flow

```
User Clicks "Publish"
    ↓
1. Create Checkpoint (if not exists)
    ↓
2. Build Project
   - Run `pnpm build`
   - Generate static files
   - Optimize assets
    ↓
3. Upload to S3/Vercel
   - Deploy static files
   - Configure routing
   - Enable SSL
    ↓
4. Configure DNS
   - Create subdomain
   - Point to deployment
   - Enable CDN
    ↓
5. Update Database
   - Store deployment URL
   - Update project status
   - Log deployment time
    ↓
6. Notify User
   - Send deployment success
   - Provide live URL
   - Show analytics link
```

### Hosting Options

**Option 1: Vercel (Recommended)**
- Automatic SSL
- Global CDN
- Instant rollbacks
- Custom domains
- Cost: $20/month (Pro) + $0.40/GB bandwidth

**Option 2: S3 + CloudFront**
- Full control
- Lower cost at scale
- Custom configuration
- Cost: $0.023/GB storage + $0.085/GB transfer

**Option 3: Cloudflare Pages**
- Unlimited bandwidth
- Fast global network
- Free SSL
- Cost: Free for unlimited sites

---

## Tool Framework Implementation

### Core Tools

#### 1. Shell Tool
```typescript
interface ShellTool {
  exec(command: string, timeout?: number): Promise<ShellResult>;
  wait(sessionId: string): Promise<void>;
  send(sessionId: string, input: string): Promise<void>;
  kill(sessionId: string): Promise<void>;
  view(sessionId: string): Promise<string>;
}
```

#### 2. File Tool
```typescript
interface FileTool {
  read(path: string, range?: [number, number]): Promise<string>;
  write(path: string, content: string): Promise<void>;
  append(path: string, content: string): Promise<void>;
  edit(path: string, edits: Edit[]): Promise<void>;
  view(path: string): Promise<ImageData | PDFData>;
}
```

#### 3. Browser Tool
```typescript
interface BrowserTool {
  navigate(url: string, intent: Intent): Promise<PageContent>;
  click(index: number): Promise<void>;
  input(index: number, text: string, pressEnter: boolean): Promise<void>;
  scroll(direction: Direction, toEnd?: boolean): Promise<void>;
  saveImage(x: number, y: number, savePath: string): Promise<string>;
  uploadFile(index: number, filePath: string): Promise<void>;
  executeJS(script: string): Promise<any>;
}
```

#### 4. Search Tool
```typescript
interface SearchTool {
  search(queries: string[], type: SearchType): Promise<SearchResult[]>;
}

type SearchType = 'info' | 'image' | 'api' | 'news' | 'tool' | 'data' | 'research';
```

#### 5. Database Tool
```typescript
interface DatabaseTool {
  query(sql: string): Promise<QueryResult>;
  insert(table: string, data: Record<string, any>): Promise<void>;
  update(table: string, id: number, data: Record<string, any>): Promise<void>;
  delete(table: string, id: number): Promise<void>;
}
```

#### 6. Webdev Tool
```typescript
interface WebdevTool {
  initProject(name: string, template: string): Promise<Project>;
  checkStatus(projectId: string): Promise<ProjectStatus>;
  saveCheckpoint(projectId: string, description: string): Promise<Checkpoint>;
  rollbackCheckpoint(projectId: string, versionId: string): Promise<void>;
  restartServer(projectId: string): Promise<void>;
  addFeature(projectId: string, feature: Feature): Promise<void>;
}
```

---

## Knowledge Training System

### Learning Architecture

```
User Provides Feedback
    ↓
1. Capture Context
   - What task was being performed
   - What the agent did
   - What the user expected
    ↓
2. Generate Correction
   - User explains correct approach
   - Agent understands the pattern
    ↓
3. Vectorize Knowledge
   - Convert to embeddings
   - Store in vector database
    ↓
4. Index for Retrieval
   - Create searchable index
   - Link to similar contexts
    ↓
5. Apply in Future Tasks
   - Retrieve relevant knowledge
   - Adjust behavior accordingly
```

### Knowledge Categories

```typescript
enum KnowledgeCategory {
  WORKFLOW = 'workflow',         // How to do specific tasks
  BRAND_VOICE = 'brand_voice',   // Writing style and tone
  PREFERENCE = 'preference',      // User preferences
  PROCESS = 'process',           // Business processes
  TECHNICAL = 'technical',       // Technical patterns
}

interface KnowledgeEntry {
  category: KnowledgeCategory;
  context: string;               // When to apply this
  content: string;               // What to do
  examples: string[];            // Example applications
  embedding: number[];           // Vector for similarity search
  confidence: number;            // How reliable is this
  usageCount: number;            // How often used
  successRate: number;           // How often successful
}
```

---

## Real-Time Communication

### WebSocket Architecture

```typescript
// Server-side
class AgentWebSocketServer {
  // Emit events to client
  emitThinking(executionId: string, thought: string): void;
  emitToolStart(executionId: string, tool: string): void;
  emitToolComplete(executionId: string, result: any): void;
  emitPhaseAdvance(executionId: string, phase: Phase): void;
  emitExecutionComplete(executionId: string): void;
  emitError(executionId: string, error: Error): void;
}

// Client-side
class AgentWebSocketClient {
  // Subscribe to execution updates
  subscribeToExecution(executionId: string): void;
  
  // Handle events
  onThinking(callback: (thought: string) => void): void;
  onToolStart(callback: (tool: string) => void): void;
  onToolComplete(callback: (result: any) => void): void;
  onPhaseAdvance(callback: (phase: Phase) => void): void;
  onComplete(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}
```

### Event Types

```typescript
type WebSocketEvent =
  | { type: 'execution:started'; data: { executionId: string } }
  | { type: 'phase:planning'; data: { executionId: string } }
  | { type: 'plan:created'; data: { executionId: string; plan: Plan } }
  | { type: 'phase:start'; data: { executionId: string; phase: Phase } }
  | { type: 'thinking'; data: { executionId: string; thought: string } }
  | { type: 'tool:start'; data: { executionId: string; tool: string } }
  | { type: 'tool:progress'; data: { executionId: string; progress: number } }
  | { type: 'tool:complete'; data: { executionId: string; result: any } }
  | { type: 'phase:complete'; data: { executionId: string; phase: Phase } }
  | { type: 'execution:complete'; data: { executionId: string } }
  | { type: 'execution:error'; data: { executionId: string; error: Error } };
```

---

## Security & Isolation

### Sandbox Security

```typescript
interface SandboxSecurity {
  // Resource limits
  cpuLimit: number;        // CPU cores
  memoryLimit: number;     // RAM in MB
  diskLimit: number;       // Disk space in MB
  networkLimit: number;    // Bandwidth in MB/s
  
  // Time limits
  executionTimeout: number; // Max execution time
  idleTimeout: number;      // Auto-cleanup after idle
  
  // Access controls
  allowedCommands: string[];
  blockedCommands: string[];
  allowedDomains: string[];
  blockedDomains: string[];
  
  // File system
  readOnlyPaths: string[];
  writablePaths: string[];
  maxFileSize: number;
}
```

### Multi-Tenancy Isolation

```typescript
interface TenantIsolation {
  // Separate resources per user
  getUserSandbox(userId: string): Sandbox;
  getUserDatabase(userId: string): DatabaseConnection;
  getUserStorage(userId: string): StorageBucket;
  
  // Resource quotas
  enforceQuotas(userId: string): void;
  checkQuota(userId: string, resource: Resource): boolean;
  
  // Data isolation
  ensureDataIsolation(userId: string, operation: Operation): void;
}
```

---

## Scalability & Performance

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
    │ API 1 │    │ API 2 │    │ API 3 │
    └───┬───┘    └───┬───┘    └───┬───┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
    │ DB 1  │    │ Cache │    │ Queue │
    └───────┘    └───────┘    └───────┘
```

### Caching Strategy

```typescript
interface CacheStrategy {
  // Cache layers
  L1: InMemoryCache;      // Process memory (fastest)
  L2: RedisCache;         // Shared cache (fast)
  L3: DatabaseCache;      // Persistent (slower)
  
  // Cache keys
  projectFiles: `project:${projectId}:files`;
  userKnowledge: `user:${userId}:knowledge`;
  toolResults: `tool:${toolName}:${hash(params)}`;
  
  // TTL strategy
  shortTTL: 60;          // 1 minute
  mediumTTL: 3600;       // 1 hour
  longTTL: 86400;        // 1 day
}
```

### Queue System

```typescript
interface QueueSystem {
  // Job queues
  agentExecutionQueue: Queue<AgentJob>;
  deploymentQueue: Queue<DeploymentJob>;
  knowledgeIndexQueue: Queue<IndexJob>;
  
  // Priority levels
  HIGH: 1;
  MEDIUM: 5;
  LOW: 10;
  
  // Concurrency limits
  maxConcurrentAgents: number;
  maxConcurrentDeployments: number;
  maxConcurrentIndexing: number;
}
```

---

## Cost Optimization

### Resource Management

```typescript
interface ResourceOptimization {
  // Sandbox pooling
  sandboxPool: SandboxPool;
  reuseIdleSandboxes(): void;
  preWarmSandboxes(count: number): void;
  
  // Database connection pooling
  dbPool: ConnectionPool;
  maxConnections: number;
  minConnections: number;
  
  // CDN caching
  cdnCache: CDNCache;
  cacheStatic: boolean;
  cacheDynamic: boolean;
  cacheTime: number;
  
  // Compression
  enableGzip: boolean;
  enableBrotli: boolean;
  minCompressionSize: number;
}
```

### Cost Per Operation

| Operation | Cost | Optimization |
|-----------|------|--------------|
| Agent execution | $0.01-0.10 | Cache tool results |
| Sandbox creation | $0.001 | Pool reuse |
| File storage | $0.023/GB | Compress assets |
| Bandwidth | $0.085/GB | CDN caching |
| Database query | $0.0001 | Connection pooling |
| Deployment | $0.05 | Batch deployments |

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Database schema
- Agent orchestrator service
- Tool framework base
- WebSocket server
- Authentication

### Phase 2: Core Tools (Weeks 3-4)
- Shell tool
- File tool
- Browser tool
- Search tool
- Database tool

### Phase 3: Webdev System (Weeks 5-6)
- Project initialization
- Dev server management
- File management
- Checkpoint system
- Deployment system

### Phase 4: Visual Editor (Weeks 7-8)
- Element selection
- Property editing
- Live preview
- Undo/redo
- Save/deploy

### Phase 5: Knowledge & MCP (Weeks 9-10)
- Knowledge base
- Vector search
- MCP integration
- Feedback system
- Learning system

### Phase 6: UI/UX (Weeks 11-12)
- Agent dashboard
- Thinking visualization
- Project manager
- Visual editor UI
- Mobile responsive

### Phase 7: Testing & Launch (Weeks 13-14)
- End-to-end testing
- Performance optimization
- Security audit
- Documentation
- Production deployment

---

## Success Metrics

### Technical Metrics
- Agent task completion rate > 95%
- Average execution time < 2 minutes
- Deployment success rate > 99%
- System uptime > 99.9%
- API response time < 200ms

### Business Metrics
- User adoption rate > 80%
- Feature usage rate > 70%
- Customer satisfaction > 4.5/5
- Churn rate < 5%
- Revenue per user > $1,500/month

### Performance Metrics
- Concurrent agents per server > 50
- Sandbox startup time < 5 seconds
- Build time < 30 seconds
- Deployment time < 60 seconds
- Cache hit rate > 80%

---

## Conclusion

This architecture provides a complete blueprint for building a white-label Manus platform replica. The system is designed to be scalable, secure, and cost-effective while providing agency clients with powerful AI-driven development capabilities.

**Next Steps:**
1. Review and approve architecture
2. Set up development environment
3. Begin Phase 1 implementation
4. Iterate based on feedback

---

**Author**: Manus AI  
**Date**: December 12, 2024  
**Version**: 1.0
