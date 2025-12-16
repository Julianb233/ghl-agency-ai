# Security Features Quick Reference

Fast reference for security features in GHL Agency AI.

## Environment Setup

```bash
# Generate encryption key
openssl rand -hex 32

# Add to .env
CREDENTIAL_ENCRYPTION_KEY=<64-char-key>
```

## Credential Vault

```typescript
import { getCredentialVault } from './services/credentialVault.service';
const vault = getCredentialVault();

// Store
const id = await vault.storeCredential(userId, {
  name: "Gmail",
  service: "gmail",
  type: "password",
  data: { username: "user@example.com", password: "pass" }
});

// Retrieve
const cred = await vault.retrieveCredential(userId, id);

// List
const creds = await vault.listCredentials(userId);

// Delete
await vault.deleteCredential(userId, id);
```

## Execution Control

```typescript
import { getExecutionControl } from './services/executionControl.service';
const control = getExecutionControl();

// Pause
await control.pauseExecution(userId, executionId, "reason");

// Resume
await control.resumeExecution(userId, executionId);

// Cancel
await control.cancelExecution(userId, executionId, "reason");

// Inject instruction
await control.injectInstruction(userId, executionId, "instruction");

// Get status
const status = await control.getControlStatus(userId, executionId);
```

## Action Approval

```typescript
import { getActionApproval } from './services/actionApproval.service';
const approval = getActionApproval();

// Request approval (agent does automatically)
const approvalId = await approval.requestApproval(userId, executionId, {
  actionType: "delete",
  actionDescription: "Delete contacts",
  actionParams: { ids: [...] },
  screenshotUrl: "..."
}, 5); // timeout minutes

// Wait for decision
const approved = await approval.waitForApproval(approvalId);

// Approve
await approval.approveAction(userId, approvalId);

// Reject
await approval.rejectAction(userId, approvalId, "reason");

// List pending
const pending = await approval.getPendingApprovals(userId);
```

## Browser Context Isolation

```typescript
import { getBrowserContextIsolation } from './services/browserContextIsolation.service';
const contextIsolation = getBrowserContextIsolation();

// Get/create context
const context = await contextIsolation.getOrCreateContext(userId, clientId, "strict");

// Create session
const session = await contextIsolation.createIsolatedSession(context.contextId);

// Save storage
await contextIsolation.saveContextStorage(context.contextId, { cookies: [...] });

// Load storage
const storage = await contextIsolation.loadContextStorage(context.contextId);

// Cleanup
const cleaned = await contextIsolation.cleanupInactiveContexts();
```

## tRPC Endpoints

```typescript
// Credentials
await trpc.security.storeCredential.mutate({ name, service, type, data });
await trpc.security.getCredential.query({ credentialId });
await trpc.security.listCredentials.query({ service });
await trpc.security.deleteCredential.mutate({ credentialId });

// Execution Control
await trpc.security.pauseExecution.mutate({ executionId, reason });
await trpc.security.resumeExecution.mutate({ executionId });
await trpc.security.cancelExecution.mutate({ executionId, reason });
await trpc.security.injectInstruction.mutate({ executionId, instruction });
await trpc.security.getControlStatus.query({ executionId });

// Approvals
await trpc.security.listPendingApprovals.query();
await trpc.security.approveAction.mutate({ approvalId });
await trpc.security.rejectAction.mutate({ approvalId, reason });

// Browser Context
await trpc.security.getOrCreateContext.mutate({ clientId, isolationLevel });
await trpc.security.createIsolatedSession.mutate({ contextId, config });
```

## Agent Integration

```typescript
// In AgentOrchestratorService

// Check execution control before each iteration
private async runAgentLoop(state: AgentState): Promise<boolean> {
  const shouldContinue = await this.checkExecutionControl(state);
  if (!shouldContinue) return false;
  // ... continue
}

// Check approval before high-risk tools
private async executeTool(toolName: string, params: any, state: AgentState) {
  const HIGH_RISK = ["shell_exec", "file_write", "delete"];
  if (HIGH_RISK.includes(toolName)) {
    const approved = await this.checkActionApproval(toolName, params, state);
    if (!approved) return { success: false, error: "Rejected" };
  }
  // ... execute
}

// Secure login tool
this.toolRegistry.set("ghl_login_secure", async (params) => {
  const cred = await credentialVault.retrieveCredential(userId, params.credentialId);
  await browserSession.login(cred.data.username, cred.data.password);
});
```

## Frontend Components

```tsx
import { ActionPreviewList } from './components/agent/ActionPreview';

function Dashboard() {
  const { data: approvals } = trpc.security.listPendingApprovals.useQuery();
  const approve = trpc.security.approveAction.useMutation();
  const reject = trpc.security.rejectAction.useMutation();

  return (
    <ActionPreviewList
      approvals={approvals}
      onApprove={(id) => approve.mutate({ approvalId: id })}
      onReject={(id, reason) => reject.mutate({ approvalId: id, reason })}
    />
  );
}
```

## High-Risk Actions

Actions requiring approval:
- `delete` - Delete operations
- `purchase` - Financial transactions
- `send_email` - Send email/message
- `shell_exec` - Shell commands
- `file_write` - File operations
- `database_modify` - Database changes

Critical patterns triggering automatic approval:
- `DROP TABLE`
- `DELETE FROM`
- `rm -rf`
- `sudo`
- `--force`

## Risk Levels

- **Low** - Auto-approved (read operations)
- **Medium** - Requires approval (bulk operations)
- **High** - Requires approval + warning (delete)
- **Critical** - Requires approval + strong warning (destructive)

## Database Tables

```sql
credentials           -- Encrypted credential storage
execution_controls    -- Execution state management
action_approvals      -- High-risk action approvals
browser_contexts      -- Browser context isolation
security_audit_log    -- Security event audit trail
```

## Security Best Practices

1. **Never log credentials** - automatically redacted
2. **Use credential IDs** - pass IDs to tools, not credentials
3. **Set reasonable timeouts** - 5-10 minutes for approvals
4. **Default to reject** - safer than auto-approve
5. **One context per client** - strict tenant isolation
6. **Encrypt storage** - protect cookies and session data
7. **Monitor audit logs** - track security events
8. **Rotate keys regularly** - plan for key rotation

## Migration Steps

1. Generate encryption key: `openssl rand -hex 32`
2. Add to `.env`: `CREDENTIAL_ENCRYPTION_KEY=...`
3. Add schema: `export * from "./schema-security"` in `/drizzle/schema.ts`
4. Generate migration: `npm run db:generate`
5. Apply migration: `npm run db:migrate`
6. Register router: Add `security: securityRouter` to app router
7. Update agent orchestrator: Add security checks (see integration guide)
8. Integrate frontend: Add ActionPreview component to dashboard

## Testing

```bash
# Generate test key
openssl rand -hex 32

# Test credential vault
node -e "
const { getCredentialVault } = require('./services/credentialVault.service');
const vault = getCredentialVault();
const id = await vault.storeCredential(1, {
  name: 'Test',
  service: 'test',
  type: 'password',
  data: { password: 'secret' }
});
console.log('Credential ID:', id);
"
```

## Troubleshooting

**Encryption fails:**
```bash
# Verify key length (should be 64)
echo -n "$CREDENTIAL_ENCRYPTION_KEY" | wc -c

# Regenerate if wrong
openssl rand -hex 32
```

**Migration fails:**
```sql
-- Check existing tables
\dt

-- Drop if needed
DROP TABLE IF EXISTS credentials CASCADE;

-- Re-run migration
```

**Approvals not showing:**
```sql
-- Check pending approvals
SELECT * FROM action_approvals WHERE status = 'pending';

-- Check expiration
SELECT id, expires_at FROM action_approvals WHERE expires_at > NOW();
```

## File Locations

| Category | Path |
|----------|------|
| Schema | `/drizzle/schema-security.ts` |
| Credential Vault | `/server/services/credentialVault.service.ts` |
| Execution Control | `/server/services/executionControl.service.ts` |
| Action Approval | `/server/services/actionApproval.service.ts` |
| Browser Isolation | `/server/services/browserContextIsolation.service.ts` |
| Security Router | `/server/api/routers/security.ts` |
| ActionPreview UI | `/client/src/components/agent/ActionPreview.tsx` |
| Full Docs | `/server/services/SECURITY_IMPLEMENTATION.md` |
| Migration Guide | `/SECURITY_MIGRATION_GUIDE.md` |

## Production Checklist

- [ ] Encryption key in secrets manager
- [ ] Database migration applied
- [ ] Security router registered
- [ ] Agent orchestrator updated
- [ ] Frontend integrated
- [ ] Audit logging verified
- [ ] Monitoring configured
- [ ] Cleanup jobs scheduled
- [ ] Backup procedures documented
- [ ] Compliance review completed
