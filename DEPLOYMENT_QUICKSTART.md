# Deployment Services Quick Start Guide

## Files Created

### Services (Server-side Logic)

1. **`/server/services/vercel-deploy.service.ts`** (383 lines)
   - Vercel deployment management
   - Methods: `deploy()`, `getDeploymentStatus()`, `listDeployments()`, `rollback()`, `addCustomDomain()`, `removeCustomDomain()`, `setEnvVariables()`

2. **`/server/services/s3-storage.service.ts`** (324 lines)
   - AWS S3 file storage and retrieval
   - Methods: `uploadFile()`, `downloadFile()`, `deleteFile()`, `listFiles()`, `getSignedUrl()`, `copyFile()`, `getFileMetadata()`, `fileExists()`

3. **`/server/services/build.service.ts`** (456 lines)
   - Project building and compilation
   - Supports: Next.js, React, static sites
   - Methods: `buildProject()`, `getBuildLogs()`, `getBuildStats()`, `cleanOldBuilds()`

### Router (API Endpoints)

4. **`/server/api/routers/deployment.ts`** (596 lines)
   - tRPC router with 10 procedures
   - Procedures: `deploy`, `getStatus`, `listDeployments`, `rollback`, `addDomain`, `removeDomain`, `setEnvVariables`, `getBuildLogs`, `getStorageInfo`, `getAnalytics`

### Configuration

5. **Updated `/server/routers.ts`**
   - Added import: `import { deploymentRouter } from "./api/routers/deployment";`
   - Added to appRouter: `deployment: deploymentRouter,`

6. **Updated `/server/lib/logger.ts`**
   - Added service logger: `deployment: logger.child({ service: 'deployment' })`

## Environment Variables

Add these to your `.env.local` or deployment configuration:

```env
# Vercel Deployment
VERCEL_TOKEN=your_vercel_api_token
VERCEL_ORG_ID=optional_org_id
VERCEL_PROJECT_PREFIX=webdev-

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=webdev-projects
```

## Getting Credentials

Follow the instructions in `/root/.claude/CLAUDE.md` to fetch credentials from Notion:

1. Search for "Vercel api key" or "Vercel credentials"
2. Search for "AWS S3" or "AWS credentials"
3. Copy values to `.env.local`
4. Never commit `.env.local` to git

## Usage Examples

### Deploy a Project

```typescript
const deployment = await trpc.deployment.deploy.mutate({
  projectId: 1,
  projectName: 'my-site',
  files: [
    { path: 'index.html', content: '<html>...</html>' },
    { path: 'style.css', content: 'body { color: blue; }' }
  ],
  environment: {
    NODE_ENV: 'production',
    API_URL: 'https://api.example.com'
  },
  customDomain: 'mysite.com'
});

console.log('Deployment URL:', deployment.deployment.url);
```

### Check Deployment Status

```typescript
const status = await trpc.deployment.getStatus.query({
  deploymentId: 'deploy_xyz123'
});

console.log('Status:', status.deployment.status);
console.log('URL:', status.deployment.url);
```

### List Deployment History

```typescript
const deployments = await trpc.deployment.listDeployments.query({
  projectId: 1
});

deployments.deployments.forEach(d => {
  console.log(`${d.id}: ${d.status}`);
});
```

### Add Custom Domain

```typescript
await trpc.deployment.addDomain.mutate({
  projectId: 1,
  domain: 'mysite.com'
});
```

### Set Environment Variables

```typescript
await trpc.deployment.setEnvVariables.mutate({
  projectId: 1,
  variables: {
    DATABASE_URL: 'postgres://...',
    API_SECRET: 'secret123'
  }
});
```

### Upload Files to S3

```typescript
import { s3StorageService } from '@/server/services/s3-storage.service';

const buffer = Buffer.from(fileContent);
const url = await s3StorageService.uploadFile(
  'webdev-1/assets/image.jpg',
  buffer,
  'image/jpeg'
);

console.log('File uploaded to:', url);
```

### Generate Signed URL

```typescript
const signedUrl = await s3StorageService.getSignedUrl(
  'webdev-1/private-file.pdf',
  3600 // 1 hour expiration
);

// Share signedUrl with users for temporary access
```

## API Endpoints

### Mutations (Change Data)
```
POST /api/trpc/deployment.deploy
POST /api/trpc/deployment.rollback
POST /api/trpc/deployment.addDomain
POST /api/trpc/deployment.removeDomain
POST /api/trpc/deployment.setEnvVariables
```

### Queries (Read Data)
```
GET /api/trpc/deployment.getStatus
GET /api/trpc/deployment.listDeployments
GET /api/trpc/deployment.getBuildLogs
GET /api/trpc/deployment.getStorageInfo
GET /api/trpc/deployment.getAnalytics
```

## Testing Locally

### 1. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Vercel and AWS tokens
```

### 2. Run development server
```bash
npm run dev
```

### 3. Test via tRPC client
```typescript
// In your component or test
import { trpc } from '@/utils/trpc';

// List deployments
const { data } = trpc.deployment.listDeployments.useQuery(
  { projectId: 1 },
  { enabled: projectId !== null }
);

console.log('Deployments:', data?.deployments);
```

## Deployment Checklist

- [ ] Set `VERCEL_TOKEN` environment variable
- [ ] Set AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] Verify S3 bucket exists and is accessible
- [ ] Test deployment with small project
- [ ] Verify deployed site is accessible
- [ ] Test custom domain addition
- [ ] Test environment variable configuration
- [ ] Test rollback functionality
- [ ] Monitor build logs for errors
- [ ] Set up monitoring/alerting

## Troubleshooting

### Build Fails
```
Error: Build failed: ...
```
Check build logs with:
```typescript
const logs = await trpc.deployment.getBuildLogs.query({ projectId: 1 });
console.log(logs.logs);
```

### Deployment Status Stuck
```
Status: 'deploying' (indefinitely)
```
Wait a few minutes or check Vercel dashboard directly. Status may not update in real-time.

### S3 Upload Fails
```
Error: Failed to upload file: Access Denied
```
Verify:
- AWS credentials are correct
- S3 bucket exists and is accessible
- Bucket permissions allow uploads

### Domain Addition Fails
```
Error: Failed to add domain: ...
```
Verify:
- Domain is registered and DNS is configured
- Domain ownership is verified with provider
- Vercel project exists

## Security Notes

1. **Never commit `.env.local`** to version control
2. **Never log sensitive variables** - service already filters these
3. **Use signed URLs** for temporary file access instead of public URLs
4. **Validate user permissions** before allowing deployments (TODOs in code)
5. **Rotate credentials regularly**, especially in production

## Next Steps

1. **Database Integration**
   - Uncomment TODO sections in `deployment.ts` router
   - Create database schema for deployment records
   - Add deployment history tracking

2. **Monitoring & Analytics**
   - Set up deployment success/failure tracking
   - Monitor build times and sizes
   - Create dashboards for deployment metrics

3. **Advanced Features**
   - Implement blue-green deployments
   - Add canary deployment support
   - Create deployment preview environments
   - Add git integration for auto-deploy

4. **User Ownership**
   - Uncomment permission checks in router
   - Ensure users can only deploy their own projects
   - Add audit logging

## Documentation Files

- **`DEPLOYMENT_SERVICES.md`** - Comprehensive documentation with all methods and examples
- **`DEPLOYMENT_QUICKSTART.md`** - This file, quick reference guide

## Support

For issues or questions:
1. Check `DEPLOYMENT_SERVICES.md` for detailed API documentation
2. Review inline code comments in service files
3. Check TypeScript types for parameter documentation
4. Review error messages and logs for debugging
