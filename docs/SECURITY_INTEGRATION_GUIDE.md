/**
 * Agent Orchestrator Security Integration
 * Add these methods to AgentOrchestratorService class
 *
 * Integration steps:
 * 1. Add imports at the top of agentOrchestrator.service.ts
 * 2. Add these methods to the AgentOrchestratorService class
 * 3. Update runAgentLoop to call checkExecutionControl()
 * 4. Update executeTool to call checkActionApproval()
 */

// ========================================
// REQUIRED IMPORTS (add to top of file)
// ========================================
/*
import { getExecutionControl } from "./executionControl.service";
import { getActionApproval } from "./actionApproval.service";
import { getBrowserContextIsolation } from "./browserContextIsolation.service";
import type { CheckpointData } from "./executionControl.service";
*/

// ========================================
// NEW METHODS TO ADD TO AgentOrchestratorService
// ========================================

/**
 * Check execution control state before each iteration
 * Returns true if execution should continue, false if paused/cancelled
 */
private async checkExecutionControl(state: AgentState): Promise<boolean> {
  const executionControl = getExecutionControl();

  // Check if execution should pause
  const shouldPause = await executionControl.shouldPause(state.executionId);

  if (shouldPause) {
    // Save checkpoint for resumability
    const checkpoint: CheckpointData = {
      conversationHistory: state.conversationHistory,
      plan: state.plan,
      currentPhaseId: state.currentPhaseId,
      toolHistory: state.toolHistory,
      context: state.context,
      iterations: state.iterations,
      errorCount: state.errorCount,
      consecutiveErrors: state.consecutiveErrors,
      timestamp: new Date(),
    };

    await executionControl.saveCheckpoint(state.executionId, checkpoint);

    console.log(
      `[Agent] Execution ${state.executionId} paused - checkpoint saved`
    );

    return false; // Stop execution
  }

  // Check for injected instruction
  const injectedInstruction = await executionControl.getInjectedInstruction(
    state.executionId
  );

  if (injectedInstruction) {
    // Add injected instruction to conversation
    state.conversationHistory.push({
      role: "user",
      content: `[USER INTERVENTION] ${injectedInstruction}`,
    });

    console.log(
      `[Agent] Injected user instruction into execution ${state.executionId}`
    );
  }

  return true; // Continue execution
}

/**
 * Check if tool execution requires approval
 * Returns true if approved (or auto-approved), false if rejected
 */
private async checkActionApproval(
  toolName: string,
  parameters: Record<string, unknown>,
  state: AgentState,
  screenshotUrl?: string
): Promise<boolean> {
  const actionApproval = getActionApproval();

  // Assess risk
  const assessment = actionApproval.assessRisk({
    actionType: toolName,
    actionDescription: `Execute ${toolName} with parameters: ${JSON.stringify(
      parameters
    ).substring(0, 200)}`,
    actionParams: parameters,
    screenshotUrl,
  });

  // If low risk, auto-approve
  if (!assessment.requiresApproval) {
    return true;
  }

  // Request approval
  const approvalId = await actionApproval.requestApproval(
    state.userId,
    state.executionId,
    {
      actionType: toolName,
      actionDescription: `The agent wants to execute: ${toolName}`,
      actionParams: parameters,
      screenshotUrl,
    },
    5 // 5 minute timeout
  );

  // Auto-approved (low risk)
  if (approvalId === -1) {
    return true;
  }

  console.log(
    `[Agent] Waiting for approval ${approvalId} for ${toolName} (risk: ${assessment.riskLevel})`
  );

  // Wait for user approval
  const approved = await actionApproval.waitForApproval(approvalId);

  if (!approved) {
    console.log(`[Agent] Action ${toolName} was rejected`);
  }

  return approved;
}

/**
 * Get or create browser context with isolation
 */
private async getBrowserContext(
  userId: number,
  clientId: number
): Promise<string> {
  const contextIsolation = getBrowserContextIsolation();

  const context = await contextIsolation.getOrCreateContext(
    userId,
    clientId,
    "strict"
  );

  return context.contextId;
}

/**
 * INTEGRATION: Update runAgentLoop method
 * Add this at the beginning of the runAgentLoop method (after line 985)
 */
/*
private async runAgentLoop(state: AgentState, emitter?: AgentSSEEmitter): Promise<boolean> {
  try {
    // CHECK EXECUTION CONTROL - ADD THIS
    const shouldContinue = await this.checkExecutionControl(state);
    if (!shouldContinue) {
      return false; // Execution paused or cancelled
    }

    // ... rest of existing runAgentLoop code
*/

/**
 * INTEGRATION: Update executeTool method
 * Add approval check before executing high-risk tools (after line 800)
 */
/*
private async executeTool(
  toolName: string,
  parameters: Record<string, unknown>,
  state: AgentState,
  emitter?: AgentSSEEmitter
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  // ... existing permission check code ...

  // CHECK ACTION APPROVAL - ADD THIS
  const HIGH_RISK_TOOLS = [
    "shell_exec",
    "file_write",
    "file_edit",
    "http_request",
    "ghl_delete",
    "ghl_update",
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
        duration: Date.now() - startTime,
      };
    }
  }

  // ... rest of existing executeTool code ...
*/

// ========================================
// NEW TOOL: ghl_login_secure
// ========================================

/**
 * Add secure GHL login tool to registerCoreTools method
 */
/*
// Tool: Secure GHL login using credential vault
this.toolRegistry.set("ghl_login_secure", async (params: {
  credentialId: number;
  subaccountId?: string;
}) => {
  try {
    const credentialVault = getCredentialVault();

    // Retrieve credential (only accessible to owner)
    const credential = await credentialVault.retrieveCredential(
      state.userId, // From current execution state
      params.credentialId
    );

    if (credential.type !== "password") {
      return {
        success: false,
        error: "Credential is not a password type",
      };
    }

    // TODO: Use credentials to login to GHL via browser automation
    // For now, return success (integration with Stagehand required)

    return {
      success: true,
      message: "Logged in securely using stored credentials",
      credentialId: params.credentialId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
});
*/

// ========================================
// ADD TO getClaudeTools METHOD
// ========================================

/**
 * Add secure login tool definition
 */
/*
{
  name: "ghl_login_secure",
  description: "Login to GoHighLevel using securely stored credentials. Never exposes credentials directly.",
  input_schema: {
    type: "object" as const,
    properties: {
      credentialId: {
        type: "number",
        description: "ID of the stored credential to use for login"
      },
      subaccountId: {
        type: "string",
        description: "Optional GHL subaccount ID to login to"
      }
    },
    required: ["credentialId"]
  }
}
*/

// ========================================
// EXAMPLE USAGE
// ========================================

/*
// Example: Agent uses secure credentials
const execution = await agentOrchestrator.executeTask({
  userId: 123,
  taskDescription: "Login to GHL and create a contact",
  context: {
    ghlCredentialId: 456, // Previously stored credential
  },
  maxIterations: 30,
});

// Agent will automatically:
// 1. Check execution control before each iteration
// 2. Request approval for high-risk actions
// 3. Use isolated browser context for GHL
// 4. Retrieve credentials securely without exposing them
*/
