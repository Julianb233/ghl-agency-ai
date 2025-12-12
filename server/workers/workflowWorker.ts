/**
 * Workflow Worker
 * Processes workflow execution background jobs using BullMQ
 */

import { Worker, Job } from "bullmq";
import { JobType, WorkflowExecutionJobData } from "../_core/queue";
import { getRedisConnection } from "./utils";
import { executeWorkflow } from "../services/workflowExecution.service";
import type { ExecuteWorkflowOptions } from "../services/workflowExecution.service";

/**
 * Process WORKFLOW_EXECUTION jobs
 * Executes automated workflows with browser automation steps
 */
async function processWorkflowExecution(job: Job<WorkflowExecutionJobData>) {
    const { userId, workflowId, triggerId, context = {} } = job.data;
    const startTime = Date.now();

    console.log(`[Workflow Worker] Processing workflow execution`);
    console.log(`[Workflow Worker] User ID: ${userId}`);
    console.log(`[Workflow Worker] Workflow ID: ${workflowId}`);
    console.log(`[Workflow Worker] Trigger: ${triggerId || "manual"}`);

    // Initial progress - job received
    await job.updateProgress(5);

    // Parse string IDs to numbers (job data uses strings, service uses numbers)
    const userIdNum = parseInt(userId, 10);
    const workflowIdNum = parseInt(workflowId, 10);

    if (isNaN(userIdNum)) {
        throw new Error(`Invalid userId: "${userId}" is not a valid number`);
    }
    if (isNaN(workflowIdNum)) {
        throw new Error(`Invalid workflowId: "${workflowId}" is not a valid number`);
    }

    // Map job data to service options
    const options: ExecuteWorkflowOptions = {
        workflowId: workflowIdNum,
        userId: userIdNum,
        variables: context,
        // Extract geolocation from context if provided
        geolocation: context.geolocation as ExecuteWorkflowOptions["geolocation"],
    };

    // Progress - starting execution
    await job.updateProgress(10);

    // Execute the workflow using the service
    const result = await executeWorkflow(options);

    // Progress - execution complete
    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    const stepsCompleted = result.stepResults?.length || 0;

    console.log(`[Workflow Worker] Workflow execution completed`);
    console.log(`[Workflow Worker] Execution ID: ${result.executionId}`);
    console.log(`[Workflow Worker] Status: ${result.status}`);
    console.log(`[Workflow Worker] Steps completed: ${stepsCompleted}`);
    console.log(`[Workflow Worker] Duration: ${duration}ms`);

    return {
        success: result.status === "completed",
        workflowId: workflowIdNum,
        executionId: result.executionId,
        status: result.status,
        stepsCompleted,
        duration,
    };
}

/**
 * Create and configure the workflow worker
 */
export function createWorkflowWorker() {
    const worker = new Worker(
        "workflow",
        async (job) => {
            console.log(`[Workflow Worker] Processing ${job.name} job (ID: ${job.id})`);

            try {
                switch (job.name) {
                    case JobType.WORKFLOW_EXECUTION:
                        return await processWorkflowExecution(job as Job<WorkflowExecutionJobData>);

                    default:
                        throw new Error(`Unknown workflow job type: ${job.name}`);
                }
            } catch (error: any) {
                console.error(`[Workflow Worker] Job ${job.id} failed:`, error.message);
                throw error; // Re-throw to trigger BullMQ retry mechanism
            }
        },
        {
            connection: getRedisConnection(),
            concurrency: 3, // Reduced from 5 - browser sessions are resource-intensive
            limiter: {
                max: 10, // Max 10 jobs per duration
                duration: 1000, // Per second
            },
        }
    );

    console.log("[Workflow Worker] Worker initialized");
    return worker;
}
