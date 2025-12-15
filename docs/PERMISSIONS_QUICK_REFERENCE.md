# Agent Permissions - Quick Reference

Quick reference guide for implementing and using agent execution permissions.

## Permission Levels (Ordered by Access)

```
VIEW_ONLY        < EXECUTE_BASIC     < EXECUTE_ADVANCED  < ADMIN
No subscription    Starter tier       Enterprise tier     Admin role
Can view only      Safe tools only    Safe + Moderate     All tools
```

## Tool Categories

### Safe (✅ Execute Basic+)
```typescript
'retrieve_documentation', 'file_read', 'file_list', 'file_search',
'retrieve_data', 'browser_navigate', 'browser_extract', 'browser_screenshot'
```

### Moderate (⚠️ Execute Advanced+)
```typescript
'http_request', 'store_data', 'browser_click', 'browser_type',
'browser_select', 'browser_scroll', 'update_plan', 'advance_phase'
```

### Dangerous (🔒 Admin Only)
```typescript
'file_write', 'file_edit', 'shell_exec', 'browser_close', 'ask_user'
```

## Common Code Patterns

### Backend: Check Permission Before Tool Execution

```typescript
import { getAgentPermissionsService } from '@/server/services/agentPermissions.service';

const permissionsService = getAgentPermissionsService();

// Require permission (throws if denied)
await permissionsService.requirePermission(userId, toolName);

// Check permission (returns result)
const result = await permissionsService.checkToolExecutionPermission(userId, toolName);
if (!result.allowed) {
  throw new Error(result.reason);
}
```

### Backend: Check Execution Limits

```typescript
const limits = await permissionsService.checkExecutionLimits(userId);
if (!limits.canExecute) {
  throw new Error(limits.reason);
}
```

### Frontend: Get User Permissions (tRPC)

```typescript
const { permissions } = await trpc.agentPermissions.getMyPermissions.query();

// Check if can execute
if (permissions.canExecute) {
  // Enable execute button
}

// Check specific tool
const { permission } = await trpc.agentPermissions.checkToolPermission.query({
  toolName: 'file_write'
});

if (!permission.allowed) {
  showUpgradePrompt(permission.reason);
}
```

### Frontend: Show Execution Limits

```typescript
const { limits } = await trpc.agentPermissions.checkExecutionLimits.query();

// Display usage
<div>
  Active: {limits.currentActive} / {limits.maxConcurrent}
  Monthly: {limits.monthlyUsed} / {limits.monthlyLimit}
</div>
```

### REST API: Add Permission Middleware

```typescript
import {
  requireExecutePermission,
  requireToolPermission,
  checkExecutionLimits
} from '@/server/api/rest/middleware/permissionMiddleware';

// Require basic execution
router.post('/api/v1/agent/execute',
  requireApiKey,
  requireExecutePermission,
  handler
);

// Check specific tool
router.post('/api/v1/tools/run',
  requireApiKey,
  requireToolPermission,
  handler
);

// Check limits
router.post('/api/v1/agent/start',
  requireApiKey,
  checkExecutionLimits,
  handler
);
```

## Error Handling

### Catch Permission Errors

```typescript
import { PermissionDeniedError } from '@/server/services/agentPermissions.service';

try {
  await permissionsService.requirePermission(userId, toolName);
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error('Permission denied:', error.message);
    console.error('Level:', error.permissionLevel);
    console.error('Category:', error.toolCategory);
    // Show upgrade prompt to user
  }
}
```

### HTTP Error Responses

```typescript
// 403 Forbidden - Permission denied
{
  "error": "Forbidden",
  "message": "Permission denied: ...",
  "code": "TOOL_PERMISSION_DENIED",
  "details": {
    "tool": "file_write",
    "permissionLevel": "execute_advanced",
    "toolCategory": "dangerous"
  }
}

// 429 Too Many Requests - Limits exceeded
{
  "error": "Too Many Requests",
  "message": "Maximum concurrent executions reached (10)",
  "code": "EXECUTION_LIMIT_EXCEEDED",
  "limits": { ... }
}
```

## Subscription Tier Permissions

```typescript
// Check user's tier and permission
const context = await permissionsService.getUserPermissionContext(userId);

if (context.subscriptionTier?.slug === 'starter') {
  // Basic execution only
}

if (context.subscriptionTier?.features.advancedAgentExecution) {
  // Advanced execution enabled
}
```

## Admin Overrides

```typescript
// Check if user is admin
const level = await permissionsService.getUserPermissionLevel(userId);
if (level === AgentPermissionLevel.ADMIN) {
  // Admin has all permissions
}

// Make user admin (database)
UPDATE users SET role = 'admin' WHERE id = ?;

// Enable advanced features for tier (database)
UPDATE subscription_tiers
SET features = jsonb_set(features, '{advancedAgentExecution}', 'true')
WHERE slug = 'growth';
```

## API Key Scopes

```typescript
// Create API key with limited scopes
{
  "scopes": ["agent:execute:safe"]  // Safe tools only
}

{
  "scopes": ["agent:execute:safe", "agent:execute:moderate"]  // Advanced
}

{
  "scopes": ["agent:execute:*"]  // All tools (within user permission)
}
```

## Testing Helpers

```typescript
// Mock permission service
vi.mock('@/server/services/agentPermissions.service', () => ({
  getAgentPermissionsService: () => ({
    getUserPermissionLevel: vi.fn(() => Promise.resolve(AgentPermissionLevel.EXECUTE_BASIC)),
    checkToolExecutionPermission: vi.fn(() => Promise.resolve({ allowed: true })),
    checkExecutionLimits: vi.fn(() => Promise.resolve({ canExecute: true, limits: {} }))
  })
}));

// Test permission denied
it('should deny dangerous tools for basic users', async () => {
  const result = await checkToolExecutionPermission(userId, 'shell_exec');
  expect(result.allowed).toBe(false);
  expect(result.toolCategory).toBe('dangerous');
});
```

## Database Queries

```sql
-- Get user permission info
SELECT
  u.id,
  u.role,
  st.slug as tier,
  st.features
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN subscription_tiers st ON us.tier_id = st.id
WHERE u.id = ?;

-- Enable advanced execution for tier
UPDATE subscription_tiers
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{advancedAgentExecution}',
  'true'::jsonb
)
WHERE slug = 'growth';

-- Check user's current limits
SELECT
  st.max_concurrent_agents,
  st.monthly_execution_limit
FROM subscription_tiers st
JOIN user_subscriptions us ON st.id = us.tier_id
WHERE us.user_id = ?;
```

## UI Components

### Show Permission Level
```tsx
const { permissionLevel } = await trpc.agentPermissions.getPermissionLevel.query();

<Badge color={getLevelColor(permissionLevel)}>
  {permissionLevel}
</Badge>
```

### Show Allowed Tools
```tsx
const { permissions } = await trpc.agentPermissions.getMyPermissions.query();

<div>
  <h3>You can use:</h3>
  <ul>
    {permissions.allowedTools.safe.map(tool => (
      <li key={tool}>{tool}</li>
    ))}
  </ul>
</div>
```

### Upgrade Prompt
```tsx
if (!permission.allowed) {
  return (
    <Alert>
      <p>{permission.reason}</p>
      <Button onClick={() => router.push('/subscription/upgrade')}>
        Upgrade to {getRequiredTier(permission.permissionLevel)}
      </Button>
    </Alert>
  );
}
```

## Troubleshooting

### User can't execute despite subscription
1. Check `user_subscriptions.status` is "active"
2. Verify `subscription_tiers.is_active` is true
3. Check `subscription_tiers.features.advancedAgentExecution`
4. Ensure user isn't suspended (`users.suspended_at`)

### API key permission denied
1. Verify API key `is_active` is true
2. Check `scopes` includes required category
3. Confirm user has base permission level
4. Ensure key hasn't expired (`expires_at`)

### Limits incorrectly enforced
1. Current implementation uses placeholder values
2. Need to implement actual execution counting
3. See TODO in `checkExecutionLimits()` method

## Reference Links

- Full Documentation: `docs/AGENT_PERMISSIONS.md`
- Implementation Summary: `AGENT_PERMISSIONS_IMPLEMENTATION.md`
- Service Code: `server/services/agentPermissions.service.ts`
- Router Code: `server/api/routers/agentPermissions.ts`
- Middleware Code: `server/api/rest/middleware/permissionMiddleware.ts`

---

**Last Updated:** 2025-12-15
**Version:** 1.0.0
