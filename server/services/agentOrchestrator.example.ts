/**
 * Agent Orchestrator Example Usage
 * Demonstrates how to use the agent orchestrator service
 */

import { executeAgentTask, getAgentOrchestrator } from './agentOrchestrator.service';

/**
 * Example 1: Simple Task Execution
 */
async function example1_simpleTask() {
  console.log('\n=== Example 1: Simple Task ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: "Calculate the sum of all prime numbers between 1 and 100",
    maxIterations: 20
  });

  console.log('Status:', result.status);
  console.log('Iterations:', result.iterations);
  console.log('Duration:', result.duration, 'ms');
  console.log('Output:', result.output);
  console.log('Plan:', JSON.stringify(result.plan, null, 2));
}

/**
 * Example 2: Research Task with Data Storage
 */
async function example2_researchTask() {
  console.log('\n=== Example 2: Research Task ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: `
      Research and compile information about the top 3 CRM software platforms.
      For each platform, include:
      - Company name and website
      - Key features
      - Pricing model
      - Target market

      Store the results in a structured format.
    `,
    context: {
      industry: "SaaS",
      category: "CRM"
    },
    maxIterations: 40
  });

  console.log('Status:', result.status);
  console.log('Iterations:', result.iterations);
  console.log('Phases completed:', result.plan?.phases.filter(p => p.status === 'completed').length);
  console.log('Total phases:', result.plan?.phases.length);

  // Access stored data
  console.log('\nStored Data Keys:', Object.keys(result.output));
}

/**
 * Example 3: API Integration Task
 */
async function example3_apiTask() {
  console.log('\n=== Example 3: API Integration ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: `
      Make an API request to https://api.github.com/repos/anthropics/anthropic-sdk-typescript
      and extract the following information:
      - Repository name
      - Description
      - Stars count
      - Last updated date
      - Primary language

      Store this information with the key "github_repo_info".
    `,
    maxIterations: 15
  });

  console.log('Status:', result.status);
  console.log('GitHub Repo Info:', result.output.github_repo_info);
}

/**
 * Example 4: Multi-Phase Task with Dependencies
 */
async function example4_multiPhaseTask() {
  console.log('\n=== Example 4: Multi-Phase Task ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: `
      Create a simple website audit report:

      Phase 1: Fetch the homepage HTML of https://example.com
      Phase 2: Analyze the HTML for common SEO elements (title, meta description, h1 tags)
      Phase 3: Check for accessibility issues (alt tags on images)
      Phase 4: Generate a summary report with recommendations

      Store the final report with key "audit_report".
    `,
    maxIterations: 35
  });

  console.log('Status:', result.status);
  console.log('Phases:', result.plan?.phases.map(p => ({
    name: p.name,
    status: p.status
  })));

  if (result.output.audit_report) {
    console.log('\nAudit Report:', result.output.audit_report);
  }
}

/**
 * Example 5: Error Recovery Demonstration
 */
async function example5_errorRecovery() {
  console.log('\n=== Example 5: Error Recovery ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: `
      Try to fetch data from https://invalid-domain-that-doesnt-exist-12345.com/api/data
      If that fails, fallback to using https://jsonplaceholder.typicode.com/posts/1 instead.
      Extract the data and store it.
    `,
    maxIterations: 20
  });

  console.log('Status:', result.status);
  console.log('Error Count:', result.toolHistory.filter(t => !t.success).length);
  console.log('Successful Tool Calls:', result.toolHistory.filter(t => t.success).length);

  // Show error recovery in action
  console.log('\nTool History:');
  result.toolHistory.forEach((tool, idx) => {
    console.log(`${idx + 1}. ${tool.toolName} - ${tool.success ? 'SUCCESS' : 'FAILED'}`);
    if (!tool.success) {
      console.log(`   Error: ${tool.error}`);
    }
  });
}

/**
 * Example 6: Check Execution Status
 */
async function example6_checkStatus() {
  console.log('\n=== Example 6: Check Execution Status ===\n');

  // First, start a task
  const result = await executeAgentTask({
    userId: 1,
    taskDescription: "List all months of the year with their number of days",
    maxIterations: 15
  });

  const executionId = result.executionId;
  console.log('Execution ID:', executionId);

  // Then check its status
  const orchestrator = getAgentOrchestrator();
  const status = await orchestrator.getExecutionStatus(executionId);

  console.log('Status from DB:', {
    id: status.id,
    status: status.status,
    stepsTotal: status.stepsTotal,
    stepsCompleted: status.stepsCompleted,
    startedAt: status.startedAt,
    completedAt: status.completedAt,
  });
}

/**
 * Example 7: Task with Context and Preferences
 */
async function example7_withContext() {
  console.log('\n=== Example 7: Task with Context ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: "Create a personalized workout plan for next week",
    context: {
      userPreferences: {
        fitnessLevel: "intermediate",
        goals: ["build muscle", "improve cardio"],
        availableDays: ["Monday", "Wednesday", "Friday"],
        equipmentAccess: ["dumbbells", "resistance bands"],
        timePerSession: "45 minutes"
      }
    },
    maxIterations: 25
  });

  console.log('Status:', result.status);
  console.log('Workout Plan:', result.output.workout_plan || result.output);
}

/**
 * Example 8: Task Linked to Agency Task ID
 */
async function example8_linkedTask() {
  console.log('\n=== Example 8: Linked Task ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskId: 999, // Would link to an existing task in agencyTasks table
    taskDescription: "Follow up with leads who haven't responded in 3 days",
    context: {
      leadListId: 123,
      emailTemplateId: 456,
      maxLeadsToContact: 10
    },
    maxIterations: 30
  });

  console.log('Status:', result.status);
  console.log('Execution ID:', result.executionId);
  console.log('Task ID:', 999);
  console.log('Leads Contacted:', result.output.leads_contacted || 0);
}

/**
 * Example 9: Task Requiring User Input
 */
async function example9_userInput() {
  console.log('\n=== Example 9: User Input Required ===\n');

  const result = await executeAgentTask({
    userId: 1,
    taskDescription: `
      Help me plan a vacation. I want to visit a warm destination in March.
      Ask me for my budget and preferences, then suggest 3 destinations.
    `,
    maxIterations: 20
  });

  console.log('Status:', result.status);

  if (result.status === 'needs_input') {
    // Find the ask_user tool call
    const askUserCall = result.toolHistory.find(t => t.toolName === 'ask_user');
    if (askUserCall?.result) {
      const askResult = askUserCall.result as any;
      console.log('\nAgent Question:', askResult.question);
      console.log('Context:', askResult.context);
    }
  }
}

/**
 * Main function to run examples
 */
async function main() {
  const exampleToRun = process.argv[2] || 'all';

  try {
    switch (exampleToRun) {
      case '1':
        await example1_simpleTask();
        break;
      case '2':
        await example2_researchTask();
        break;
      case '3':
        await example3_apiTask();
        break;
      case '4':
        await example4_multiPhaseTask();
        break;
      case '5':
        await example5_errorRecovery();
        break;
      case '6':
        await example6_checkStatus();
        break;
      case '7':
        await example7_withContext();
        break;
      case '8':
        await example8_linkedTask();
        break;
      case '9':
        await example9_userInput();
        break;
      case 'all':
        console.log('Running all examples...');
        await example1_simpleTask();
        await example2_researchTask();
        await example3_apiTask();
        await example4_multiPhaseTask();
        await example5_errorRecovery();
        await example6_checkStatus();
        await example7_withContext();
        await example8_linkedTask();
        await example9_userInput();
        break;
      default:
        console.log('Usage: tsx agentOrchestrator.example.ts [1-9|all]');
        console.log('Examples:');
        console.log('  1 - Simple task');
        console.log('  2 - Research task');
        console.log('  3 - API integration');
        console.log('  4 - Multi-phase task');
        console.log('  5 - Error recovery');
        console.log('  6 - Check status');
        console.log('  7 - With context');
        console.log('  8 - Linked task');
        console.log('  9 - User input');
        console.log('  all - Run all examples');
    }
  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1_simpleTask,
  example2_researchTask,
  example3_apiTask,
  example4_multiPhaseTask,
  example5_errorRecovery,
  example6_checkStatus,
  example7_withContext,
  example8_linkedTask,
  example9_userInput,
};
