# Deployment Services Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Application                       │
│                      (React + tRPC Client)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ tRPC RPC Calls
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GHL Agency AI Server                        │
│                    Node.js + Express + tRPC                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │            Deployment Router (tRPC)                   │   │
│   │  /api/trpc/deployment.[method]                        │   │
│   │                                                        │   │
│   │  Mutations:                                            │   │
│   │  • deploy                 • rollback                   │   │
│   │  • addDomain              • removeDomain              │   │
│   │  • setEnvVariables                                     │   │
│   │                                                        │   │
│   │  Queries:                                              │   │
│   │  • getStatus              • listDeployments            │   │
│   │  • getBuildLogs           • getStorageInfo             │   │
│   │  • getAnalytics                                        │   │
│   └─────┬──────────────────┬──────────────────┬───────────┘   │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│   ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐ │
│   │  Vercel Deploy │ │  Build Service │ │ S3 Storage       │ │
│   │  Service       │ │                │ │ Service          │ │
│   ├────────────────┤ ├────────────────┤ ├──────────────────┤ │
│   │ Methods:       │ │ Methods:       │ │ Methods:         │ │
│   │ • deploy       │ │ • buildProject │ │ • uploadFile     │ │
│   │ • getStatus    │ │ • getBuildLogs │ │ • downloadFile   │ │
│   │ • listDeploys  │ │ • getBuildStats│ │ • deleteFile     │ │
│   │ • rollback     │ │ • cleanOldBuild│ │ • listFiles      │ │
│   │ • addDomain    │ │                │ │ • getSignedUrl   │ │
│   │ • removeDomain │ │                │ │ • copyFile       │ │
│   │ • setEnvVars   │ │                │ │ • getMetadata    │ │
│   │                │ │                │ │ • fileExists     │ │
│   └────────┬───────┘ └────────┬───────┘ └────────┬─────────┘ │
│            │                  │                  │            │
└────────────┼──────────────────┼──────────────────┼────────────┘
             │                  │                  │
             │ HTTP/REST        │ Local FS         │ AWS SDK
             ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
    │ Vercel API   │   │ /tmp/webdev- │  │ AWS S3       │
    │              │   │ builds/      │  │ Bucket       │
    │ • v13/deploy │   │              │  │              │
    │ • v9/domains │   │ Project Temp │  │ webdev-1/    │
    │ • v10/project│   │ Build Dirs   │  │ webdev-2/    │
    └──────────────┘   └──────────────┘  │ webdev-3/    │
                                         └──────────────┘
```

## Data Flow Diagrams

### 1. Deployment Flow

```
Client Request
    │
    ├─ ProjectFiles
    ├─ Environment Config
    └─ Domain Info
         │
         ▼
   Deployment Router
         │
         ├──────────────────────┬──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
   1. Build Project      2. Deploy to Vercel    3. Configure Domain
         │                      │                      │
         │ Files                │ Build Output         │
         ▼                      ▼                      ▼
   Build Service         Vercel Deploy Service  Add Custom Domain
         │                      │                      │
         ├─ Detect Type         │                      │
         ├─ Compile             ├─ Create Project      │
         ├─ Generate Output     ├─ Upload Files        │
         └─ Save Logs           ├─ Start Build         │
              │                 └─ Return Deployment   │
              │                      │                 │
              └──────────────────────┼─────────────────┘
                                     │
                                     ▼
                              Deployment Result
                              ├─ Deployment ID
                              ├─ URL
                              ├─ Status
                              └─ CreatedAt
```

### 2. Build Process

```
Source Files (HTML, CSS, JS, JSON)
         │
         ▼
   Validate Files
         │
         ├─ Check size < 50MB
         ├─ Validate paths
         └─ Check content
         │
         ▼
   Write to Disk
         │
         ├─ Create /tmp/webdev-builds/project-{id}/
         └─ Write each file
         │
         ▼
   Detect Project Type
         │
         ├─ Check for package.json
         ├─ Check for next dependency → Next.js
         ├─ Check for react dependency → React
         └─ Default → Static Site
         │
         ▼
   Run Build Command
         │
         ├─ Next.js: npm install && npm run build
         ├─ React: npm install && npm run build
         └─ Static: Copy files
         │
         ▼
   Collect Output
         │
         ├─ Copy .next/ or dist/ or public/
         ├─ Count files
         └─ Calculate size
         │
         ▼
   Build Result
         ├─ Success: true
         ├─ File Count: N
         ├─ Total Size: X bytes
         └─ Duration: Y ms
```

### 3. File Storage Flow

```
Client Upload Request
         │
         ▼
Validation
    ├─ Check key format
    ├─ Check content size
    └─ Verify content type
         │
         ▼
S3 Upload
    ├─ Create S3Client
    ├─ PutObjectCommand
    ├─ Set metadata
    └─ Enable encryption
         │
         ▼
AWS S3 Bucket
    │
    └─ webdev-projects/
       ├─ webdev-1/
       │  ├─ index.html
       │  ├─ style.css
       │  └─ assets/
       ├─ webdev-2/
       └─ webdev-3/
         │
         ▼
    Return S3 URL
    └─ s3://bucket/key
```

## Service Dependencies

```
Deployment Router
    │
    ├─ ✓ Vercel Deploy Service
    │   ├─ Dependency: axios (HTTP client)
    │   ├─ Dependency: retry logic
    │   ├─ Dependency: logger
    │   └─ External: Vercel API
    │
    ├─ ✓ Build Service
    │   ├─ Dependency: child_process
    │   ├─ Dependency: fs (file system)
    │   ├─ Dependency: logger
    │   └─ External: Local filesystem
    │
    └─ ✓ S3 Storage Service
        ├─ Dependency: @aws-sdk/client-s3
        ├─ Dependency: @aws-sdk/s3-request-presigner
        ├─ Dependency: logger
        └─ External: AWS S3
```

## Request/Response Examples

### Deploy Request
```typescript
POST /api/trpc/deployment.deploy

Request Body:
{
  projectId: 1,
  projectName: "my-website",
  files: [
    { path: "index.html", content: "<html>...</html>" },
    { path: "style.css", content: "body { color: blue; }" }
  ],
  environment: {
    NODE_ENV: "production",
    API_URL: "https://api.example.com"
  },
  customDomain: "mysite.com"
}

Response:
{
  success: true,
  deployment: {
    id: "deploy_abc123xyz",
    url: "https://webdev-1.vercel.app",
    status: "deploying",
    createdAt: "2025-12-12T15:44:00Z"
  },
  buildStats: {
    fileCount: 42,
    totalSize: 1048576,
    duration: 15000
  }
}
```

### Get Status Request
```typescript
GET /api/trpc/deployment.getStatus?input={"deploymentId":"deploy_abc123"}

Response:
{
  success: true,
  deployment: {
    id: "deploy_abc123xyz",
    url: "https://webdev-1.vercel.app",
    status: "ready",
    createdAt: "2025-12-12T15:44:00Z",
    updatedAt: "2025-12-12T15:45:30Z",
    error: null
  }
}
```

## Error Handling Flow

```
Service Method Call
         │
         ▼
    Try Block
         │
    ┌────┴────┐
    │          │
    ▼          ▼
Success    Catch Error
    │          │
    │          ├─ Check error type
    │          │
    │          ├─ TRPCError?
    │          │  └─ Re-throw
    │          │
    │          └─ Other Error?
    │             ├─ Log error
    │             └─ Throw new TRPCError
    │
    └──────────┬──────────┘
               │
               ▼
         Response to Client
         ├─ Success: true/false
         ├─ Data: {...} or null
         └─ Error: {code, message} or null
```

## Authentication & Authorization

```
Client Request
    │
    ▼
Middleware: requireUser
    │
    ├─ Check ctx.user exists
    │
    ├─ Not authenticated?
    │  └─ Throw TRPCError(UNAUTHORIZED)
    │
    └─ Authenticated ✓
       │
       ▼
    Router Procedure
       │
       ├─ TODO: Check user owns project
       ├─ TODO: Verify permissions
       └─ Execute service method
       │
       ▼
    Return response to authenticated user
```

## Logging Architecture

```
Service Method Called
    │
    ├─ logger.info("Starting operation")
    ├─ logger.debug("Detailed info")
    ├─ logger.warn("Warning condition")
    └─ logger.error("Error occurred", error)
         │
         ▼
    serviceLoggers.deployment
         │
         ├─ Includes: service: 'deployment'
         ├─ Includes: timestamp
         ├─ Includes: level (info/warn/error/debug)
         └─ Includes: message
         │
         ▼
    Transport (pino)
         │
         ├─ Development: pino-pretty (colored output)
         └─ Production: JSON logs
```

## Database Integration (Future)

```
Current Flow (In-Memory):
    Service Method
         │
         ├─ Create deployment
         └─ Return result
         
Planned Flow (Persisted):
    Service Method
         │
         ├─ Create deployment
         ├─ Save to database
         │  └─ deployments table
         │  └─ deployment_history table
         ├─ Update deployment status
         │  └─ Query database
         └─ Return cached result
```

## Deployment Status Lifecycle

```
Initial State
    │
    ├─ Create deployment
    │
    ▼
Queued State
    │
    ├─ Files uploaded
    ├─ Build started
    │
    ▼
Deploying State
    │
    ├─ Building project
    ├─ Installing dependencies
    ├─ Compiling code
    │
    ▼
Ready/Success State
    │
    └─ Domain configured
    └─ Accessible at URL
         
    OR
    
Error State
    │
    └─ Build failed
    └─ Deployment failed
    └─ Check logs for details
```

## Performance Considerations

```
Build Service
    ├─ Max build size: 50MB
    ├─ Build timeout: 5 minutes
    ├─ Temp storage: /tmp/webdev-builds/
    └─ Auto cleanup: 24 hours

Vercel Deploy Service
    ├─ API timeout: 30 seconds
    ├─ Retry attempts: 3
    ├─ Backoff: Exponential (1s → 2s → 4s)
    └─ Rate limit: Vercel API limits

S3 Storage Service
    ├─ API timeout: 30 seconds
    ├─ Retry attempts: 3
    ├─ Encryption: AES256
    ├─ Bucket: webdev-projects
    └─ Signed URL expiry: 1 hour default
```

## Security Boundaries

```
User Input Validation
    ├─ Zod schemas for all inputs
    ├─ File path validation (no ../,/)
    ├─ Size limits enforced
    └─ Content type checked

Credential Management
    ├─ Environment variables (never logged)
    ├─ AWS credentials encrypted
    ├─ Vercel token in secure header
    └─ No credentials in database

File Access
    ├─ Temporary files in /tmp (OS managed)
    ├─ S3 signed URLs expire
    ├─ User ownership validation (TODO)
    └─ S3 encryption enabled

Permission Checks
    ├─ Protected procedures (auth required)
    ├─ User project ownership (TODO)
    ├─ Admin-only operations (TODO)
    └─ Rate limiting (future)
```

## Monitoring & Observability

```
Metrics Tracked
    ├─ Deployment count
    ├─ Build duration
    ├─ Build file count
    ├─ Build total size
    ├─ Success/failure rate
    └─ Error types

Logs Generated
    ├─ Operation start/end
    ├─ Status changes
    ├─ Error conditions
    ├─ Performance metrics
    └─ Request tracing

Alerts (Future)
    ├─ Build failures
    ├─ Deployment errors
    ├─ S3 upload failures
    ├─ Vercel API issues
    └─ Service degradation
```

This architecture provides a scalable, secure, and maintainable deployment infrastructure for GHL Agency AI webdev projects.
