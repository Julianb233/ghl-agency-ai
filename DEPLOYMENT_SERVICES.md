# Deployment Services Documentation

## Overview

The deployment infrastructure for GHL Agency AI webdev projects provides comprehensive deployment automation, storage management, and build services. This documentation covers all deployment-related services and their usage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Deployment Router (tRPC)                    │
│  /api/trpc/deployment.[deploy|getStatus|listDeployments|...]   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Vercel Deploy    │ │ Build        │ │ S3 Storage   │
│ Service          │ │ Service      │ │ Service      │
├──────────────────┤ ├──────────────┤ ├──────────────┤
│ - deploy()       │ │ - build()    │ │ - upload()   │
│ - getStatus()    │ │ - getLogs()  │ │ - download() │
│ - rollback()     │ │ - stats()    │ │ - delete()   │
│ - addDomain()    │ │ - cleanup()  │ │ - list()     │
└──────────────────┘ └──────────────┘ └──────────────┘
        │                    │                │
        ▼                    ▼                ▼
   Vercel API         Local Filesystem    AWS S3 Bucket
```

## Services

### 1. Vercel Deploy Service

**Location:** `/server/services/vercel-deploy.service.ts`

Manages all Vercel deployments for webdev projects.

#### Features
- Create new deployments from source files
- Monitor deployment status
- Manage custom domains
- Set environment variables
- Rollback to previous deployments
- List deployment history

#### Configuration

Environment variables required:
```env
VERCEL_TOKEN=<your-vercel-api-token>
VERCEL_ORG_ID=<optional-vercel-organization-id>
VERCEL_PROJECT_PREFIX=webdev-  # Prefix for project names
```

#### Class Methods

##### `deploy(config: DeploymentConfig): Promise<DeploymentResult>`
Creates a new deployment with provided files and configuration.

```typescript
const deployment = await vercelDeployService.deploy({
  projectId: 1,
  userId: 123,
  projectName: 'my-site',
  files: [
    { path: 'index.html', content: '<html>...</html>' },
    { path: 'style.css', content: 'body { color: blue; }' }
  ],
  environment: { NODE_ENV: 'production' },
  customDomain: 'mysite.com'
});

// Returns:
// {
//   id: 'deploy_xyz123',
//   url: 'https://webdev-1.vercel.app',
//   status: 'deploying',
//   createdAt: Date
// }
```

##### `getDeploymentStatus(deploymentId: string): Promise<DeploymentResult>`
Retrieves the current status of a deployment.

```typescript
const status = await vercelDeployService.getDeploymentStatus('deploy_xyz123');
// { id, url, status: 'ready' | 'deploying' | 'error', createdAt, updatedAt }
```

##### `listDeployments(projectId: number): Promise<DeploymentResult[]>`
Lists all deployments for a project.

```typescript
const deployments = await vercelDeployService.listDeployments(1);
// [{ id, url, status, createdAt }, ...]
```

##### `rollback(deploymentId: string): Promise<void>`
Rolls back to a previous deployment.

```typescript
await vercelDeployService.rollback('deploy_xyz123');
```

##### `addCustomDomain(projectName: string, domain: string): Promise<void>`
Adds a custom domain to a project.

```typescript
await vercelDeployService.addCustomDomain('webdev-1', 'mysite.com');
```

##### `removeCustomDomain(projectName: string, domain: string): Promise<void>`
Removes a custom domain from a project.

```typescript
await vercelDeployService.removeCustomDomain('webdev-1', 'mysite.com');
```

##### `setEnvVariables(projectId: number, vars: Record<string, string>): Promise<void>`
Sets environment variables for a project.

```typescript
await vercelDeployService.setEnvVariables(1, {
  API_URL: 'https://api.example.com',
  DEBUG: 'false'
});
```

---

### 2. Build Service

**Location:** `/server/services/build.service.ts`

Handles project building and compilation for webdev projects.

#### Features
- Build projects with source files
- Support for Next.js, React, and static sites
- Generate build outputs
- Collect build logs
- Calculate build statistics
- Automatic cleanup of old builds

#### Configuration

- **Temp Directory:** `/tmp/webdev-builds`
- **Max Build Size:** 50MB
- **Build Timeout:** 5 minutes

#### Class Methods

##### `buildProject(projectId: number, files: ProjectFile[]): Promise<BuildResult>`
Builds a project from source files.

```typescript
const result = await buildService.buildProject(1, [
  { path: 'package.json', content: '{"name": "my-app"}' },
  { path: 'src/index.js', content: 'console.log("Hello");' },
  { path: 'public/index.html', content: '<html>...</html>' }
]);

// Returns:
// {
//   success: true,
//   outputDir: '/tmp/webdev-builds/project-1/.output',
//   fileCount: 42,
//   totalSize: 1024000,
//   duration: 15000,
//   errors: []
// }
```

##### `getBuildLogs(projectId: number): Promise<string[]>`
Retrieves build logs for a project.

```typescript
const logs = await buildService.getBuildLogs(1);
// ["[info] Building project...", "[error] Failed to compile", ...]
```

##### `getBuildStats(projectId: number): Promise<BuildStats>`
Retrieves build statistics.

```typescript
const stats = await buildService.getBuildStats(1);
// { builds: 5, totalBuildsSize: 50000, averageBuildTime: 15000 }
```

##### `cleanOldBuilds(maxAgeMs: number): Promise<void>`
Cleans up old build artifacts (default: 24 hours).

```typescript
await buildService.cleanOldBuilds(24 * 60 * 60 * 1000);
```

---

### 3. S3 Storage Service

**Location:** `/server/services/s3-storage.service.ts`

Manages file storage and retrieval from AWS S3.

#### Features
- Upload files with metadata
- Download files
- Delete files
- List files with prefix
- Generate signed URLs for temporary access
- Copy files within S3
- Get file metadata
- Check file existence

#### Configuration

Environment variables required:
```env
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=webdev-projects
```

#### Class Methods

##### `uploadFile(key: string, content: Buffer, contentType?: string, metadata?: Record<string, string>): Promise<string>`
Uploads a file to S3.

```typescript
const fileBuffer = Buffer.from('<html>...</html>');
const url = await s3StorageService.uploadFile(
  'webdev-1/index.html',
  fileBuffer,
  'text/html',
  { projectId: '1', version: '1.0' }
);
// Returns: 's3://webdev-projects/webdev-1/index.html'
```

##### `downloadFile(key: string): Promise<Buffer>`
Downloads a file from S3.

```typescript
const content = await s3StorageService.downloadFile('webdev-1/index.html');
console.log(content.toString());
```

##### `deleteFile(key: string): Promise<void>`
Deletes a file from S3.

```typescript
await s3StorageService.deleteFile('webdev-1/index.html');
```

##### `listFiles(prefix: string): Promise<string[]>`
Lists files with a given prefix.

```typescript
const files = await s3StorageService.listFiles('webdev-1/');
// ['webdev-1/index.html', 'webdev-1/style.css', ...]
```

##### `getSignedUrl(key: string, expiresIn?: number): Promise<string>`
Generates a signed URL for temporary access (default: 1 hour).

```typescript
const url = await s3StorageService.getSignedUrl('webdev-1/index.html', 3600);
// 'https://s3.amazonaws.com/webdev-projects/webdev-1/index.html?...'
```

##### `copyFile(sourceKey: string, destinationKey: string): Promise<void>`
Copies a file within S3.

```typescript
await s3StorageService.copyFile('webdev-1/index.html', 'webdev-1/index-backup.html');
```

##### `getFileMetadata(key: string): Promise<Record<string, string>>`
Gets file metadata.

```typescript
const metadata = await s3StorageService.getFileMetadata('webdev-1/index.html');
// { contentType: 'text/html', contentLength: '1024', lastModified: '...', ... }
```

##### `fileExists(key: string): Promise<boolean>`
Checks if a file exists.

```typescript
const exists = await s3StorageService.fileExists('webdev-1/index.html');
```

---

## Deployment Router (tRPC API)

**Location:** `/server/api/routers/deployment.ts`

REST-like API endpoints for deployment operations via tRPC.

### Procedures

#### `deploy` - Mutation
Deploy a project to Vercel.

```typescript
const result = await trpc.deployment.deploy.mutate({
  projectId: 1,
  projectName: 'my-webdev-project',
  files: [{
    path: 'index.html',
    content: '<html>...</html>'
  }],
  environment: { NODE_ENV: 'production' },
  customDomain: 'mysite.com'
});

// Returns:
// {
//   success: true,
//   deployment: { id, url, status, createdAt },
//   buildStats: { fileCount, totalSize, duration }
// }
```

#### `getStatus` - Query
Get current deployment status.

```typescript
const status = await trpc.deployment.getStatus.query({
  deploymentId: 'deploy_xyz123'
});
```

#### `listDeployments` - Query
List all deployments for a project.

```typescript
const deployments = await trpc.deployment.listDeployments.query({
  projectId: 1
});
```

#### `rollback` - Mutation
Rollback to a previous deployment.

```typescript
await trpc.deployment.rollback.mutate({
  deploymentId: 'deploy_xyz123'
});
```

#### `addDomain` - Mutation
Add a custom domain to a project.

```typescript
await trpc.deployment.addDomain.mutate({
  projectId: 1,
  domain: 'mysite.com'
});
```

#### `removeDomain` - Mutation
Remove a custom domain from a project.

```typescript
await trpc.deployment.removeDomain.mutate({
  projectId: 1,
  domain: 'mysite.com'
});
```

#### `setEnvVariables` - Mutation
Set environment variables for a project.

```typescript
await trpc.deployment.setEnvVariables.mutate({
  projectId: 1,
  variables: {
    API_KEY: 'secret123',
    NODE_ENV: 'production'
  }
});
```

#### `getBuildLogs` - Query
Get build logs for a project.

```typescript
const logs = await trpc.deployment.getBuildLogs.query({
  projectId: 1
});
```

#### `getStorageInfo` - Query
Get storage information for a project.

```typescript
const info = await trpc.deployment.getStorageInfo.query({
  projectId: 1
});
```

#### `getAnalytics` - Query
Get deployment analytics and statistics.

```typescript
const analytics = await trpc.deployment.getAnalytics.query({
  projectId: 1
});
```

---

## Error Handling

All services use consistent error handling:

```typescript
try {
  const deployment = await vercelDeployService.deploy(config);
} catch (error) {
  if (error instanceof TRPCError) {
    console.error(error.code, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User lacks permission
- `BAD_REQUEST` - Invalid input parameters
- `INTERNAL_SERVER_ERROR` - Service error
- `NOT_FOUND` - Resource not found

---

## Logging

All services use the structured logging system via `serviceLoggers.deployment`:

```typescript
logger.info('Deployment created: xyz123');
logger.warn('Sensitive variables detected');
logger.error('Build failed', error);
logger.debug('Fetching deployment status');
```

---

## Best Practices

### 1. Security
- Never log sensitive environment variables
- Use signed URLs for temporary file access
- Validate user permissions before deployment
- Limit environment variable exposure

### 2. Performance
- Use batch operations when possible
- Cache deployment status locally
- Clean up old builds regularly
- Implement request retry logic

### 3. Reliability
- Always await service calls
- Implement proper error boundaries
- Use retry logic for transient failures
- Monitor deployment health

### 4. Monitoring
- Track deployment metrics
- Log all operations
- Set up alerts for failures
- Monitor build times and sizes

---

## Database Integration (Future)

Currently, deployment records are stored in memory. Future enhancement to persist to database:

```typescript
// TODO: Uncomment when database schema is ready
await getDb().insert(deployments).values({
  id: deployment.id,
  projectId: input.projectId,
  url: deployment.url,
  status: deployment.status,
  createdAt: new Date(),
});
```

---

## Example Usage Flow

```typescript
// 1. Build the project
const buildResult = await buildService.buildProject(projectId, files);
if (!buildResult.success) {
  throw new Error('Build failed');
}

// 2. Deploy to Vercel
const deployment = await vercelDeployService.deploy({
  projectId,
  userId,
  projectName: 'my-site',
  files,
  environment: { NODE_ENV: 'production' }
});

// 3. Add custom domain
await vercelDeployService.addCustomDomain(
  `webdev-${projectId}`,
  'mysite.com'
);

// 4. Store assets in S3
await s3StorageService.uploadFile(
  `webdev-${projectId}/assets.zip`,
  assetBuffer
);

// 5. Check deployment status
const status = await vercelDeployService.getDeploymentStatus(
  deployment.id
);

if (status.status === 'ready') {
  console.log(`Deployment ready at: ${status.url}`);
}
```

---

## Troubleshooting

### Deployment Fails
1. Check Vercel token is valid and has permissions
2. Verify project files are valid
3. Check build logs for errors
4. Ensure environment variables are configured

### S3 Upload Fails
1. Verify AWS credentials
2. Check bucket exists and is accessible
3. Ensure file size is within limits
4. Check bucket permissions

### Build Fails
1. Review build logs
2. Check file structure is valid
3. Verify dependencies are included
4. Check for invalid JavaScript/TypeScript

---

## API Reference Summary

| Service | Method | Purpose |
|---------|--------|---------|
| VercelDeployService | `deploy()` | Create new deployment |
| VercelDeployService | `getDeploymentStatus()` | Check deployment status |
| VercelDeployService | `listDeployments()` | List deployment history |
| VercelDeployService | `rollback()` | Revert to previous version |
| VercelDeployService | `addCustomDomain()` | Add custom domain |
| VercelDeployService | `removeCustomDomain()` | Remove custom domain |
| VercelDeployService | `setEnvVariables()` | Configure environment |
| BuildService | `buildProject()` | Build project from files |
| BuildService | `getBuildLogs()` | Get build output |
| BuildService | `getBuildStats()` | Get build metrics |
| BuildService | `cleanOldBuilds()` | Cleanup old builds |
| S3StorageService | `uploadFile()` | Upload to S3 |
| S3StorageService | `downloadFile()` | Download from S3 |
| S3StorageService | `deleteFile()` | Delete from S3 |
| S3StorageService | `listFiles()` | List S3 files |
| S3StorageService | `getSignedUrl()` | Generate temp access URL |
| DeploymentRouter | `deploy` | Deploy mutation |
| DeploymentRouter | `getStatus` | Status query |
| DeploymentRouter | `listDeployments` | List query |
| DeploymentRouter | All others | See Deployment Router section |

---

## Future Enhancements

- [ ] Database persistence for deployments
- [ ] Deployment preview environments
- [ ] Automated performance testing
- [ ] Deployment rollback scheduling
- [ ] Advanced analytics and reporting
- [ ] Multi-region deployment support
- [ ] Deployment notifications/webhooks
- [ ] Git integration for auto-deploy
- [ ] Blue-green deployment strategy
- [ ] Canary deployment support
