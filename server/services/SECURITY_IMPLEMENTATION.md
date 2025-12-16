# Security & Control Implementation

Complete security infrastructure for the GHL Agency AI browser agent, implementing ChatGPT Operator and Manus AI-style security controls.

## Overview

This implementation adds five critical security layers:

1. **Credential Vault** - Encrypted credential storage with AES-256-GCM
2. **Execution Control** - Pause/resume/cancel agent executions
3. **Action Approval** - User approval for high-risk operations
4. **Browser Context Isolation** - Multi-tenant session sandboxing
5. **Security Audit Logging** - Comprehensive audit trail

---

## 1. Credential Vault

### Features

- **AES-256-GCM Encryption** at rest
- **Strict user isolation** - users can only access their own credentials
- **Automatic redaction** from logs and errors
- **Usage tracking** and audit logging
- **Soft delete** for audit trail preservation

### Database Schema

```sql
CREATE TABLE credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  service VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'password', 'api_key', 'oauth_token', 'ssh_key'
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  metadata JSONB,
  last_used_at TIMESTAMP,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Environment Configuration

```bash
# Generate encryption key (CRITICAL - store securely!)
openssl rand -hex 32

# Add to .env
CREDENTIAL_ENCRYPTION_KEY=<64-character-hex-key>
```

### API Usage

```typescript
import { getCredentialVault } from './services/credentialVault.service';

const vault = getCredentialVault();

// Store credential
const credentialId = await vault.storeCredential(userId, {
  name: "Gmail Account",
  service: "gmail",
  type: "password",
  data: {
    username: "user@example.com",
    password: "secret123",
  },
  metadata: {
    description: "Main business email",
  },
});

// Retrieve credential (decrypted)
const credential = await vault.retrieveCredential(userId, credentialId);
console.log(credential.data.password); // Only accessible to owner

// List credentials (no sensitive data)
const credentials = await vault.listCredentials(userId, "gmail");

// Delete credential (soft delete)
await vault.deleteCredential(userId, credentialId);
```

### tRPC Endpoints

```typescript
// Store
await trpc.security.storeCredential.mutate({
  name: "AWS Production",
  service: "aws",
  type: "api_key",
  data: { apiKey: "..." },
});

// Retrieve
const cred = await trpc.security.getCredential.query({ credentialId: 123 });

// List
const creds = await trpc.security.listCredentials.query({ service: "aws" });

// Delete
await trpc.security.deleteCredential.mutate({ credentialId: 123 });
```

### Agent Integration

```typescript
// Register secure login tool
this.toolRegistry.set("ghl_login_secure", async (params) => {
  const credential = await credentialVault.retrieveCredential(
    userId,
    params.credentialId
  );

  // Use credential for login (never logged or exposed)
  await browserSession.login(credential.data.username, credential.data.password);

  return { success: true };
});
```

---

## 2. Execution Control

### Features

- **Pause/Resume** executions mid-task
- **Cancel** with cleanup
- **Inject instructions** during execution
- **Checkpoint persistence** for resumability
- **State management** tracking

### Database Schema

```sql
CREATE TABLE execution_controls (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  control_state VARCHAR(20) NOT NULL, -- 'running', 'paused', 'cancelled', 'awaiting_approval'
  state_reason TEXT,
  injected_instruction TEXT,
  injected_at TIMESTAMP,
  checkpoint_data JSONB,
  last_state_change TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Usage

```typescript
import { getExecutionControl } from './services/executionControl.service';

const control = getExecutionControl();

// Pause execution
await control.pauseExecution(userId, executionId, "Need to check something");

// Resume execution
await control.resumeExecution(userId, executionId);

// Cancel execution
await control.cancelExecution(userId, executionId, "User cancelled");

// Inject instruction mid-execution
await control.injectInstruction(
  userId,
  executionId,
  "Skip the email step and proceed to next phase"
);

// Get control status
const status = await control.getControlStatus(userId, executionId);
console.log(status.controlState); // 'paused' | 'running' | etc.
```

### tRPC Endpoints

```typescript
// Pause
await trpc.security.pauseExecution.mutate({
  executionId: 123,
  reason: "Need approval",
});

// Resume
await trpc.security.resumeExecution.mutate({ executionId: 123 });

// Cancel
await trpc.security.cancelExecution.mutate({
  executionId: 123,
  reason: "User stopped",
});

// Inject instruction
await trpc.security.injectInstruction.mutate({
  executionId: 123,
  instruction: "Use a different approach",
});

// Get status
const status = await trpc.security.getControlStatus.query({ executionId: 123 });
```

### Agent Integration

```typescript
// In runAgentLoop, check control state before each iteration
private async runAgentLoop(state: AgentState): Promise<boolean> {
  // Check if execution should pause
  const shouldContinue = await this.checkExecutionControl(state);
  if (!shouldContinue) {
    return false; // Execution paused
  }

  // Check for injected instruction
  const injected = await control.getInjectedInstruction(state.executionId);
  if (injected) {
    state.conversationHistory.push({
      role: "user",
      content: `[USER] ${injected}`,
    });
  }

  // ... continue normal execution
}
```

---

## 3. Action Approval

### Features

- **Risk assessment** (low, medium, high, critical)
- **User approval workflow** with timeout
- **Screenshot capture** for context
- **Auto-reject** on timeout
- **Approval queue** management

### Database Schema

```sql
CREATE TABLE action_approvals (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT NOT NULL,
  action_params JSONB NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  risk_factors JSONB,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'timeout'
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  timeout_action VARCHAR(20) DEFAULT 'reject',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Risk Assessment Rules

```typescript
// High-risk actions requiring approval
const HIGH_RISK_ACTIONS = [
  "delete",
  "purchase",
  "payment",
  "send_email",
  "send_message",
  "shell_exec",
  "file_write",
  "database_modify",
];

// Critical patterns
const CRITICAL_PATTERNS = [
  /drop\s+table/i,
  /delete\s+from/i,
  /rm\s+-rf/i,
  /sudo/i,
  /--force/i,
];
```

### API Usage

```typescript
import { getActionApproval } from './services/actionApproval.service';

const approval = getActionApproval();

// Request approval
const approvalId = await approval.requestApproval(
  userId,
  executionId,
  {
    actionType: "delete",
    actionDescription: "Delete 500 contacts from CRM",
    actionParams: { contactIds: [...] },
    screenshotUrl: "https://...",
  },
  5 // timeout minutes
);

// Wait for approval
const approved = await approval.waitForApproval(approvalId);

// Approve action
await approval.approveAction(userId, approvalId);

// Reject action
await approval.rejectAction(userId, approvalId, "Too risky");

// Get pending approvals
const pending = await approval.getPendingApprovals(userId);
```

### tRPC Endpoints

```typescript
// List pending approvals
const approvals = await trpc.security.listPendingApprovals.query();

// Approve
await trpc.security.approveAction.mutate({ approvalId: 123 });

// Reject
await trpc.security.rejectAction.mutate({
  approvalId: 123,
  reason: "Not safe",
});
```

### Agent Integration

```typescript
// Before executing high-risk tools
private async executeTool(toolName: string, params: any, state: AgentState) {
  const HIGH_RISK_TOOLS = ["shell_exec", "file_write", "ghl_delete"];

  if (HIGH_RISK_TOOLS.includes(toolName)) {
    const approved = await this.checkActionApproval(toolName, params, state);

    if (!approved) {
      return {
        success: false,
        error: "Action rejected by user",
      };
    }
  }

  // Execute tool
  return await toolFunction(params);
}
```

### Frontend Component

```tsx
import { ActionPreview } from './components/agent/ActionPreview';

function ApprovalModal() {
  const { data: approvals } = trpc.security.listPendingApprovals.useQuery();
  const approveMutation = trpc.security.approveAction.useMutation();
  const rejectMutation = trpc.security.rejectAction.useMutation();

  return (
    <div>
      {approvals?.map(approval => (
        <ActionPreview
          key={approval.approvalId}
          approval={approval}
          onApprove={() => approveMutation.mutate({ approvalId: approval.approvalId })}
          onReject={(reason) => rejectMutation.mutate({ approvalId: approval.approvalId, reason })}
        />
      ))}
    </div>
  );
}
```

---

## 4. Browser Context Isolation

### Features

- **Per-client contexts** for multi-tenant isolation
- **Encrypted storage** persistence
- **Session sandboxing**
- **Context lifecycle** management
- **Automatic cleanup** of inactive contexts

### Database Schema

```sql
CREATE TABLE browser_contexts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  context_id VARCHAR(128) NOT NULL UNIQUE,
  isolation_level VARCHAR(20) DEFAULT 'strict',
  encrypted_storage TEXT,
  storage_iv TEXT,
  storage_auth_tag TEXT,
  metadata JSONB,
  active_session_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Usage

```typescript
import { getBrowserContextIsolation } from './services/browserContextIsolation.service';

const contextIsolation = getBrowserContextIsolation();

// Get or create context
const context = await contextIsolation.getOrCreateContext(userId, clientId, "strict");

// Create isolated session
const session = await contextIsolation.createIsolatedSession(context.contextId);

// Save context storage (cookies, localStorage)
await contextIsolation.saveContextStorage(context.contextId, {
  cookies: [...],
  localStorage: {...},
});

// Load context storage
const storage = await contextIsolation.loadContextStorage(context.contextId);

// Session ended (decrement count)
await contextIsolation.sessionEnded(context.contextId);

// Cleanup inactive contexts (run periodically)
const cleaned = await contextIsolation.cleanupInactiveContexts();
```

### tRPC Endpoints

```typescript
// Get or create context
const context = await trpc.security.getOrCreateContext.mutate({
  clientId: 123,
  isolationLevel: "strict",
});

// Create isolated session
const session = await trpc.security.createIsolatedSession.mutate({
  contextId: context.contextId,
});
```

### Browserbase Integration

```typescript
// Create Browserbase session with context isolation
async function createIsolatedBrowserSession(clientId: number) {
  const context = await contextIsolation.getOrCreateContext(userId, clientId);

  const session = await browserbaseSDK.createSession({
    browserSettings: {
      context: { id: context.contextId },
    },
  });

  return session;
}
```

---

## 5. Security Audit Logging

### Features

- **Comprehensive audit trail** for all sensitive operations
- **Credential access** tracking
- **Action approval** logging
- **Execution control** events
- **IP address** and user agent capture

### Database Schema

```sql
CREATE TABLE security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Logged Events

- `credential_create` - Credential stored
- `credential_access` - Credential retrieved
- `credential_delete` - Credential deleted
- `execution_pause` - Execution paused
- `execution_resume` - Execution resumed
- `execution_cancel` - Execution cancelled
- `instruction_inject` - Instruction injected
- `approval_request` - Approval requested
- `approval_approve` - Action approved
- `approval_reject` - Action rejected
- `context_create` - Browser context created

---

## Integration Checklist

### Database Migration

```bash
# Create migration
npm run db:generate

# Apply migration
npm run db:migrate
```

### Environment Variables

```bash
# Required
CREDENTIAL_ENCRYPTION_KEY=<64-char-hex>  # openssl rand -hex 32
ANTHROPIC_API_KEY=<your-key>

# Optional
BROWSERBASE_API_KEY=<your-key>
BROWSERBASE_PROJECT_ID=<your-project>
```

### Import Security Services

```typescript
// In your agent router or service
import { getCredentialVault } from '../services/credentialVault.service';
import { getExecutionControl } from '../services/executionControl.service';
import { getActionApproval } from '../services/actionApproval.service';
import { getBrowserContextIsolation } from '../services/browserContextIsolation.service';
```

### Update Agent Orchestrator

See `agentOrchestrator.security-integration.ts` for detailed integration steps:

1. Add imports
2. Add `checkExecutionControl()` method
3. Add `checkActionApproval()` method
4. Update `runAgentLoop()` to check control state
5. Update `executeTool()` to check approvals
6. Add `ghl_login_secure` tool

### Frontend Components

1. Import `ActionPreview` component
2. Add to AgentDashboard
3. Connect to tRPC endpoints
4. Add control buttons (pause/resume/cancel)

---

## Security Best Practices

### Credential Management

1. **Never log credentials** - all sensitive data is automatically redacted
2. **Use credential IDs** - pass credential IDs to tools, not actual credentials
3. **Rotate encryption keys** - plan for key rotation (requires re-encryption)
4. **Monitor usage** - track credential access in audit logs
5. **Expire old credentials** - implement TTL for unused credentials

### Execution Control

1. **Save checkpoints frequently** - enable resumability
2. **Timeout paused executions** - auto-cancel after extended pause
3. **Rate limit injections** - prevent instruction spam
4. **Validate state transitions** - enforce valid state changes

### Action Approval

1. **Set reasonable timeouts** - 5-10 minutes for most actions
2. **Capture screenshots** - provide visual context
3. **Explain risk factors** - help users make informed decisions
4. **Default to reject** - safer than auto-approve on timeout
5. **Log all decisions** - maintain approval audit trail

### Browser Isolation

1. **One context per client** - strict tenant isolation
2. **Encrypt storage** - protect cookies and session data
3. **Clean up regularly** - remove inactive contexts
4. **Monitor session count** - detect context leaks
5. **Expire old contexts** - 30-day TTL for unused contexts

---

## Testing

### Credential Vault

```typescript
// Test encryption/decryption
const vault = getCredentialVault();
const id = await vault.storeCredential(userId, {
  name: "Test",
  service: "test",
  type: "password",
  data: { password: "secret123" },
});

const retrieved = await vault.retrieveCredential(userId, id);
expect(retrieved.data.password).toBe("secret123");
```

### Execution Control

```typescript
// Test pause/resume
await control.pauseExecution(userId, executionId);
const status = await control.getControlStatus(userId, executionId);
expect(status.controlState).toBe("paused");

await control.resumeExecution(userId, executionId);
const resumed = await control.getControlStatus(userId, executionId);
expect(resumed.controlState).toBe("running");
```

### Action Approval

```typescript
// Test approval workflow
const approvalId = await approval.requestApproval(userId, executionId, {
  actionType: "delete",
  actionDescription: "Delete test data",
  actionParams: {},
});

await approval.approveAction(userId, approvalId);
const approved = await approval.waitForApproval(approvalId);
expect(approved).toBe(true);
```

---

## Troubleshooting

### Credential Decryption Fails

- Verify `CREDENTIAL_ENCRYPTION_KEY` is exactly 64 hex characters
- Check key hasn't changed since credentials were stored
- Ensure IV and authTag are correctly stored in database

### Execution Won't Resume

- Check `execution_controls` table for control state
- Verify checkpoint data is saved
- Check for cancelled or expired executions

### Approvals Not Showing

- Verify `action_approvals` status is 'pending'
- Check expiration time hasn't passed
- Ensure user owns the execution

### Context Isolation Issues

- Verify unique `context_id` per client
- Check `active_session_count` for leaks
- Ensure Browserbase context exists

---

## Production Deployment

1. **Secure encryption keys** - use AWS Secrets Manager, HashiCorp Vault, or similar
2. **Enable audit logging** - ensure all security events are logged
3. **Monitor failed approvals** - track rejected high-risk actions
4. **Set up alerts** - notify on critical security events
5. **Regular cleanup** - schedule context cleanup job
6. **Backup audit logs** - archive to separate secure storage
7. **Compliance review** - ensure meets GDPR, HIPAA, SOC 2 requirements

---

## File Reference

- **Services:**
  - `/server/services/credentialVault.service.ts`
  - `/server/services/executionControl.service.ts`
  - `/server/services/actionApproval.service.ts`
  - `/server/services/browserContextIsolation.service.ts`

- **Database Schema:**
  - `/drizzle/schema-security.ts`

- **API Router:**
  - `/server/api/routers/security.ts`

- **Frontend Components:**
  - `/client/src/components/agent/ActionPreview.tsx`

- **Integration Guide:**
  - `/server/services/agentOrchestrator.security-integration.ts`
