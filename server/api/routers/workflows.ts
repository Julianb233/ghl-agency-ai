import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { Stagehand } from "@browserbasehq/stagehand";
import { getBrowserbaseService } from "../../_core/browserbase";
import { TRPCError } from "@trpc/server";

import { automationWorkflows, workflowExecutions, browserSessions } from "../../../drizzle/schema";

/**
 * Resolve the correct LLM API key for a given model name.
 * Shared with aiRouter semantics: Anthropic (Claude), Google (Gemini), OpenAI.
 */
const resolveModelApiKey = (modelName: string): string => {
    const isGoogleModel = modelName.includes("google") || modelName.includes("gemini");
    const isAnthropicModel = modelName.includes("anthropic") || modelName.includes("claude");

    let modelApiKey: string | undefined;
    if (isAnthropicModel) {
        modelApiKey = process.env.ANTHROPIC_API_KEY;
    } else if (isGoogleModel) {
        modelApiKey = process.env.GEMINI_API_KEY;
    } else {
        modelApiKey = process.env.OPENAI_API_KEY;
    }

    if (!modelApiKey) {
        const keyName = isAnthropicModel
            ? "ANTHROPIC_API_KEY"
            : isGoogleModel
            ? "GEMINI_API_KEY"
            : "OPENAI_API_KEY";
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Missing API key for model ${modelName}. Please set ${keyName} in your environment.`,
        });
    }

    return modelApiKey;
};

// PLACEHOLDER: Define Zod schemas for validation
const workflowStepSchema = z.object({
    type: z.enum(["navigate", "act", "observe", "extract", "wait", "condition"]),
    order: z.number().int().min(0),
    config: z.object({
        // Navigation step
        url: z.string().url().optional(),

        // Action step (act)
        instruction: z.string().optional(),

        // Observation step (observe)
        observeInstruction: z.string().optional(),

        // Extraction step (extract)
        extractInstruction: z.string().optional(),
        schemaType: z.enum(["contactInfo", "productInfo", "custom"]).optional(),

        // Wait step
        waitMs: z.number().int().min(0).max(60000).optional(), // Max 60 seconds

        // Condition step
        condition: z.string().optional(),

        // Common config
        modelName: z.string().optional(),
        continueOnError: z.boolean().default(false),
    }),
});

const createWorkflowSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    trigger: z.enum(["manual", "scheduled", "webhook", "event"]).default("manual"),
    steps: z.array(workflowStepSchema).min(1).max(50), // Limit to 50 steps
    geolocation: z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
    }).optional(),
});

const updateWorkflowSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    trigger: z.enum(["manual", "scheduled", "webhook", "event"]).optional(),
    status: z.enum(["active", "paused", "archived"]).optional(),
    steps: z.array(workflowStepSchema).min(1).max(50).optional(),
});

export const workflowsRouter = router({
    /**
     * Create a new workflow
     * Creates workflow and associated steps in a transaction
     */
    create: protectedProcedure
        .input(createWorkflowSchema)
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            try {
                const [workflow] = await db
                    .insert(automationWorkflows)
                    .values({
                        userId,
                        name: input.name,
                        description: input.description,
                        steps: input.steps,
                        isActive: true,
                    })
                    .returning();

                return workflow;
            } catch (error) {
                console.error("Failed to create workflow:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to create workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * List all workflows for the authenticated user
     * Returns workflows with step count
     */
    list: protectedProcedure
        .input(
            z.object({
                status: z.enum(["active", "paused", "archived"]).optional(),
                limit: z.number().int().min(1).max(100).default(50),
                offset: z.number().int().min(0).default(0),
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            const params = input || { limit: 50, offset: 0 };

            try {
                const conditions = [eq(automationWorkflows.userId, userId)];
                if (params.status === "active") {
                    conditions.push(eq(automationWorkflows.isActive, true));
                } else if (params.status === "archived") {
                    conditions.push(eq(automationWorkflows.isActive, false));
                }

                const workflowList = await db
                    .select()
                    .from(automationWorkflows)
                    .where(and(...conditions))
                    .orderBy(desc(automationWorkflows.createdAt))
                    .limit(params.limit)
                    .offset(params.offset);

                return workflowList.map(wf => ({
                    ...wf,
                    stepCount: Array.isArray(wf.steps) ? wf.steps.length : 0,
                }));
            } catch (error) {
                console.error("Failed to list workflows:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to list workflows: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Get a single workflow by ID with all steps
     * Includes full workflow configuration
     */
    get: protectedProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            try {
                const [workflow] = await db
                    .select()
                    .from(automationWorkflows)
                    .where(and(
                        eq(automationWorkflows.id, input.id),
                        eq(automationWorkflows.userId, userId)
                    ))
                    .limit(1);

                if (!workflow) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Workflow not found",
                    });
                }

                return workflow;
            } catch (error) {
                console.error("Failed to get workflow:", error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to get workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Update an existing workflow
     * Can update metadata and steps
     */
    update: protectedProcedure
        .input(updateWorkflowSchema)
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            try {
                const [existing] = await db
                    .select()
                    .from(automationWorkflows)
                    .where(and(
                        eq(automationWorkflows.id, input.id),
                        eq(automationWorkflows.userId, userId)
                    ))
                    .limit(1);

                if (!existing) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Workflow not found",
                    });
                }

                const updateData: Partial<typeof automationWorkflows.$inferInsert> = {
                    updatedAt: new Date(),
                };
                if (input.name !== undefined) updateData.name = input.name;
                if (input.description !== undefined) updateData.description = input.description;
                if (input.status !== undefined) updateData.isActive = input.status === "active";
                if (input.steps !== undefined) updateData.steps = input.steps;

                const [updated] = await db
                    .update(automationWorkflows)
                    .set(updateData)
                    .where(eq(automationWorkflows.id, input.id))
                    .returning();

                return updated;
            } catch (error) {
                console.error("Failed to update workflow:", error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to update workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Delete a workflow and all associated steps and executions
     * Soft delete by setting status to 'archived'
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            try {
                const [existing] = await db
                    .select()
                    .from(automationWorkflows)
                    .where(and(
                        eq(automationWorkflows.id, input.id),
                        eq(automationWorkflows.userId, userId)
                    ))
                    .limit(1);

                if (!existing) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Workflow not found",
                    });
                }

                // Soft delete by setting isActive to false
                await db
                    .update(automationWorkflows)
                    .set({
                        isActive: false,
                        updatedAt: new Date(),
                    })
                    .where(eq(automationWorkflows.id, input.id));

                return { success: true, id: input.id };
            } catch (error) {
                console.error("Failed to delete workflow:", error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to delete workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Execute a workflow
     * Creates a browser session, runs all steps sequentially, stores execution results
     */
    execute: protectedProcedure
        .input(
            z.object({
                workflowId: z.number().int().positive(),
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                variables: z.record(z.string(), z.any()).optional(), // Dynamic variables for workflow
            })
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            let sessionId: string | undefined;
            let executionId: number | undefined;

            try {
                // Fetch workflow
                const [workflow] = await db
                    .select()
                    .from(automationWorkflows)
                    .where(and(
                        eq(automationWorkflows.id, input.workflowId),
                        eq(automationWorkflows.userId, userId)
                    ))
                    .limit(1);

                if (!workflow) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Workflow not found",
                    });
                }

                if (!workflow.isActive) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Workflow is not active",
                    });
                }

                const steps = workflow.steps as any[]; // Cast JSONB to array

                if (!Array.isArray(steps) || steps.length === 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Workflow has no steps",
                    });
                }

                // Create execution record
                const [execution] = await db
                    .insert(workflowExecutions)
                    .values({
                        workflowId: input.workflowId,
                        userId,
                        status: "running",
                        startedAt: new Date(),
                        input: input.variables,
                    })
                    .returning();

                executionId = execution.id;

                // Create Browserbase session
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                sessionId = session.id;
                console.log(`Workflow execution session created: ${session.url}`);

                // Update execution with sessionId
                await db
                    .update(workflowExecutions)
                    .set({ sessionId: session.id as any }) // Cast if type mismatch
                    .where(eq(workflowExecutions.id, executionId));

                // Initialize Stagehand
                const modelName = "google/gemini-2.0-flash";
                const modelApiKey = resolveModelApiKey(modelName);

                const stagehand = new Stagehand({
                    env: "BROWSERBASE",
                    verbose: 1,
                    disablePino: true,
                    modelApiKey,
                    apiKey: process.env.BROWSERBASE_API_KEY,
                    projectId: process.env.BROWSERBASE_PROJECT_ID,
                    browserbaseSessionCreateParams: {
                        projectId: process.env.BROWSERBASE_PROJECT_ID!,
                        proxies: true,
                        region: "us-west-2",
                        timeout: 3600,
                        keepAlive: true,
                        browserSettings: {
                            advancedStealth: false,
                            blockAds: true,
                            solveCaptchas: true,
                            recordSession: true,
                            viewport: { width: 1920, height: 1080 },
                        },
                        userMetadata: {
                            userId: `user-${userId}`,
                            workflowId: `workflow-${input.workflowId}`,
                            environment: process.env.NODE_ENV || "development",
                        },
                    },
                });

                await stagehand.init();
                const page = stagehand.context.pages()[0];

                // Execute workflow steps
                const stepResults: Array<{
                    stepId?: number;
                    type: string;
                    success: boolean;
                    result?: any;
                    error?: string;
                }> = [];

                for (const step of steps) {
                    const stepConfig = step.config;

                    try {
                        let result: any = null;

                        switch (step.type) {
                            case "navigate":
                                if (!stepConfig.url) {
                                    throw new Error("Navigate step requires URL");
                                }
                                await page.goto(stepConfig.url);
                                result = { url: stepConfig.url };
                                break;

                            case "act":
                                if (!stepConfig.instruction) {
                                    throw new Error("Act step requires instruction");
                                }
                                await stagehand.act(stepConfig.instruction);
                                result = { instruction: stepConfig.instruction };
                                break;

                            case "observe":
                                if (!stepConfig.observeInstruction) {
                                    throw new Error("Observe step requires instruction");
                                }
                                const actions = await stagehand.observe(stepConfig.observeInstruction);
                                result = { actions };
                                break;

                            case "extract":
                                if (!stepConfig.extractInstruction) {
                                    throw new Error("Extract step requires instruction");
                                }

                                let extractedData: any;
                                if (stepConfig.schemaType === "contactInfo") {
                                    extractedData = await stagehand.extract(
                                        stepConfig.extractInstruction,
                                        z.object({
                                            contactInfo: z.object({
                                                email: z.string().optional(),
                                                phone: z.string().optional(),
                                                address: z.string().optional(),
                                            })
                                        }) as any
                                    );
                                } else if (stepConfig.schemaType === "productInfo") {
                                    extractedData = await stagehand.extract(
                                        stepConfig.extractInstruction,
                                        z.object({
                                            productInfo: z.object({
                                                name: z.string().optional(),
                                                price: z.string().optional(),
                                                description: z.string().optional(),
                                                availability: z.string().optional(),
                                            })
                                        }) as any
                                    );
                                } else {
                                    extractedData = await stagehand.extract(stepConfig.extractInstruction);
                                }
                                result = extractedData;
                                break;

                            case "wait":
                                const waitTime = stepConfig.waitMs || 1000;
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                result = { waitedMs: waitTime };
                                break;

                            case "condition":
                                // PLACEHOLDER: Implement condition evaluation
                                result = { condition: stepConfig.condition, passed: true };
                                break;

                            default:
                                throw new Error(`Unknown step type: ${step.type}`);
                        }

                        stepResults.push({
                            type: step.type,
                            success: true,
                            result,
                        });

                    } catch (stepError) {
                        const errorMessage = stepError instanceof Error ? stepError.message : "Unknown error";

                        stepResults.push({
                            type: step.type,
                            success: false,
                            error: errorMessage,
                        });

                        // Stop execution if continueOnError is false
                        if (!stepConfig.continueOnError) {
                            throw new Error(`Step failed: ${errorMessage}`);
                        }
                    }
                }

                await stagehand.close();

                // Update execution record
                await db
                    .update(workflowExecutions)
                    .set({
                        status: "completed",
                        completedAt: new Date(),
                        output: stepResults,
                        stepResults: stepResults,
                    })
                    .where(eq(workflowExecutions.id, executionId));

                // Update workflow execution count
                await db
                    .update(automationWorkflows)
                    .set({
                        executionCount: (workflow.executionCount || 0) + 1,
                        lastExecutedAt: new Date(),
                    })
                    .where(eq(automationWorkflows.id, input.workflowId));

                return {
                    success: true,
                    workflowId: input.workflowId,
                    executionId: executionId,
                    sessionId,
                    sessionUrl: session.url,
                    stepsExecuted: stepResults.length,
                    stepResults,
                };

            } catch (error) {
                console.error("Workflow execution failed:", error);

                // Update execution record with error
                if (executionId) {
                    await db
                        .update(workflowExecutions)
                        .set({
                            status: "failed",
                            completedAt: new Date(),
                            error: error instanceof Error ? error.message : "Unknown error",
                        })
                        .where(eq(workflowExecutions.id, executionId));
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Workflow execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Get execution history for a workflow
     * Returns paginated list of executions with results
     */
    getExecutions: publicProcedure // PLACEHOLDER: Change to protectedProcedure when auth is implemented
        .input(
            z.object({
                workflowId: z.number().int().positive(),
                status: z.enum(["running", "completed", "failed"]).optional(),
                limit: z.number().int().min(1).max(100).default(20),
                offset: z.number().int().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            // PLACEHOLDER: Get userId from authenticated context
            // const userId = ctx.user.id;
            const userId = 1; // PLACEHOLDER: Replace with actual authenticated user ID

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not initialized",
                });
            }

            try {
                // PLACEHOLDER: Verify workflow ownership
                /*
                const [workflow] = await db
                    .select()
                    .from(workflows)
                    .where(and(
                        eq(workflows.id, input.workflowId),
                        eq(workflows.userId, userId)
                    ))
                    .limit(1);

                if (!workflow) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Workflow not found",
                    });
                }

                // Fetch executions
                const conditions = [eq(workflowExecutions.workflowId, input.workflowId)];
                if (input.status) {
                    conditions.push(eq(workflowExecutions.status, input.status));
                }

                const executions = await db
                    .select()
                    .from(workflowExecutions)
                    .where(and(...conditions))
                    .orderBy(desc(workflowExecutions.startedAt))
                    .limit(input.limit)
                    .offset(input.offset);

                return executions.map(execution => ({
                    ...execution,
                    result: execution.result ? JSON.parse(execution.result) : null,
                }));
                */

                // PLACEHOLDER: Return mock response
                return [
                    {
                        id: 1,
                        workflowId: input.workflowId,
                        sessionId: "mock-session-id",
                        status: "completed" as const,
                        startedAt: new Date(),
                        completedAt: new Date(),
                        result: {
                            stepsExecuted: 3,
                            success: true,
                        },
                        error: null,
                        _placeholder: "PLACEHOLDER: Add workflowExecutions table to drizzle/schema.ts",
                    },
                ];
            } catch (error) {
                console.error("Failed to get executions:", error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to get executions: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),
});
