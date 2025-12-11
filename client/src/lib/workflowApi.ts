/**
 * Workflow API integration with database
 * Connects the workflow builder with the backend tRPC API
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types/workflow';

// PLACEHOLDER: Replace with actual tRPC client when available
// import { trpc } from '@/lib/trpc';

/**
 * Convert ReactFlow format to database format
 */
function workflowToDbFormat(workflow: Workflow) {
  return {
    name: workflow.name,
    description: workflow.description,
    category: workflow.category || 'custom',
    steps: workflow.nodes,
    edges: workflow.edges,
    version: workflow.version,
    isTemplate: workflow.isTemplate || false,
    tags: workflow.tags || [],
  };
}

/**
 * Convert database format to ReactFlow format
 */
function dbToWorkflowFormat(dbWorkflow: any): Workflow {
  return {
    id: dbWorkflow.id,
    userId: dbWorkflow.userId,
    name: dbWorkflow.name,
    description: dbWorkflow.description,
    category: dbWorkflow.category,
    nodes: dbWorkflow.steps || [],
    edges: dbWorkflow.edges || [],
    version: dbWorkflow.version || 1,
    isTemplate: dbWorkflow.isTemplate || false,
    tags: dbWorkflow.tags || [],
    variables: {},
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
  };
}

/**
 * Save workflow to database
 */
export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  try {
    // PLACEHOLDER: Replace with actual tRPC mutation
    // const result = await trpc.workflows.create.mutate(workflowToDbFormat(workflow));

    // For now, save to localStorage as fallback
    const workflows = await getAllWorkflows();
    const workflowId = workflow.id || Date.now();
    const savedWorkflow: Workflow = {
      ...workflow,
      id: workflowId,
      updatedAt: new Date(),
    };

    workflows[workflowId] = savedWorkflow;
    localStorage.setItem('workflows', JSON.stringify(workflows));

    console.log('[Workflow API] Saved workflow to localStorage:', savedWorkflow.name);
    return savedWorkflow;
  } catch (error) {
    console.error('[Workflow API] Failed to save workflow:', error);
    throw error;
  }
}

/**
 * Load workflow from database
 */
export async function loadWorkflow(workflowId: number): Promise<Workflow> {
  try {
    // PLACEHOLDER: Replace with actual tRPC query
    // const result = await trpc.workflows.get.query({ id: workflowId });
    // return dbToWorkflowFormat(result);

    // For now, load from localStorage
    const workflows = await getAllWorkflows();
    const workflow = workflows[workflowId];

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    console.log('[Workflow API] Loaded workflow from localStorage:', workflow.name);
    return workflow;
  } catch (error) {
    console.error('[Workflow API] Failed to load workflow:', error);
    throw error;
  }
}

/**
 * Get all workflows for current user
 */
export async function getAllWorkflows(): Promise<Record<number, Workflow>> {
  try {
    // PLACEHOLDER: Replace with actual tRPC query
    // const result = await trpc.workflows.list.query();
    // return result.reduce((acc, w) => ({ ...acc, [w.id]: dbToWorkflowFormat(w) }), {});

    // For now, load from localStorage
    const stored = localStorage.getItem('workflows');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[Workflow API] Failed to get workflows:', error);
    return {};
  }
}

/**
 * Delete workflow from database
 */
export async function deleteWorkflow(workflowId: number): Promise<void> {
  try {
    // PLACEHOLDER: Replace with actual tRPC mutation
    // await trpc.workflows.delete.mutate({ id: workflowId });

    // For now, delete from localStorage
    const workflows = await getAllWorkflows();
    delete workflows[workflowId];
    localStorage.setItem('workflows', JSON.stringify(workflows));

    console.log('[Workflow API] Deleted workflow from localStorage:', workflowId);
  } catch (error) {
    console.error('[Workflow API] Failed to delete workflow:', error);
    throw error;
  }
}

/**
 * Execute workflow
 */
export async function executeWorkflow(workflowId: number, variables?: Record<string, any>): Promise<any> {
  try {
    // PLACEHOLDER: Replace with actual tRPC mutation
    // const result = await trpc.workflows.execute.mutate({
    //   workflowId,
    //   variables,
    // });
    // return result;

    console.log('[Workflow API] Execute workflow (placeholder):', workflowId, variables);
    return {
      success: true,
      workflowId,
      message: 'Workflow execution is a placeholder - implement backend integration',
    };
  } catch (error) {
    console.error('[Workflow API] Failed to execute workflow:', error);
    throw error;
  }
}

/**
 * List workflow executions
 */
export async function getWorkflowExecutions(workflowId: number): Promise<any[]> {
  try {
    // PLACEHOLDER: Replace with actual tRPC query
    // const result = await trpc.workflows.getExecutions.query({ workflowId });
    // return result;

    console.log('[Workflow API] Get executions (placeholder):', workflowId);
    return [];
  } catch (error) {
    console.error('[Workflow API] Failed to get executions:', error);
    return [];
  }
}
