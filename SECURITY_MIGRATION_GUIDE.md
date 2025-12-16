# Security Features Migration Guide

Step-by-step guide to integrate security features into GHL Agency AI.

## Prerequisites

- PostgreSQL database access
- Node.js and npm installed
- Environment variables configured
- Drizzle ORM set up

---

## Step 1: Database Migration

### 1.1 Add Security Schema

The security schema is in `/drizzle/schema-security.ts`. You need to import it into your main schema file.

**Edit `/drizzle/schema.ts`:**

```typescript
// Add at the end of the file
export * from "./schema-security";
```

### 1.2 Generate Migration

```bash
# Generate Drizzle migration from schema changes
npm run db:generate

# This creates a new migration file in /drizzle/migrations/
```

### 1.3 Review Migration

Check the generated migration file to ensure it includes:

- `credentials` table
- `execution_controls` table
- `action_approvals` table
- `browser_contexts` table
- `security_audit_log` table

### 1.4 Apply Migration

```bash
# Apply migration to database
npm run db:migrate

# Or manually with psql
psql -U postgres -d your_database -f drizzle/migrations/XXXX_add_security_tables.sql
```

### 1.5 Verify Tables

```sql
-- Connect to your database
psql -U postgres -d your_database

-- Check tables exist
\dt

-- Should see:
-- credentials
-- execution_controls
-- action_approvals
-- browser_contexts
-- security_audit_log
```

---

## Step 2: Environment Configuration

### 2.1 Generate Encryption Key

```bash
# Generate a secure 256-bit (32 byte) encryption key
openssl rand -hex 32

# Example output:
# 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
```

### 2.2 Update .env File

```bash
# Add to .env (or .env.local)
CREDENTIAL_ENCRYPTION_KEY=<paste-your-64-character-key>

# Verify existing required variables
ANTHROPIC_API_KEY=<your-anthropic-key>
DATABASE_URL=postgresql://...

# Optional for browser automation
BROWSERBASE_API_KEY=<your-key>
BROWSERBASE_PROJECT_ID=<your-project>
```

### 2.3 Secure Key Storage (Production)

For production, use a secret manager instead of environment files:

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name credential-encryption-key \
  --secret-string "1a2b3c4d..."
```

**HashiCorp Vault:**
```bash
vault kv put secret/encryption-key value="1a2b3c4d..."
```

**Update code to fetch from secret manager:**
```typescript
// In credentialVault.service.ts
function getEncryptionKey(): Buffer {
  // Production: fetch from secret manager
  if (process.env.NODE_ENV === 'production') {
    const key = await fetchFromSecretsManager('credential-encryption-key');
    return Buffer.from(key, 'hex');
  }

  // Development: use env variable
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) throw new Error('CREDENTIAL_ENCRYPTION_KEY required');
  return Buffer.from(key, 'hex');
}
```

---

## Step 3: Register Security Router

### 3.1 Import Security Router

**Edit `/server/api/_core/root.ts` (or your main router file):**

```typescript
import { securityRouter } from "../routers/security";

export const appRouter = router({
  // ... existing routers
  agent: agentRouter,
  browser: browserRouter,

  // Add security router
  security: securityRouter,
});
```

### 3.2 Verify Router Registration

```bash
# Start dev server
npm run dev

# Check tRPC endpoint
curl http://localhost:3000/api/trpc/security.listCredentials
```

---

## Step 4: Update Agent Orchestrator

### 4.1 Add Security Imports

**Edit `/server/services/agentOrchestrator.service.ts`:**

```typescript
// Add imports at the top
import { getExecutionControl } from "./executionControl.service";
import { getActionApproval } from "./actionApproval.service";
import { getBrowserContextIsolation } from "./browserContextIsolation.service";
import { getCredentialVault } from "./credentialVault.service";
import type { CheckpointData } from "./executionControl.service";
```

### 4.2 Add Security Methods

Copy the methods from `/server/services/agentOrchestrator.security-integration.ts` into `AgentOrchestratorService` class:

```typescript
export class AgentOrchestratorService {
  // ... existing methods

  // ADD THESE METHODS:

  private async checkExecutionControl(state: AgentState): Promise<boolean> {
    // Copy from security-integration.ts
  }

  private async checkActionApproval(
    toolName: string,
    parameters: Record<string, unknown>,
    state: AgentState,
    screenshotUrl?: string
  ): Promise<boolean> {
    // Copy from security-integration.ts
  }

  private async getBrowserContext(
    userId: number,
    clientId: number
  ): Promise<string> {
    // Copy from security-integration.ts
  }
}
```

### 4.3 Update runAgentLoop

**Add execution control check at the beginning:**

```typescript
private async runAgentLoop(state: AgentState, emitter?: AgentSSEEmitter): Promise<boolean> {
  try {
    // ADD THIS CHECK
    const shouldContinue = await this.checkExecutionControl(state);
    if (!shouldContinue) {
      console.log(`[Agent] Execution ${state.executionId} paused or cancelled`);
      return false; // Stop execution
    }

    // ... rest of existing code
  }
}
```

### 4.4 Update executeTool

**Add approval check before tool execution:**

```typescript
private async executeTool(
  toolName: string,
  parameters: Record<string, unknown>,
  state: AgentState,
  emitter?: AgentSSEEmitter
): Promise<ToolExecutionResult> {
  // ... existing permission check code

  // ADD APPROVAL CHECK
  const HIGH_RISK_TOOLS = [
    "shell_exec",
    "file_write",
    "file_edit",
    "http_request",
  ];

  if (HIGH_RISK_TOOLS.includes(toolName)) {
    const approved = await this.checkActionApproval(
      toolName,
      parameters,
      state
    );

    if (!approved) {
      return {
        success: false,
        error: "Action rejected by user",
        duration: 0,
      };
    }
  }

  // ... rest of tool execution
}
```

### 4.5 Add Secure Login Tool

**In `registerCoreTools()` method:**

```typescript
private registerCoreTools(): void {
  // ... existing tools

  // ADD SECURE LOGIN TOOL
  this.toolRegistry.set("ghl_login_secure", async (params: {
    credentialId: number;
    subaccountId?: string;
  }, context: { userId: number }) => {
    try {
      const credentialVault = getCredentialVault();
      const credential = await credentialVault.retrieveCredential(
        context.userId,
        params.credentialId
      );

      if (credential.type !== "password") {
        return {
          success: false,
          error: "Credential is not a password type",
        };
      }

      // TODO: Integrate with browser automation
      // For now, just verify credential access works

      return {
        success: true,
        message: "Credentials retrieved securely",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  });
}
```

---

## Step 5: Frontend Integration

### 5.1 Add ActionPreview Component

The component is already created at:
`/client/src/components/agent/ActionPreview.tsx`

No changes needed unless you want to customize styling.

### 5.2 Update AgentDashboard

**Edit `/client/src/components/agent/AgentDashboard.tsx`:**

```typescript
import { ActionPreviewList } from './ActionPreview';
import { trpc } from '../../utils/trpc';

export function AgentDashboard() {
  const [selectedExecution, setSelectedExecution] = useState<number | null>(null);

  // Fetch pending approvals
  const { data: approvals, refetch: refetchApprovals } =
    trpc.security.listPendingApprovals.useQuery(undefined, {
      refetchInterval: 2000, // Poll every 2 seconds
    });

  // Mutation hooks
  const approveMutation = trpc.security.approveAction.useMutation({
    onSuccess: () => refetchApprovals(),
  });

  const rejectMutation = trpc.security.rejectAction.useMutation({
    onSuccess: () => refetchApprovals(),
  });

  const pauseMutation = trpc.security.pauseExecution.useMutation();
  const resumeMutation = trpc.security.resumeExecution.useMutation();
  const cancelMutation = trpc.security.cancelExecution.useMutation();

  return (
    <div className="space-y-6">
      {/* Existing dashboard content */}

      {/* Add Approval Section */}
      {approvals && approvals.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
          <ActionPreviewList
            approvals={approvals}
            onApprove={(id) => approveMutation.mutate({ approvalId: id })}
            onReject={(id, reason) => rejectMutation.mutate({ approvalId: id, reason })}
            loading={approveMutation.isLoading || rejectMutation.isLoading}
          />
        </div>
      )}

      {/* Add Control Buttons to Execution Viewer */}
      {selectedExecution && (
        <div className="flex gap-2">
          <Button
            onClick={() => pauseMutation.mutate({ executionId: selectedExecution })}
            variant="outline"
          >
            Pause
          </Button>
          <Button
            onClick={() => resumeMutation.mutate({ executionId: selectedExecution })}
            variant="outline"
          >
            Resume
          </Button>
          <Button
            onClick={() => cancelMutation.mutate({
              executionId: selectedExecution,
              reason: "User cancelled"
            })}
            variant="destructive"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 5.3 Add Credential Management UI (Optional)

Create a new component for managing credentials:

```typescript
// /client/src/components/settings/CredentialManager.tsx
import { trpc } from '../../utils/trpc';

export function CredentialManager() {
  const { data: credentials } = trpc.security.listCredentials.useQuery({});
  const storeMutation = trpc.security.storeCredential.useMutation();
  const deleteMutation = trpc.security.deleteCredential.useMutation();

  // ... UI for adding/viewing/deleting credentials
}
```

---

## Step 6: Testing

### 6.1 Test Credential Vault

```typescript
// In a test file or API route
import { getCredentialVault } from '@/server/services/credentialVault.service';

const vault = getCredentialVault();

// Store credential
const id = await vault.storeCredential(123, {
  name: "Test Credential",
  service: "test",
  type: "password",
  data: {
    username: "testuser",
    password: "testpass123",
  },
});

console.log("Stored credential ID:", id);

// Retrieve credential
const retrieved = await vault.retrieveCredential(123, id);
console.log("Retrieved:", retrieved.data.password); // "testpass123"

// List credentials
const list = await vault.listCredentials(123);
console.log("Credentials:", list); // Does NOT include passwords

// Delete credential
await vault.deleteCredential(123, id);
console.log("Deleted successfully");
```

### 6.2 Test Execution Control

```bash
# Start agent execution
curl -X POST http://localhost:3000/api/trpc/agent.executeTask \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "Test task", "taskId": 1}'

# Get execution ID from response, then:

# Pause execution
curl -X POST http://localhost:3000/api/trpc/security.pauseExecution \
  -d '{"executionId": 123, "reason": "Testing pause"}'

# Resume execution
curl -X POST http://localhost:3000/api/trpc/security.resumeExecution \
  -d '{"executionId": 123}'

# Cancel execution
curl -X POST http://localhost:3000/api/trpc/security.cancelExecution \
  -d '{"executionId": 123, "reason": "Test cancel"}'
```

### 6.3 Test Action Approval

```typescript
// Trigger high-risk action
// Agent will automatically request approval when it tries to execute:
// - shell_exec
// - file_write
// - delete operations
// - etc.

// Check pending approvals in UI or via API
const approvals = await trpc.security.listPendingApprovals.query();

// Approve or reject
await trpc.security.approveAction.mutate({ approvalId: approvals[0].approvalId });
```

---

## Step 7: Production Deployment

### 7.1 Environment Variables

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://prod-db-url
CREDENTIAL_ENCRYPTION_KEY=<fetch-from-secrets-manager>
ANTHROPIC_API_KEY=<fetch-from-secrets-manager>
```

### 7.2 Database Backup

```bash
# Backup before migration
pg_dump -U postgres your_database > backup_before_security.sql

# Apply migration
npm run db:migrate

# Verify
psql -U postgres your_database -c "\dt"
```

### 7.3 Monitoring

Set up alerts for:

- Failed credential decryption attempts
- Rejected high-risk actions
- Cancelled executions
- Audit log anomalies

```typescript
// Example: Alert on failed decryption
try {
  const credential = await vault.retrieveCredential(userId, id);
} catch (error) {
  if (error.message.includes('decrypt')) {
    await alertService.send({
      level: 'critical',
      message: 'Credential decryption failed',
      userId,
      credentialId: id,
    });
  }
}
```

### 7.4 Scheduled Jobs

Add cron jobs for cleanup:

```typescript
// Clean up inactive browser contexts (daily)
cron.schedule('0 2 * * *', async () => {
  const contextIsolation = getBrowserContextIsolation();
  const cleaned = await contextIsolation.cleanupInactiveContexts();
  console.log(`Cleaned up ${cleaned} inactive contexts`);
});

// Archive old audit logs (weekly)
cron.schedule('0 3 * * 0', async () => {
  // Archive logs older than 90 days
  await archiveOldAuditLogs(90);
});
```

---

## Step 8: Verification Checklist

- [ ] Database migration applied successfully
- [ ] Encryption key generated and stored securely
- [ ] Security router registered and accessible
- [ ] Agent orchestrator updated with security checks
- [ ] Credential vault tested (store/retrieve/delete)
- [ ] Execution control tested (pause/resume/cancel)
- [ ] Action approval workflow tested
- [ ] Frontend components integrated
- [ ] Audit logging verified
- [ ] Production monitoring configured
- [ ] Backup and recovery plan documented

---

## Troubleshooting

### Migration Fails

```bash
# Check current schema
psql -U postgres your_database -c "\d credentials"

# If table exists, drop and recreate
psql -U postgres your_database -c "DROP TABLE IF EXISTS credentials CASCADE"

# Re-run migration
npm run db:migrate
```

### Encryption Key Issues

```bash
# Verify key length
echo -n "your-key" | wc -c  # Should be 64

# Regenerate if needed
openssl rand -hex 32
```

### tRPC Endpoint Not Found

```bash
# Check router registration
# /server/api/_core/root.ts should include:
security: securityRouter,

# Restart server
npm run dev
```

### Frontend Component Errors

```bash
# Check imports
# ActionPreview should import from components/ui
# Verify Shadcn UI components are installed

npx shadcn-ui@latest add button card badge textarea alert
```

---

## Next Steps

1. **Customize Risk Assessment**: Update `actionApproval.service.ts` with your specific high-risk patterns
2. **Add More Secure Tools**: Create additional tools that use credential vault
3. **Implement Screenshot Capture**: Integrate with browser automation to capture screenshots
4. **Set Up Compliance Reporting**: Create reports for GDPR/HIPAA compliance
5. **Add User Permissions**: Extend with role-based access control

---

## Support

For issues or questions:

1. Check `/server/services/SECURITY_IMPLEMENTATION.md` for detailed documentation
2. Review test files for usage examples
3. Check security audit logs for error details
4. Consult Drizzle ORM docs for database issues

---

## Security Notes

- **Never commit encryption keys** to version control
- **Rotate keys regularly** in production
- **Monitor audit logs** for suspicious activity
- **Test disaster recovery** procedures
- **Keep dependencies updated** for security patches
