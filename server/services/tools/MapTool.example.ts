/**
 * MapTool Usage Examples
 *
 * Demonstrates various usage patterns for the MapTool for parallel
 * function execution over collections in the GHL Agency AI platform.
 */

import { getMapTool, MapTool } from './MapTool';
import { getToolRegistry } from './ToolRegistry';
import type { ToolExecutionContext } from './types';

// ========================================
// SETUP
// ========================================

const mapTool = getMapTool();
const context: ToolExecutionContext = {
  userId: 1,
  sessionId: 'example-session',
  executionId: 1,
};

// ========================================
// EXAMPLE 1: BASIC PARALLEL MAP
// ========================================

async function example1_BasicParallelMap() {
  console.log('\n=== Example 1: Basic Parallel Map ===');

  // Register a custom function to process items
  mapTool.registerFunction('processContact', async (contactId: string, index: number) => {
    console.log(`Processing contact ${contactId} (${index + 1})`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      contactId,
      status: 'processed',
      timestamp: new Date().toISOString(),
    };
  });

  const contactIds = ['contact-1', 'contact-2', 'contact-3', 'contact-4', 'contact-5'];

  // Execute via the tool interface
  const result = await mapTool.execute(
    {
      action: 'map',
      items: contactIds,
      fn: 'processContact',
      options: JSON.stringify({
        concurrency: 3, // Process 3 at a time
        timeout: 5000,  // 5 second timeout per item
        retries: 2,     // Retry failed items twice
      }),
    },
    context
  );

  console.log('Result:', result);
  console.log('Success count:', result.metadata?.successCount);
  console.log('Failure count:', result.metadata?.failureCount);
}

// ========================================
// EXAMPLE 2: PROGRESS TRACKING
// ========================================

async function example2_ProgressTracking() {
  console.log('\n=== Example 2: Progress Tracking ===');

  mapTool.registerFunction('processWithDelay', async (item: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return item * 2;
  });

  const items = Array.from({ length: 10 }, (_, i) => i + 1);

  // Listen to progress events
  mapTool.on('progress', (progress) => {
    console.log(
      `Progress: ${progress.completed}/${progress.total} ` +
      `(${progress.percentComplete.toFixed(0)}%) - ` +
      `ETA: ${progress.estimatedTimeRemaining ? Math.round(progress.estimatedTimeRemaining / 1000) + 's' : 'calculating...'}`
    );
  });

  await mapTool.execute(
    {
      action: 'map',
      items,
      fn: 'processWithDelay',
      options: JSON.stringify({ concurrency: 3 }),
    },
    context
  );
}

// ========================================
// EXAMPLE 3: BATCHED PROCESSING
// ========================================

async function example3_BatchedProcessing() {
  console.log('\n=== Example 3: Batched Processing ===');

  // Useful for API endpoints with batch limits
  mapTool.registerFunction('bulkUpdate', async (opportunityId: string) => {
    console.log(`Updating opportunity: ${opportunityId}`);
    return { opportunityId, updated: true };
  });

  const opportunityIds = [
    'opp-1', 'opp-2', 'opp-3', 'opp-4', 'opp-5',
    'opp-6', 'opp-7', 'opp-8', 'opp-9', 'opp-10',
  ];

  const result = await mapTool.execute(
    {
      action: 'mapBatched',
      items: opportunityIds,
      fn: 'bulkUpdate',
      batchSize: 3, // Process in batches of 3
      options: JSON.stringify({ concurrency: 2 }), // 2 items per batch in parallel
    },
    context
  );

  console.log('Batched result:', result.metadata);
  console.log(`Processed ${result.metadata?.successCount} opportunities in ${result.metadata?.batchCount} batches`);
}

// ========================================
// EXAMPLE 4: SEQUENTIAL PROCESSING
// ========================================

async function example4_SequentialProcessing() {
  console.log('\n=== Example 4: Sequential Processing ===');

  // For operations that must be done in order
  mapTool.registerFunction('orderedWorkflowStep', async (step: string, index: number) => {
    console.log(`Executing step ${index + 1}: ${step}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { step, completed: true };
  });

  const workflowSteps = [
    'Validate contact',
    'Create opportunity',
    'Send welcome email',
    'Assign to pipeline',
    'Set follow-up task',
  ];

  const result = await mapTool.execute(
    {
      action: 'mapSequential',
      items: workflowSteps,
      fn: 'orderedWorkflowStep',
    },
    context
  );

  console.log('All workflow steps completed in order:', result.success);
}

// ========================================
// EXAMPLE 5: FILTER OPERATION
// ========================================

async function example5_FilterOperation() {
  console.log('\n=== Example 5: Filter Operation ===');

  // Filter items based on a predicate
  mapTool.registerFunction('isActiveContact', async (contact: { id: string; status: string }) => {
    // Simulate checking contact status
    await new Promise(resolve => setTimeout(resolve, 100));
    return contact.status === 'active';
  });

  const contacts = [
    { id: 'contact-1', status: 'active' },
    { id: 'contact-2', status: 'inactive' },
    { id: 'contact-3', status: 'active' },
    { id: 'contact-4', status: 'pending' },
    { id: 'contact-5', status: 'active' },
  ];

  const result = await mapTool.execute(
    {
      action: 'filter',
      items: contacts,
      predicate: 'isActiveContact',
      options: JSON.stringify({ concurrency: 3 }),
    },
    context
  );

  console.log('Active contacts:', result.data);
  console.log(`Filtered ${result.metadata?.filteredCount} from ${result.metadata?.originalCount} contacts`);
}

// ========================================
// EXAMPLE 6: REDUCE OPERATION
// ========================================

async function example6_ReduceOperation() {
  console.log('\n=== Example 6: Reduce Operation ===');

  // Aggregate data from multiple sources
  // Note: This function is used as a reducer, not a map function
  // We'll use it directly in reduce() rather than registering it
  const aggregateMetrics = async (
    acc: { totalRevenue: number; totalContacts: number },
    campaign: { revenue: number; contacts: number }
  ) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      totalRevenue: acc.totalRevenue + campaign.revenue,
      totalContacts: acc.totalContacts + campaign.contacts,
    };
  };

  const campaigns = [
    { revenue: 1000, contacts: 50 },
    { revenue: 2500, contacts: 120 },
    { revenue: 1800, contacts: 75 },
    { revenue: 3200, contacts: 150 },
  ];

  // Use reduce directly with the function
  const result = await mapTool.reduce(
    campaigns,
    aggregateMetrics,
    { totalRevenue: 0, totalContacts: 0 }
  );

  console.log('Aggregated metrics:', result.data);
}

// ========================================
// EXAMPLE 7: ERROR HANDLING & RETRIES
// ========================================

async function example7_ErrorHandlingRetries() {
  console.log('\n=== Example 7: Error Handling & Retries ===');

  let attemptCount = 0;

  // Simulates an unreliable operation that sometimes fails
  mapTool.registerFunction('unreliableOperation', async (item: string) => {
    attemptCount++;
    if (attemptCount % 3 === 0) {
      throw new Error(`Failed to process ${item}`);
    }
    return { item, processed: true };
  });

  const items = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];

  const result = await mapTool.execute(
    {
      action: 'map',
      items,
      fn: 'unreliableOperation',
      options: JSON.stringify({
        retries: 3,        // Retry up to 3 times
        retryDelay: 1000,  // Wait 1 second between retries
        stopOnError: false, // Continue processing other items on error
      }),
    },
    context
  );

  console.log('Results:', result.data);
  console.log(`Success: ${result.metadata?.successCount}, Failed: ${result.metadata?.failureCount}`);
}

// ========================================
// EXAMPLE 8: BROWSER AUTOMATION INTEGRATION
// ========================================

async function example8_BrowserAutomationIntegration() {
  console.log('\n=== Example 8: Browser Automation Integration ===');

  // Process multiple GHL pages in parallel
  mapTool.registerFunction('extractContactData', async (contactUrl: string) => {
    console.log(`Extracting data from: ${contactUrl}`);

    // Simulate browser navigation and data extraction
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      url: contactUrl,
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
      },
      extracted: true,
    };
  });

  const contactUrls = [
    'https://app.gohighlevel.com/contacts/contact-1',
    'https://app.gohighlevel.com/contacts/contact-2',
    'https://app.gohighlevel.com/contacts/contact-3',
    'https://app.gohighlevel.com/contacts/contact-4',
  ];

  const result = await mapTool.execute(
    {
      action: 'map',
      items: contactUrls,
      fn: 'extractContactData',
      options: JSON.stringify({
        concurrency: 2,   // Only 2 browser tabs at a time
        timeout: 10000,   // 10 second timeout per extraction
        stopOnError: true, // Stop if any extraction fails
      }),
    },
    context
  );

  console.log('Extracted contact data:', result.data);
}

// ========================================
// EXAMPLE 9: USING TOOL REGISTRY
// ========================================

async function example9_UsingToolRegistry() {
  console.log('\n=== Example 9: Using Tool Registry ===');

  const registry = getToolRegistry();

  // Get map tool from registry
  const mapToolFromRegistry = registry.get('map');
  if (!mapToolFromRegistry) {
    console.error('Map tool not found in registry');
    return;
  }

  console.log('Map tool info:');
  console.log('- Name:', mapToolFromRegistry.name);
  console.log('- Category:', mapToolFromRegistry.category);
  console.log('- Enabled:', mapToolFromRegistry.enabled);

  // Execute via registry
  mapTool.registerFunction('simpleDouble', async (x: number) => x * 2);

  const result = await registry.execute(
    'map',
    {
      action: 'map',
      items: [1, 2, 3, 4, 5],
      fn: 'simpleDouble',
    },
    context
  );

  console.log('Result from registry:', result);
}

// ========================================
// EXAMPLE 10: DIRECT API USAGE (NO EXECUTE)
// ========================================

async function example10_DirectAPIUsage() {
  console.log('\n=== Example 10: Direct API Usage ===');

  // Use the MapTool API directly without execute()
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const mapResult = await mapTool.map(
    items,
    async (x) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return x * x;
    },
    {
      concurrency: 3,
      timeout: 5000,
      onProgress: (progress) => {
        console.log(`${progress.completed}/${progress.total} complete`);
      },
    }
  );

  console.log('Direct map result:', mapResult.results);
  console.log('Duration:', mapResult.duration, 'ms');

  // Filter directly
  const filterResult = await mapTool.filter(
    items,
    async (x) => x > 5,
    { concurrency: 5 }
  );

  console.log('Filtered items:', filterResult.data);

  // Reduce directly
  const reduceResult = await mapTool.reduce(
    items,
    async (acc, x) => acc + x,
    0
  );

  console.log('Sum of all items:', reduceResult.data);
}

// ========================================
// RUN ALL EXAMPLES
// ========================================

async function runAllExamples() {
  try {
    await example1_BasicParallelMap();
    await example2_ProgressTracking();
    await example3_BatchedProcessing();
    await example4_SequentialProcessing();
    await example5_FilterOperation();
    await example6_ReduceOperation();
    await example7_ErrorHandlingRetries();
    await example8_BrowserAutomationIntegration();
    await example9_UsingToolRegistry();
    await example10_DirectAPIUsage();

    console.log('\n=== All examples completed successfully! ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in other modules
export {
  example1_BasicParallelMap,
  example2_ProgressTracking,
  example3_BatchedProcessing,
  example4_SequentialProcessing,
  example5_FilterOperation,
  example6_ReduceOperation,
  example7_ErrorHandlingRetries,
  example8_BrowserAutomationIntegration,
  example9_UsingToolRegistry,
  example10_DirectAPIUsage,
  runAllExamples,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
