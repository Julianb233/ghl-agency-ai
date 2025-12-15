# Agent Execution Permissions System

Comprehensive permission-based access control for autonomous agent executions in the GHL Agency AI platform.

## Overview

The Agent Permissions System implements fine-grained access control for agent tool executions, protecting against unauthorized operations while providing a tiered permission model based on user roles and subscription levels.

## Permission Levels

### 1. View Only (`view_only`)

**Access:**
- View agent executions
- View execution results and history
- View agent plans and status

**Restrictions:**
- Cannot execute agents
- Cannot run any tools

**Use Case:**
- Trial users
- Users without active subscription
- Observers/stakeholders

### 2. Execute Basic (`execute_basic`)

**Access:**
- All View Only capabilities
- Execute safe, read-only tools:
  - `retrieve_documentation` - Search knowledge base
  - `file_read` - Read file contents
  - `file_list` - List directory contents
  - `file_search` - Search within files
  - `retrieve_data` - Get stored data
  - `browser_navigate` - Navigate to URLs
  - `browser_extract` - Extract page data
  - `browser_screenshot` - Capture screenshots

**Restrictions:**
- Cannot modify files or execute commands
- Cannot make external HTTP requests
- Cannot interact with browser (clicks, typing)

**Subscription Requirement:**
- Starter tier or higher

### 3. Execute Advanced (`execute_advanced`)

**Access:**
- All Execute Basic capabilities
- Execute moderate-risk tools:
  - `http_request` - Make API calls
  - `store_data` - Store execution data
  - `browser_click` - Click elements
  - `browser_type` - Type into fields
  - `browser_select` - Select options
  - `browser_scroll` - Scroll pages
  - `update_plan` - Modify agent plans
  - `advance_phase` - Progress through phases

**Restrictions:**
- Cannot execute shell commands
- Cannot write/modify files
- Cannot perform destructive operations

**Subscription Requirement:**
- Growth tier or higher with advanced features enabled
- Professional tier
- Enterprise tier

### 4. Admin (`admin`)

**Access:**
- All Execute Advanced capabilities
- Execute dangerous tools:
  - `file_write` - Write/create files
  - `file_edit` - Modify files
  - `shell_exec` - Execute shell commands
  - `browser_close` - Close browser sessions

**Restrictions:**
- None (full access)

**Requirement:**
- Admin user role

## Architecture

### Service Layer

**`AgentPermissionsService`** (`server/services/agentPermissions.service.ts`)

Core service providing permission checks and validation:

```typescript
const permissionsService = getAgentPermissionsService();

// Check if user can execute a tool
const result = await permissionsService.checkToolExecutionPermission(
  userId,
  toolName,
  apiKeyId
);

// Get user's permission level
const level = await permissionsService.getUserPermissionLevel(userId);

// Check execution limits
const limits = await permissionsService.checkExecutionLimits(userId);

// Require permission (throws if denied)
await permissionsService.requirePermission(userId, toolName);
```

### Integration Points

#### 1. Agent Orchestrator

Permissions are checked before **every** tool execution:

```typescript
// In agentOrchestrator.service.ts
private async executeTool(toolName: string, ...) {
  // SECURITY: Check permission before executing tool
  const permissionsService = getAgentPermissionsService();
  await permissionsService.requirePermission(state.userId, toolName);

  // Execute tool...
}
```

Execution limits are checked before starting:

```typescript
public async executeTask(options: ExecuteTaskOptions) {
  // SECURITY: Check execution limits before starting
  const permissionsService = getAgentPermissionsService();
  const limitsCheck = await permissionsService.checkExecutionLimits(userId);

  if (!limitsCheck.canExecute) {
    throw new Error(limitsCheck.reason);
  }

  // Start execution...
}
```

#### 2. Tools Router (tRPC)

Direct tool executions through the API are protected:

```typescript
// In tools.ts router
executeTool: protectedProcedure
  .input(executeToolSchema)
  .mutation(async ({ input, ctx }) => {
    // SECURITY: Check permission before executing tool
    const permissionsService = getAgentPermissionsService();
    await permissionsService.requirePermission(ctx.user.id, input.name);

    // Execute tool...
  })
```

#### 3. REST API Middleware

For REST endpoints using API key authentication:

```typescript
import {
  requireExecutePermission,
  requireToolPermission,
  checkExecutionLimits,
} from './middleware/permissionMiddleware';

// Require basic execution permission
router.post('/api/v1/agent/execute',
  requireApiKey,
  requireExecutePermission,
  handler
);

// Check specific tool permission
router.post('/api/v1/tools/run',
  requireApiKey,
  requireToolPermission,
  handler
);

// Check execution limits
router.post('/api/v1/agent/start',
  requireApiKey,
  checkExecutionLimits,
  handler
);
```

### API Endpoints

#### tRPC Endpoints (`agentPermissions` router)

**Get My Permissions**
```typescript
const { permissions } = await trpc.agentPermissions.getMyPermissions.query();

// Returns:
{
  permissionLevel: "execute_advanced",
  allowedTools: {
    safe: [...],
    moderate: [...],
    dangerous: []
  },
  canExecute: true,
  limits: {
    maxConcurrent: 10,
    currentActive: 2,
    monthlyLimit: 500,
    monthlyUsed: 125
  }
}
```

**Get Permission Context**
```typescript
const { context } = await trpc.agentPermissions.getPermissionContext.query();

// Returns subscription tier, features, and permission details
```

**Check Tool Permission**
```typescript
const { permission } = await trpc.agentPermissions.checkToolPermission.query({
  toolName: "file_write",
  apiKeyId: 123
});

// Returns:
{
  allowed: false,
  reason: "Advanced execution level cannot execute dangerous tools",
  permissionLevel: "execute_advanced",
  toolCategory: "dangerous"
}
```

**Check Execution Limits**
```typescript
const { limits } = await trpc.agentPermissions.checkExecutionLimits.query();
```

**Get Permission Level**
```typescript
const { permissionLevel } = await trpc.agentPermissions.getPermissionLevel.query();
```

#### Admin Endpoints

**Get User Permissions** (Admin only)
```typescript
const { permissions } = await trpc.agentPermissions.getUserPermissions.query({
  userId: 456
});
```

**Get All Permission Levels** (Admin only)
```typescript
const { levels } = await trpc.agentPermissions.getPermissionLevels.query();
```

## Tool Risk Categories

Tools are classified into three risk categories:

### Safe Tools (Read-Only)
- No data modification
- No external calls
- No user interaction
- Examples: `file_read`, `retrieve_documentation`, `browser_screenshot`

### Moderate Tools (Moderate Risk)
- Can modify data
- Can make external calls
- Can interact with UI
- Examples: `http_request`, `browser_click`, `store_data`

### Dangerous Tools (High Risk)
- Can modify filesystem
- Can execute system commands
- Can close sessions
- Examples: `file_write`, `shell_exec`, `browser_close`

## Subscription Tier Integration

Permissions are automatically determined based on subscription tier:

| Tier | Permission Level | Max Agents | Monthly Executions |
|------|-----------------|------------|-------------------|
| None | view_only | 0 | 0 |
| Starter | execute_basic | 5 | 200 |
| Growth | execute_basic* | 10 | 500 |
| Professional | execute_basic* | 25 | 1,250 |
| Enterprise | execute_advanced | 50 | 3,000 |

*Can be upgraded to `execute_advanced` with feature flag: `advancedAgentExecution: true`

## API Key Scopes

API keys can have restricted scopes, limiting tool execution:

**Scope Format:** `agent:execute:<category>`

**Available Scopes:**
- `agent:execute:safe` - Execute safe tools only
- `agent:execute:moderate` - Execute moderate tools
- `agent:execute:dangerous` - Execute dangerous tools
- `agent:execute:*` - Execute all tools (within user permission)
- `*` - Full access

**Example:**
```typescript
// API key with safe tool access only
{
  scopes: ["agent:execute:safe"]
}

// API key with advanced access
{
  scopes: ["agent:execute:safe", "agent:execute:moderate"]
}
```

## Error Handling

### Permission Denied Errors

```typescript
try {
  await permissionsService.requirePermission(userId, toolName);
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error(error.message);
    console.error('Permission Level:', error.permissionLevel);
    console.error('Tool Category:', error.toolCategory);
  }
}
```

### HTTP Responses

**401 Unauthorized** - No authentication
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden** - Insufficient permissions
```json
{
  "error": "Forbidden",
  "message": "Permission denied: Advanced execution level cannot execute dangerous tools",
  "code": "TOOL_PERMISSION_DENIED",
  "details": {
    "tool": "file_write",
    "permissionLevel": "execute_advanced",
    "toolCategory": "dangerous"
  }
}
```

**429 Too Many Requests** - Execution limits exceeded
```json
{
  "error": "Too Many Requests",
  "message": "Maximum concurrent executions reached (10)",
  "code": "EXECUTION_LIMIT_EXCEEDED",
  "limits": {
    "maxConcurrent": 10,
    "currentActive": 10,
    "monthlyLimit": 500,
    "monthlyUsed": 245
  }
}
```

## Security Best Practices

### 1. Defense in Depth
- Permission checks at multiple layers (service, router, middleware)
- Redundant validation ensures no bypass

### 2. Fail Secure
- Default to most restrictive permission (view_only)
- Explicit permission grants required

### 3. Least Privilege
- Users get minimum permissions needed for their tier
- API keys can further restrict access

### 4. Audit Trail
- All permission checks logged
- Failed attempts tracked
- Suspicious activity flagged

### 5. Input Validation
- Tool names validated against whitelist
- Parameters sanitized before execution
- User IDs verified before permission checks

## Future Enhancements

### Planned Features

1. **Custom Permission Policies**
   - Per-user permission overrides
   - Temporary permission grants
   - Time-based restrictions

2. **Rate Limiting by Tool**
   - Different limits for different tools
   - Burst allowances for safe tools
   - Stricter limits for dangerous tools

3. **Permission Delegation**
   - Allow users to grant sub-permissions
   - Team-based permission management
   - Role inheritance

4. **Audit Dashboard**
   - Real-time permission violation alerts
   - Historical permission usage
   - Security incident tracking

5. **Advanced Analytics**
   - Permission usage patterns
   - Tool execution trends by permission level
   - Subscription upgrade recommendations based on permission denials

## Troubleshooting

### Common Issues

**Issue:** User can't execute agents despite active subscription
- **Check:** Verify subscription status is "active"
- **Check:** Ensure subscription tier has execution permissions
- **Check:** Check if advancedAgentExecution feature flag is needed

**Issue:** API key permission denied
- **Check:** Verify API key scopes include required tool category
- **Check:** Ensure API key is active and not expired
- **Check:** Confirm user associated with API key has base permission

**Issue:** Execution limits reached
- **Check:** Review current active executions
- **Check:** Check monthly usage against limit
- **Check:** Consider upgrading subscription tier

## Testing

### Unit Tests

```typescript
describe('AgentPermissionsService', () => {
  it('should deny dangerous tools for execute_advanced level', async () => {
    const result = await permissionsService.checkToolExecutionPermission(
      userId,
      'file_write'
    );
    expect(result.allowed).toBe(false);
    expect(result.toolCategory).toBe('dangerous');
  });

  it('should allow safe tools for execute_basic level', async () => {
    const result = await permissionsService.checkToolExecutionPermission(
      userId,
      'file_read'
    );
    expect(result.allowed).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Agent Execution with Permissions', () => {
  it('should prevent file_write for non-admin users', async () => {
    await expect(
      agentOrchestrator.executeTask({
        userId: basicUserId,
        taskDescription: 'Write a file',
      })
    ).rejects.toThrow('Permission denied');
  });
});
```

## Support

For permission-related issues:
1. Check subscription tier and status
2. Review API key scopes
3. Check execution limits and usage
4. Contact support for permission overrides or tier changes

---

**Last Updated:** 2025-12-15
**Version:** 1.0.0
**Maintainer:** Security Team
