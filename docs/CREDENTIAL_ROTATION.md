# Credential Rotation System

Automatic rotation of API keys, OAuth tokens, and webhook secrets with configurable policies and audit logging.

## Overview

The credential rotation system provides:
- **Rotation Policies**: Define rotation intervals per credential type
- **Automatic Rotation**: Scheduled daily job rotates credentials when due
- **Manual Rotation**: Trigger immediate rotation via API
- **Audit Trail**: Full history of all rotation events

## Supported Credential Types

| Type | Description |
|------|-------------|
| `api_key` | Platform API keys |
| `oauth_token` | OAuth access/refresh tokens |
| `webhook_secret` | Webhook signature secrets |

## Database Schema

### credential_policies

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| userId | text | Owner of the policy |
| credentialType | text | Type of credential |
| rotationIntervalDays | integer | Days between rotations |
| lastRotatedAt | timestamp | Last rotation timestamp |
| nextRotationAt | timestamp | Next scheduled rotation |
| isEnabled | boolean | Whether policy is active |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

### credential_rotation_logs

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| policyId | text | Associated policy |
| userId | text | Owner |
| credentialType | text | Type rotated |
| action | text | rotated/failed/skipped |
| oldKeyHash | text | Last 4 chars of old key hash |
| newKeyHash | text | Last 4 chars of new key hash |
| reason | text | Rotation reason |
| createdAt | timestamp | Event timestamp |

## API Endpoints

All endpoints require authentication. Users can only access their own policies.

### Create Policy

```typescript
credentialRotation.createPolicy({
  credentialType: 'api_key' | 'oauth_token' | 'webhook_secret',
  rotationIntervalDays: number // 1-365
})
```

### Get Policy

```typescript
credentialRotation.getPolicy({
  credentialType: 'api_key' | 'oauth_token' | 'webhook_secret'
})
```

### List All Policies

```typescript
credentialRotation.getPolicies()
```

### Update Policy

```typescript
credentialRotation.updatePolicy({
  policyId: string,
  rotationIntervalDays?: number,
  isEnabled?: boolean
})
```

### Delete Policy

```typescript
credentialRotation.deletePolicy({
  policyId: string
})
```

### Rotate Now (Manual)

```typescript
credentialRotation.rotateNow({
  policyId: string
})
```

### Get Rotation History

```typescript
credentialRotation.getHistory({
  limit?: number // default 50
})
```

## Scheduled Rotation

The scheduler runner service includes a daily credential rotation job:

```typescript
// Runs automatically on server start, then every 24 hours
schedulerRunnerService.startCredentialRotationCheck()

// Manual trigger
schedulerRunnerService.runCredentialRotationsNow()

// Get stats
schedulerRunnerService.getCredentialRotationStats()
```

## Configuration

### Default Rotation Intervals

| Credential Type | Recommended Interval |
|-----------------|---------------------|
| API Key | 90 days |
| OAuth Token | 30 days |
| Webhook Secret | 180 days |

### Environment Variables

No additional environment variables required. Uses existing database configuration.

## Example Usage

### Create a 30-day API key rotation policy

```typescript
import { trpc } from '@/lib/trpc';

const policy = await trpc.credentialRotation.createPolicy.mutate({
  credentialType: 'api_key',
  rotationIntervalDays: 30
});
```

### Manually rotate an API key

```typescript
const result = await trpc.credentialRotation.rotateNow.mutate({
  policyId: 'policy-uuid-here'
});
```

### View rotation history

```typescript
const history = await trpc.credentialRotation.getHistory.query({
  limit: 10
});
```

## Security Considerations

1. **Credential hashing**: Only the last 4 characters of credential hashes are logged
2. **Notifications**: Users receive in-app notifications on rotation
3. **Audit trail**: All rotation events are logged with timestamps
4. **Isolation**: Users can only manage their own policies

## Files

| File | Description |
|------|-------------|
| `drizzle/schema-credentials.ts` | Database schema |
| `drizzle/migrations/0008_credential_rotation.sql` | Migration |
| `server/services/credentialRotation.service.ts` | Core service |
| `server/api/routers/credentialRotation.ts` | tRPC router |
| `server/services/schedulerRunner.service.ts` | Scheduled job |
