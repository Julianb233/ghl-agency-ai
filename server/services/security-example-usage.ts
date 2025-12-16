/**
 * Security Features Example Usage
 * Demonstrates complete end-to-end workflow using all security features
 */

import { getCredentialVault } from './credentialVault.service';
import { getExecutionControl } from './executionControl.service';
import { getActionApproval } from './actionApproval.service';
import { getBrowserContextIsolation } from './browserContextIsolation.service';
import { getAgentOrchestrator } from './agentOrchestrator.service';

/**
 * EXAMPLE 1: Secure Credential Storage and Usage
 */
async function exampleCredentialVault() {
  console.log('\n=== Example 1: Credential Vault ===\n');

  const vault = getCredentialVault();
  const userId = 123;

  // Store GHL credentials
  const ghlCredId = await vault.storeCredential(userId, {
    name: "GoHighLevel Production",
    service: "ghl",
    type: "password",
    data: {
      username: "admin@agency.com",
      password: "secure_password_123",
    },
    metadata: {
      environment: "production",
      subaccount: "main",
    },
  });

  console.log(`Stored GHL credential with ID: ${ghlCredId}`);

  // Store AWS credentials
  const awsCredId = await vault.storeCredential(userId, {
    name: "AWS S3 Access",
    service: "aws",
    type: "api_key",
    data: {
      apiKey: "AKIAIOSFODNN7EXAMPLE",
    },
  });

  console.log(`Stored AWS credential with ID: ${awsCredId}`);

  // List user's credentials (no sensitive data returned)
  const credentials = await vault.listCredentials(userId);
  console.log('\nUser credentials:', credentials.map(c => ({
    id: c.id,
    name: c.name,
    service: c.service,
    type: c.type,
    lastUsed: c.lastUsedAt,
  })));

  // Retrieve credential (decrypted)
  const ghlCred = await vault.retrieveCredential(userId, ghlCredId);
  console.log('\nRetrieved GHL credential:');
  console.log('- Username:', ghlCred.data.username);
  console.log('- Password:', '[REDACTED - only available in code]');
  console.log('- Metadata:', ghlCred.metadata);

  // Delete credential
  await vault.deleteCredential(userId, awsCredId);
  console.log(`\nDeleted credential ${awsCredId} (soft delete - audit trail preserved)`);
}

/**
 * EXAMPLE 2: Execution Control - Pause, Resume, Cancel
 */
async function exampleExecutionControl() {
  console.log('\n=== Example 2: Execution Control ===\n');

  const control = getExecutionControl();
  const userId = 123;
  const executionId = 456;

  // Pause execution
  console.log('Pausing execution...');
  await control.pauseExecution(userId, executionId, "User needs to verify data");

  // Check status
  let status = await control.getControlStatus(userId, executionId);
  console.log('Status:', status.controlState); // 'paused'
  console.log('Reason:', status.stateReason);

  // Inject instruction while paused
  console.log('\nInjecting instruction...');
  await control.injectInstruction(
    userId,
    executionId,
    "Skip the email step and proceed directly to CRM update"
  );

  // Resume execution
  console.log('Resuming execution...');
  await control.resumeExecution(userId, executionId);

  status = await control.getControlStatus(userId, executionId);
  console.log('Status:', status.controlState); // 'running'
  console.log('Has injected instruction:', status.hasInjectedInstruction);

  // Cancel execution
  console.log('\nCancelling execution...');
  await control.cancelExecution(userId, executionId, "User changed requirements");

  status = await control.getControlStatus(userId, executionId);
  console.log('Final status:', status.controlState); // 'cancelled'
}

/**
 * EXAMPLE 3: Action Approval Workflow
 */
async function exampleActionApproval() {
  console.log('\n=== Example 3: Action Approval ===\n');

  const approval = getActionApproval();
  const userId = 123;
  const executionId = 456;

  // Request approval for high-risk action
  console.log('Requesting approval for delete operation...');
  const approvalId = await approval.requestApproval(
    userId,
    executionId,
    {
      actionType: "delete",
      actionDescription: "Delete 500 duplicate contacts from CRM",
      actionParams: {
        contactIds: Array.from({ length: 500 }, (_, i) => `contact_${i}`),
        permanent: true,
      },
      screenshotUrl: "https://example.com/screenshots/delete-preview.png",
    },
    5 // 5 minute timeout
  );

  console.log(`Approval requested (ID: ${approvalId})`);

  // Simulate user approving
  console.log('User approving action...');
  await approval.approveAction(userId, approvalId);

  // Wait for approval
  const approved = await approval.waitForApproval(approvalId);
  console.log('Approval decision:', approved ? 'APPROVED' : 'REJECTED');

  // Example: Request approval for critical action
  console.log('\nRequesting approval for critical shell command...');
  const criticalApprovalId = await approval.requestApproval(
    userId,
    executionId,
    {
      actionType: "shell_exec",
      actionDescription: "Execute database migration script",
      actionParams: {
        command: "npm run db:migrate",
      },
    },
    10 // 10 minute timeout
  );

  // List pending approvals
  const pending = await approval.getPendingApprovals(userId);
  console.log(`\nPending approvals: ${pending.length}`);
  pending.forEach(p => {
    console.log(`- ${p.actionType} (risk: ${p.riskLevel})`);
    console.log(`  Expires in: ${Math.floor((p.expiresAt.getTime() - Date.now()) / 60000)} minutes`);
  });

  // Reject the critical action
  console.log('\nUser rejecting critical action...');
  await approval.rejectAction(userId, criticalApprovalId, "Too risky for production");
}

/**
 * EXAMPLE 4: Browser Context Isolation
 */
async function exampleBrowserContextIsolation() {
  console.log('\n=== Example 4: Browser Context Isolation ===\n');

  const contextIsolation = getBrowserContextIsolation();
  const userId = 123;

  // Create contexts for different clients
  const client1Id = 1;
  const client2Id = 2;

  console.log('Creating isolated contexts for two clients...');

  const context1 = await contextIsolation.getOrCreateContext(
    userId,
    client1Id,
    "strict"
  );

  const context2 = await contextIsolation.getOrCreateContext(
    userId,
    client2Id,
    "strict"
  );

  console.log(`Client 1 context: ${context1.contextId}`);
  console.log(`Client 2 context: ${context2.contextId}`);

  // Create session for client 1
  console.log('\nCreating browser session for Client 1...');
  const session1 = await contextIsolation.createIsolatedSession(context1.contextId);
  console.log('Session created:', session1.sessionId);

  // Simulate saving browser state
  console.log('\nSaving Client 1 browser state...');
  await contextIsolation.saveContextStorage(context1.contextId, {
    cookies: [
      { name: 'session_token', value: 'abc123', domain: 'app.gohighlevel.com' },
    ],
    localStorage: {
      user_preferences: { theme: 'dark', language: 'en' },
    },
  });

  // Load browser state
  console.log('Loading Client 1 browser state...');
  const storage = await contextIsolation.loadContextStorage(context1.contextId);
  console.log('Loaded storage:', storage);

  // Session ended
  console.log('\nSession ended...');
  await contextIsolation.sessionEnded(context1.contextId);

  // Cleanup inactive contexts
  console.log('\nCleaning up inactive contexts...');
  const cleaned = await contextIsolation.cleanupInactiveContexts();
  console.log(`Cleaned up ${cleaned} inactive contexts`);
}

/**
 * EXAMPLE 5: Complete End-to-End Agent Execution with Security
 */
async function exampleCompleteAgentExecution() {
  console.log('\n=== Example 5: Complete Agent Execution with Security ===\n');

  const vault = getCredentialVault();
  const contextIsolation = getBrowserContextIsolation();
  const orchestrator = getAgentOrchestrator();

  const userId = 123;
  const clientId = 1;

  // Step 1: Store credentials
  console.log('Step 1: Storing GHL credentials...');
  const credentialId = await vault.storeCredential(userId, {
    name: "GHL Main Account",
    service: "ghl",
    type: "password",
    data: {
      username: "admin@agency.com",
      password: "secure_password",
    },
  });

  // Step 2: Create isolated browser context
  console.log('\nStep 2: Creating isolated browser context...');
  const context = await contextIsolation.getOrCreateContext(
    userId,
    clientId,
    "strict"
  );

  // Step 3: Execute agent task
  console.log('\nStep 3: Executing agent task with security...');
  const result = await orchestrator.executeTask({
    userId,
    taskDescription: `
      Login to GoHighLevel using secure credentials and create 10 test contacts.
      Use credential ID: ${credentialId}
      Use browser context: ${context.contextId}
    `,
    context: {
      credentialId,
      contextId: context.contextId,
    },
    maxIterations: 30,
    taskId: 1, // Link to existing task
  });

  console.log('\nAgent execution completed!');
  console.log('Status:', result.status);
  console.log('Iterations:', result.iterations);
  console.log('Duration:', result.duration, 'ms');
  console.log('Output:', result.output);

  // Agent automatically:
  // 1. Checked execution control before each iteration
  // 2. Requested approval for high-risk actions
  // 3. Used isolated browser context
  // 4. Retrieved credentials securely without exposing them
  // 5. Logged all security events to audit log
}

/**
 * EXAMPLE 6: Security Audit Log Review
 */
async function exampleAuditLogReview() {
  console.log('\n=== Example 6: Security Audit Log Review ===\n');

  // In a real implementation, you'd query the security_audit_log table
  // This is a simulated example

  const auditLogs = [
    {
      timestamp: new Date(),
      userId: 123,
      action: 'credential_create',
      resourceType: 'credential',
      resourceId: 1,
      details: { service: 'ghl' },
      success: true,
    },
    {
      timestamp: new Date(),
      userId: 123,
      action: 'credential_access',
      resourceType: 'credential',
      resourceId: 1,
      details: { service: 'ghl' },
      success: true,
    },
    {
      timestamp: new Date(),
      userId: 123,
      action: 'approval_request',
      resourceType: 'approval',
      resourceId: 5,
      details: { actionType: 'delete', riskLevel: 'high' },
      success: true,
    },
    {
      timestamp: new Date(),
      userId: 123,
      action: 'approval_approve',
      resourceType: 'approval',
      resourceId: 5,
      details: { actionType: 'delete' },
      success: true,
    },
  ];

  console.log('Recent security events:');
  auditLogs.forEach((log, i) => {
    console.log(`\n[${i + 1}] ${log.action}`);
    console.log(`    Time: ${log.timestamp.toISOString()}`);
    console.log(`    User: ${log.userId}`);
    console.log(`    Resource: ${log.resourceType} #${log.resourceId}`);
    console.log(`    Details:`, log.details);
    console.log(`    Success: ${log.success}`);
  });

  console.log('\nAudit log provides complete trail for:');
  console.log('- Compliance (GDPR, HIPAA, SOC 2)');
  console.log('- Security investigations');
  console.log('- User activity monitoring');
  console.log('- Anomaly detection');
}

/**
 * EXAMPLE 7: Error Handling and Security
 */
async function exampleErrorHandling() {
  console.log('\n=== Example 7: Error Handling and Security ===\n');

  const vault = getCredentialVault();

  try {
    // Try to access credential from different user
    console.log('Attempting unauthorized credential access...');
    await vault.retrieveCredential(999, 1); // Wrong user
  } catch (error) {
    console.log('ERROR (expected):', error instanceof Error ? error.message : String(error));
    console.log('Security: User 999 cannot access User 123\'s credentials');
  }

  try {
    // Try to decrypt with wrong key (simulated)
    console.log('\nAttempting decryption with corrupted data...');
    // This would fail in real scenario with actual corrupted data
    console.log('Security: Decryption would fail, protecting against tampering');
  } catch (error) {
    console.log('ERROR:', error instanceof Error ? error.message : String(error));
  }

  // All errors are logged to audit log with details
  console.log('\nAll security errors are:');
  console.log('- Logged to security_audit_log');
  console.log('- Redacted of sensitive information');
  console.log('- Monitored for anomalies');
  console.log('- Alerted if critical');
}

/**
 * EXAMPLE 8: Production Best Practices
 */
async function exampleProductionBestPractices() {
  console.log('\n=== Example 8: Production Best Practices ===\n');

  console.log('Production Deployment Checklist:');
  console.log('\n1. Secrets Management:');
  console.log('   - Store CREDENTIAL_ENCRYPTION_KEY in AWS Secrets Manager');
  console.log('   - Rotate keys quarterly');
  console.log('   - Use IAM roles for access control');

  console.log('\n2. Monitoring:');
  console.log('   - Set up CloudWatch alerts for failed decryption');
  console.log('   - Monitor approval rejection rates');
  console.log('   - Track credential access patterns');

  console.log('\n3. Scheduled Jobs:');
  console.log('   - Daily: Clean up inactive browser contexts');
  console.log('   - Weekly: Archive old audit logs');
  console.log('   - Monthly: Review security metrics');

  console.log('\n4. Disaster Recovery:');
  console.log('   - Backup encryption keys securely');
  console.log('   - Document key recovery procedures');
  console.log('   - Test restore process regularly');

  console.log('\n5. Compliance:');
  console.log('   - Maintain audit logs for required retention period');
  console.log('   - Implement data deletion procedures (GDPR)');
  console.log('   - Conduct regular security audits');
}

/**
 * Main execution - run all examples
 */
async function runAllExamples() {
  try {
    await exampleCredentialVault();
    await exampleExecutionControl();
    await exampleActionApproval();
    await exampleBrowserContextIsolation();
    await exampleCompleteAgentExecution();
    await exampleAuditLogReview();
    await exampleErrorHandling();
    await exampleProductionBestPractices();

    console.log('\n\n=== All Examples Completed ===\n');
  } catch (error) {
    console.error('\nExample failed:', error);
  }
}

// Export examples for individual testing
export {
  exampleCredentialVault,
  exampleExecutionControl,
  exampleActionApproval,
  exampleBrowserContextIsolation,
  exampleCompleteAgentExecution,
  exampleAuditLogReview,
  exampleErrorHandling,
  exampleProductionBestPractices,
  runAllExamples,
};

// Run all examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
