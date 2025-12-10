import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { Stagehand } from "@browserbasehq/stagehand";
import { TRPCError } from "@trpc/server";
import { browserbaseSDK } from "../../_core/browserbaseSDK";
import { sendProgress } from "../../_core/sse-manager";
import { getDb } from "../../db";
import { browserSessions, extractedData } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { persistentSessionManager } from "../../services/persistentSession.service";

const getBrowserbaseService = () => browserbaseSDK;

/**
 * Resolve the correct LLM API key for a given model name.
 * Supports Anthropic (Claude), Google (Gemini) and OpenAI models.
 * Throws a TRPCError if the corresponding API key is not configured.
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

export const aiRouter = router({
    /**
     * Start a Browserbase session explicitly
     * Returns the session ID and live view URL immediately
     */
    startSession: protectedProcedure
        .input(
            z.object({
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                console.log(`[startSession] Created session: ${session.id}`);

                // Get live view URLs immediately
                let liveViewUrl: string | undefined;
                let debuggerUrl: string | undefined;
                try {
                    const debugInfo = await browserbaseSDK.getSessionDebug(session.id);
                    liveViewUrl = debugInfo.debuggerFullscreenUrl;
                    debuggerUrl = debugInfo.debuggerUrl;
                } catch (debugError) {
                    console.error("Failed to get live view URL:", debugError);
                }

                return {
                    sessionId: session.id,
                    liveViewUrl,
                    debuggerUrl,
                };
            } catch (error) {
                console.error("Failed to start session:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Execute browser automation with AI agent
     * Supports geo-location and session tracking
     * Uses persistent sessions - automatically reuses existing active sessions
     */
    chat: protectedProcedure
        .input(
            z.object({
                messages: z.array(
                    z.object({
                        role: z.enum(["system", "user", "assistant"]),
                        content: z.string(),
                    })
                ),
                // Optional geo-location configuration
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                // Optional initial URL
                startUrl: z.string().url().optional(),
                // Model selection (default: claude-3-7-sonnet-latest)
                modelName: z.string().optional(),
                // Optional session ID to reuse specific session (if not provided, uses persistent session)
                sessionId: z.string().optional(),
                // Whether to keep the session open after execution (default: true for persistent sessions)
                keepOpen: z.boolean().optional().default(true),
                // Force create new session instead of reusing persistent session
                forceNewSession: z.boolean().optional().default(false),
            })
        )
        .mutation(async ({ input, ctx }) => {
            // Database is optional: used for logging only
            const db = await getDb();
            if (!db) {
                console.warn("[AI Router] Database not available - proceeding without session logging");
            }

            const lastMessage = input.messages[input.messages.length - 1];
            if (!lastMessage || lastMessage.role !== "user") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Last message must be from user",
                });
            }

            const prompt = lastMessage.content;
            const startUrl = input.startUrl || "https://google.com";
            const userId = ctx.user.id;

            console.log("[AI Router] Initializing browser session with persistent session support...");

            let sessionId: string | undefined;
            let liveViewUrl: string | undefined;
            let debuggerUrl: string | undefined;
            let stagehand: Stagehand;
            let isNewSession = false;

            try {
                // Normalize model name to the provider-prefixed format Stagehand expects
                let modelId = input.modelName || "claude-3-7-sonnet-latest";
                if (!modelId.includes("/")) {
                    if (modelId.includes("claude") || modelId.includes("anthropic")) {
                        modelId = `anthropic/${modelId}`;
                    } else if (modelId.includes("gemini") || modelId.includes("google")) {
                        modelId = `google/${modelId}`;
                    } else {
                        modelId = `openai/${modelId}`;
                    }
                }

                const modelApiKey = resolveModelApiKey(modelId);

                // Log config without secrets
                console.log("[AI Router] Stagehand model config", {
                    model: modelId,
                    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
                    hasGeminiKey: !!process.env.GEMINI_API_KEY,
                    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                    explicitSessionId: input.sessionId || null,
                    forceNewSession: input.forceNewSession,
                    userId,
                });

                // Use persistent session manager to get or create a session
                // This automatically handles session reuse across requests
                if (input.sessionId) {
                    // If explicit session ID provided, try to get that specific session
                    const existingSession = persistentSessionManager.getSession(input.sessionId);
                    if (existingSession) {
                        console.log(`[AI Router] Using explicitly provided session: ${input.sessionId}`);
                        stagehand = existingSession.stagehand;
                        sessionId = input.sessionId;
                        isNewSession = false;

                        // Update activity to extend session timeout
                        await persistentSessionManager.updateActivity(sessionId);
                    } else {
                        // Session not in memory, try to create new one with that ID
                        console.log(`[AI Router] Session ${input.sessionId} not found, creating new session`);
                        const persistentSession = await persistentSessionManager.getOrCreateSession(userId, {
                            modelName: modelId,
                            modelApiKey,
                            geolocation: input.geolocation,
                            timeout: 15 * 60 * 1000, // 15 minutes
                        });
                        stagehand = persistentSession.stagehand;
                        sessionId = persistentSession.sessionId;
                        liveViewUrl = persistentSession.liveViewUrl;
                        debuggerUrl = persistentSession.debugUrl;
                        isNewSession = persistentSession.isNew;
                    }
                } else if (input.forceNewSession) {
                    // Force create new session (close existing first)
                    console.log("[AI Router] Force creating new session");
                    await persistentSessionManager.closeUserSessions(userId);

                    const persistentSession = await persistentSessionManager.getOrCreateSession(userId, {
                        modelName: modelId,
                        modelApiKey,
                        geolocation: input.geolocation,
                        timeout: 15 * 60 * 1000,
                    });
                    stagehand = persistentSession.stagehand;
                    sessionId = persistentSession.sessionId;
                    liveViewUrl = persistentSession.liveViewUrl;
                    debuggerUrl = persistentSession.debugUrl;
                    isNewSession = persistentSession.isNew;
                } else {
                    // Use persistent session manager - automatically reuses or creates
                    console.log("[AI Router] Using persistent session manager");
                    const persistentSession = await persistentSessionManager.getOrCreateSession(userId, {
                        modelName: modelId,
                        modelApiKey,
                        geolocation: input.geolocation,
                        timeout: 15 * 60 * 1000, // 15 minutes
                    });
                    stagehand = persistentSession.stagehand;
                    sessionId = persistentSession.sessionId;
                    liveViewUrl = persistentSession.liveViewUrl;
                    debuggerUrl = persistentSession.debugUrl;
                    isNewSession = persistentSession.isNew;
                }

                console.log(`[AI Router] Using session: ${sessionId} (${isNewSession ? "NEW" : "REUSED"})`);

                // Send session created/reused event via SSE
                sendProgress(sessionId!, {
                    type: isNewSession ? 'session_created' : 'session_reused',
                    sessionId: sessionId!,
                    message: isNewSession ? 'Browser session created' : 'Reusing existing browser session'
                });

                // Get live view URLs if we don't have them yet
                if (!liveViewUrl || !debuggerUrl) {
                    try {
                        const debugInfo = await browserbaseSDK.getSessionDebug(sessionId!);
                        liveViewUrl = debugInfo.debuggerFullscreenUrl;
                        debuggerUrl = debugInfo.debuggerUrl;
                        console.log(`[AI Router] Live view available at: ${liveViewUrl}`);
                    } catch (debugError) {
                        console.error("[AI Router] Failed to get live view URL:", debugError);
                    }
                }

                // Send live view ready event
                if (liveViewUrl) {
                    sendProgress(sessionId!, {
                        type: 'live_view_ready',
                        sessionId: sessionId!,
                        data: {
                            liveViewUrl,
                            debuggerUrl,
                            sessionUrl: `https://www.browserbase.com/sessions/${sessionId}`,
                            isPersistent: true,
                            isReused: !isNewSession,
                        },
                        message: 'Live view ready - browser visible!'
                    });
                }

                // Get the first page from context
                const page = stagehand.context.pages()[0];

                // Determine if we need to navigate
                // Only navigate if:
                // 1. No session was provided (new session) OR
                // 2. Explicit navigation intent detected in prompt OR
                // 3. startUrl was provided
                const isReusingSession = !!input.sessionId;
                let shouldNavigate = !isReusingSession || !!input.startUrl;
                let targetUrl = input.startUrl;
                let modifiedPrompt = prompt;

                // Enhanced URL detection with better pattern matching
                const urlPatterns = [
                    // Full URLs with extensions
                    /(?:open|go to|navigate to|visit)\s+(?:the\s+)?(?:website\s+)?(?:at\s+)?(?:https?:\/\/)?([\w\-\.]+\.\w{2,})/i,
                    // Direct URLs with extensions
                    /(?:https?:\/\/)?([\w\-\.]+\.(?:com|org|net|io|co|app|dev))/i,
                    // Website names without extensions (e.g., "open gohighlevel")
                    /(?:open|go to|navigate to|visit)\s+(?:the\s+)?([\w\-]+)(?:\s+website|\s+site|\s+page)?/i,
                ];

                // Try to detect URL/website name in the prompt
                for (const pattern of urlPatterns) {
                    const match = prompt.match(pattern);
                    if (match) {
                        shouldNavigate = true;
                        let domain = match[1] || match[0];

                        // Clean up the domain
                        domain = domain.replace(/^(open|go to|navigate to|visit|the|website|site|page)\s+/gi, '').trim();
                        domain = domain.replace(/\s+(website|site|page)$/gi, '').trim();

                        // If no extension, add .com by default
                        if (!domain.includes('.') && !domain.startsWith('http')) {
                            domain = `${domain}.com`;
                        }

                        // Add https:// if not present
                        targetUrl = domain.startsWith('http') ? domain : `https://${domain}`;

                        // Modify prompt to remove the navigation part
                        modifiedPrompt = prompt.replace(match[0], '').trim();

                        // Clean up common connecting words
                        modifiedPrompt = modifiedPrompt.replace(/^(and|then)\s+/i, '').trim();

                        // If nothing meaningful left, just say we navigated
                        if (!modifiedPrompt || modifiedPrompt.length < 5) {
                            modifiedPrompt = null; // Will skip action execution
                        }

                        console.log(`[Smart Navigation] Detected URL: ${targetUrl}`);
                        console.log(`[Smart Navigation] Remaining actions: ${modifiedPrompt || 'None'}`);
                        break;
                    }
                }

                // Navigate only if needed
                if (shouldNavigate) {
                    const finalUrl = targetUrl || "https://google.com";
                    console.log(`[Navigation] Going to: ${finalUrl}`);

                    // Send navigation event
                    sendProgress(sessionId!, {
                        type: 'navigation',
                        sessionId: sessionId!,
                        data: { url: finalUrl },
                        message: `Navigating to ${finalUrl}`
                    });

                    await page.goto(finalUrl, { waitUntil: 'domcontentloaded' });
                } else {
                    console.log('[Navigation] Skipped - reusing existing session and page');
                    modifiedPrompt = prompt; // Use full prompt since we didn't extract navigation
                }

                // Execute actions if any
                if (modifiedPrompt && modifiedPrompt.length > 5) {
                    console.log(`[Action] Executing: ${modifiedPrompt}`);

                    // Send action start event
                    sendProgress(sessionId!, {
                        type: 'action_start',
                        sessionId: sessionId!,
                        data: { action: modifiedPrompt },
                        message: `Executing: ${modifiedPrompt}`
                    });

                    await stagehand.act(modifiedPrompt);

                    // Send action complete event
                    sendProgress(sessionId!, {
                        type: 'action_complete',
                        sessionId: sessionId!,
                        message: 'Action completed successfully'
                    });
                } else if (!shouldNavigate) {
                    // If we didn't navigate and have no actions, log a warning
                    console.log('[Action] No action detected in prompt');
                }

                // Update session activity to extend timeout
                await persistentSessionManager.updateActivity(sessionId!);

                // Handle session lifecycle based on keepOpen preference
                // Persistent sessions stay open by default
                if (input.keepOpen === false) {
                    // User explicitly wants to close the session
                    await persistentSessionManager.closeSession(sessionId!);
                    console.log('[AI Router] Session closed as requested');
                } else {
                    console.log('[AI Router] Session kept open (persistent session - will auto-extend on activity)');
                }

                // Update session in database (don't insert duplicate if reusing)
                try {
                    if (db && sessionId) {
                        if (isNewSession) {
                            // Session was already created by persistent session manager
                            // Just update with prompt info
                            await db.update(browserSessions)
                                .set({
                                    url: liveViewUrl || `https://www.browserbase.com/sessions/${sessionId}`,
                                    debugUrl: debuggerUrl,
                                    metadata: {
                                        sessionType: "chat",
                                        persistent: true,
                                        lastPrompt: prompt,
                                        startUrl: startUrl,
                                        modelName: input.modelName || "claude-3-7-sonnet-latest",
                                        geolocation: input.geolocation || null,
                                        environment: process.env.NODE_ENV || "development",
                                        liveViewUrl: liveViewUrl,
                                    },
                                    updatedAt: new Date(),
                                })
                                .where(eq(browserSessions.sessionId, sessionId));
                            console.log(`[AI Router] Session ${sessionId} updated in database`);
                        } else {
                            // Reused session - just update metadata with latest prompt
                            const existingSession = await db.query.browserSessions.findFirst({
                                where: eq(browserSessions.sessionId, sessionId),
                            });

                            if (existingSession) {
                                const existingMetadata = (existingSession.metadata as any) || {};
                                await db.update(browserSessions)
                                    .set({
                                        metadata: {
                                            ...existingMetadata,
                                            lastPrompt: prompt,
                                            promptHistory: [
                                                ...(existingMetadata.promptHistory || []),
                                                { prompt, timestamp: new Date().toISOString() },
                                            ].slice(-10), // Keep last 10 prompts
                                        },
                                        updatedAt: new Date(),
                                    })
                                    .where(eq(browserSessions.sessionId, sessionId));
                                console.log(`[AI Router] Reused session ${sessionId} metadata updated`);
                            }
                        }
                    }
                } catch (dbError) {
                    console.error("[AI Router] Failed to update session in database:", dbError);
                    // Don't throw - session was successful, just log the DB error
                }

                return {
                    success: true,
                    message: `Successfully executed: ${prompt}`,
                    sessionId: sessionId,
                    sessionUrl: `https://www.browserbase.com/sessions/${sessionId}`,
                    liveViewUrl: liveViewUrl,
                    debuggerUrl: debuggerUrl,
                    prompt: prompt,
                    isPersistent: true,
                    isReusedSession: !isNewSession,
                };

            } catch (error) {
                console.error("Stagehand error:", error);

                // Update session status to failed if we have a sessionId
                if (sessionId && db) {
                    try {
                        // PLACEHOLDER: Replace with actual userId from auth context
                        const userId = ctx.user.id;

                        await db.insert(browserSessions).values({
                            userId: userId,
                            sessionId: sessionId,
                            status: "failed",
                            metadata: {
                                sessionType: "chat",
                                error: error instanceof Error ? error.message : "Unknown error",
                            },
                        });
                    } catch (dbError) {
                        console.error("Failed to persist failed session:", dbError);
                    }
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error executing browser action: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Retrieve session replay for a given session ID
     * Returns rrweb events that can be used with rrweb-player
     */
    getSessionReplay: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
            })
        )
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                console.warn("[AI Router] Database not available - fetching recording directly from Browserbase");
            }

            try {
                // Check database first for cached recordingUrl (much faster)
                if (db) {
                    const dbSession = await db.query.browserSessions.findFirst({
                        where: eq(browserSessions.sessionId, input.sessionId),
                        columns: {
                            recordingUrl: true,
                        },
                    });

                    // If we have a cached recording URL, return it immediately
                    if (dbSession?.recordingUrl) {
                        console.log(`Using cached recording URL for session ${input.sessionId}`);
                        return {
                            sessionId: input.sessionId,
                            events: [], // Events not cached, but URL is available
                            recordingUrl: dbSession.recordingUrl,
                            status: "completed",
                            cached: true,
                        };
                    }
                }

                // Otherwise, fetch from Browserbase API using real SDK
                console.log(`Fetching recording from Browserbase API for session ${input.sessionId}`);
                const recording = await browserbaseSDK.getSessionRecording(input.sessionId);

                // Cache the recording URL in database for future requests
                if (recording.recordingUrl && db) {
                    try {
                        await db.update(browserSessions)
                            .set({ recordingUrl: recording.recordingUrl })
                            .where(eq(browserSessions.sessionId, input.sessionId));
                        console.log(`Cached recording URL for session ${input.sessionId}`);
                    } catch (dbError) {
                        console.error("Failed to cache recording URL:", dbError);
                        // Don't throw - we still have the recording data
                    }
                }

                return {
                    sessionId: input.sessionId,
                    events: [], // rrweb events - Browserbase returns recording URL instead
                    recordingUrl: recording.recordingUrl,
                    status: recording.status,
                    cached: false,
                };
            } catch (error) {
                console.error("Failed to retrieve session replay:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to retrieve session replay: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Get session live view URLs for real-time debugging
     * Returns debuggerFullscreenUrl and all page URLs for multi-tab support
     */
    getSessionLiveView: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Use real Browserbase SDK to get live view URLs
                const debugInfo = await browserbaseSDK.getSessionDebug(input.sessionId);

                return {
                    sessionId: input.sessionId,
                    liveViewUrl: debugInfo.debuggerFullscreenUrl,
                    debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
                    debuggerUrl: debugInfo.debuggerUrl,
                    wsUrl: debugInfo.wsUrl,
                };
            } catch (error) {
                console.error("Failed to retrieve session live view:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to retrieve session live view: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Get session logs for debugging
     */
    getSessionLogs: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Use real Browserbase SDK to get session logs
                const logsData = await browserbaseSDK.getSessionLogs(input.sessionId);

                return {
                    sessionId: input.sessionId,
                    logs: logsData.logs,
                };
            } catch (error) {
                console.error("Failed to retrieve session logs:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to retrieve session logs: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * List all active browser sessions
     */
    listSessions: publicProcedure.query(async () => {
        try {
            const browserbaseService = getBrowserbaseService();
            const sessions = await browserbaseService.listSessions();

            return {
                sessions: sessions.map(session => ({
                    id: session.id,
                    url: session.url,
                    status: session.status,
                    createdAt: session.createdAt,
                })),
            };
        } catch (error) {
            console.error("Failed to list sessions:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to list sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    }),

    /**
     * Observe a page and get actionable steps
     * Returns an array of actions that can be executed
     */
    observePage: protectedProcedure
        .input(
            z.object({
                url: z.string().url(),
                instruction: z.string(),
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                modelName: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            let sessionId: string | undefined;

            try {
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                sessionId = session.id;
                console.log(`Session created: ${session.url}`);

                const stagehand = new Stagehand({
                    env: "BROWSERBASE",
                    verbose: 1,
                    disablePino: true,
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
                            recordSession: false, // No need for recording in observe-only
                            viewport: { width: 1920, height: 1080 },
                        },
                        userMetadata: {
                            userId: "automation-user-observe",
                            environment: process.env.NODE_ENV || "development",
                        },
                    },
                });

                await stagehand.init();
                const page = stagehand.context.pages()[0];

                await page.goto(input.url);

                // Get array of actions that can be executed - observe is called on stagehand in V3
                const actions = await stagehand.observe(input.instruction);

                await stagehand.close();

                // Persist session to database
                try {
                    const userId = ctx.user.id;

                    await db.insert(browserSessions).values({
                        userId: userId,
                        sessionId: sessionId,
                        status: "completed",
                        url: input.url,
                        projectId: process.env.BROWSERBASE_PROJECT_ID,
                        metadata: {
                            sessionType: "observe",
                            instruction: input.instruction,
                            actionsFound: actions?.length || 0,
                            modelName: input.modelName || "google/gemini-2.0-flash",
                            geolocation: input.geolocation || null,
                        },
                    });
                    console.log(`Observe session ${sessionId} persisted to database`);
                } catch (dbError) {
                    console.error("Failed to persist observe session:", dbError);
                }

                return {
                    success: true,
                    actions: actions,
                    sessionId: sessionId,
                    sessionUrl: session.url,
                    instruction: input.instruction,
                };

            } catch (error) {
                console.error("Failed to observe page:", error);

                // Log failed session
                if (sessionId) {
                    try {
                        await db.insert(browserSessions).values({
                            userId: ctx.user.id,
                            sessionId: sessionId,
                            status: "failed",
                            url: input.url,
                            metadata: {
                                sessionType: "observe",
                                error: error instanceof Error ? error.message : "Unknown error",
                            },
                        });
                    } catch (dbError) {
                        console.error("Failed to log failed observe session:", dbError);
                    }
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to observe page: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Execute multiple observed actions sequentially
     * Useful for form filling and multi-step workflows
     */
    executeActions: protectedProcedure
        .input(
            z.object({
                url: z.string().url(),
                instruction: z.string(),
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                modelName: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            let sessionId: string | undefined;

            try {
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                sessionId = session.id;
                console.log(`Session created: ${session.url}`);

                const stagehand = new Stagehand({
                    env: "BROWSERBASE",
                    verbose: 1,
                    disablePino: true,
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
                            recordSession: true, // Keep recording for session replay
                            viewport: { width: 1920, height: 1080 },
                        },
                        userMetadata: {
                            userId: "automation-user-execute",
                            environment: process.env.NODE_ENV || "development",
                        },
                    },
                });

                await stagehand.init();
                const page = stagehand.context.pages()[0];

                await page.goto(input.url);

                // Get actions and execute them - both methods called on stagehand in V3
                const actions = await stagehand.observe(input.instruction);
                const executedActions: string[] = [];

                for (const action of actions) {
                    await stagehand.act(action);
                    executedActions.push(typeof action === 'string' ? action : JSON.stringify(action));
                }

                await stagehand.close();

                // Persist session to database
                try {
                    const userId = ctx.user.id;

                    await db.insert(browserSessions).values({
                        userId: userId,
                        sessionId: sessionId,
                        status: "completed",
                        url: input.url,
                        projectId: process.env.BROWSERBASE_PROJECT_ID,
                        metadata: {
                            sessionType: "executeActions",
                            instruction: input.instruction,
                            actionsExecuted: executedActions.length,
                            actions: executedActions,
                            modelName: input.modelName || "google/gemini-2.0-flash",
                            geolocation: input.geolocation || null,
                        },
                    });
                    console.log(`ExecuteActions session ${sessionId} persisted to database`);
                } catch (dbError) {
                    console.error("Failed to persist executeActions session:", dbError);
                }

                return {
                    success: true,
                    executedActions,
                    actionCount: executedActions.length,
                    sessionId: sessionId,
                    sessionUrl: session.url,
                };

            } catch (error) {
                console.error("Failed to execute actions:", error);

                // Log failed session
                if (sessionId) {
                    try {
                        await db.insert(browserSessions).values({
                            userId: ctx.user.id,
                            sessionId: sessionId,
                            status: "failed",
                            url: input.url,
                            metadata: {
                                sessionType: "executeActions",
                                error: error instanceof Error ? error.message : "Unknown error",
                            },
                        });
                    } catch (dbError) {
                        console.error("Failed to log failed executeActions session:", dbError);
                    }
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to execute actions: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Extract structured data from a page using AI
     * Supports custom Zod schemas for type-safe extraction
     */
    extractData: protectedProcedure
        .input(
            z.object({
                url: z.string().url(),
                instruction: z.string(),
                // Schema passed as JSON string since we can't serialize Zod schemas
                schemaType: z.enum(["contactInfo", "productInfo", "custom"]),
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                modelName: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            let sessionId: string | undefined;

            try {
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                sessionId = session.id;
                console.log(`Session created: ${session.url}`);

                const stagehand = new Stagehand({
                    env: "BROWSERBASE",
                    verbose: 1,
                    disablePino: true,
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
                            recordSession: false, // No need for recording in extract-only
                            viewport: { width: 1920, height: 1080 },
                        },
                        userMetadata: {
                            userId: "automation-user-extract",
                            environment: process.env.NODE_ENV || "development",
                        },
                    },
                });

                await stagehand.init();
                const page = stagehand.context.pages()[0];

                await page.goto(input.url);

                // Define schema based on type - extract is called on stagehand in V3
                let extractionResult: any;

                if (input.schemaType === "contactInfo") {
                    extractionResult = await stagehand.extract(
                        input.instruction,
                        z.object({
                            contactInfo: z.object({
                                email: z.string().optional(),
                                phone: z.string().optional(),
                                address: z.string().optional(),
                            })
                        }) as any
                    );
                } else if (input.schemaType === "productInfo") {
                    extractionResult = await stagehand.extract(
                        input.instruction,
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
                    // Generic extraction without schema returns { extraction: string }
                    extractionResult = await stagehand.extract(input.instruction);
                }

                await stagehand.close();

                // Persist extracted data to database
                try {
                    const userId = ctx.user.id;

                    // Find the browser session in DB to get its database ID
                    let dbSessionId: number | null = null;
                    if (sessionId) {
                        const dbSession = await db.query.browserSessions.findFirst({
                            where: eq(browserSessions.sessionId, sessionId),
                            columns: { id: true },
                        });
                        dbSessionId = dbSession?.id || null;
                    }

                    await db.insert(extractedData).values({
                        userId: userId,
                        sessionId: dbSessionId,
                        url: input.url,
                        dataType: input.schemaType,
                        data: extractionResult,
                        metadata: {
                            instruction: input.instruction,
                            modelName: input.modelName || "google/gemini-2.0-flash",
                            geolocation: input.geolocation || null,
                        },
                    });
                    console.log(`Extracted data persisted to database for URL: ${input.url}`);
                } catch (dbError) {
                    console.error("Failed to persist extracted data:", dbError);
                    // Don't throw - extraction was successful, just log the DB error
                }

                return {
                    success: true,
                    data: extractionResult,
                    sessionId: sessionId,
                    sessionUrl: session.url,
                };

            } catch (error) {
                console.error("Failed to extract data:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Execute multi-tab workflow
     * Note: Multi-tab replays may be unreliable. Use Live View for monitoring.
     */
    multiTabWorkflow: protectedProcedure
        .input(
            z.object({
                tabs: z.array(
                    z.object({
                        url: z.string().url(),
                        instruction: z.string().optional(),
                    })
                ).min(1).max(5), // Limit to 5 tabs for safety
                geolocation: z.object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                }).optional(),
                modelName: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            let sessionId: string | undefined;

            try {
                const browserbaseService = getBrowserbaseService();
                const session = input.geolocation
                    ? await browserbaseService.createSessionWithGeoLocation(input.geolocation)
                    : await browserbaseService.createSession();

                sessionId = session.id;
                console.log(`Session created: ${session.url}`);

                const stagehand = new Stagehand({
                    env: "BROWSERBASE",
                    verbose: 1,
                    disablePino: true,
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
                            recordSession: true, // Keep recording for multi-tab workflows
                            viewport: { width: 1920, height: 1080 },
                        },
                        userMetadata: {
                            userId: "automation-user-multitab",
                            environment: process.env.NODE_ENV || "development",
                        },
                    },
                });

                await stagehand.init();

                // Execute workflow for each tab
                const results = [];

                for (let i = 0; i < input.tabs.length; i++) {
                    const tabConfig = input.tabs[i];
                    console.log(`Processing tab ${i + 1}: ${tabConfig.url}`);

                    // Use existing page for first tab, new page for others
                    const page = i === 0
                        ? stagehand.context.pages()[0]
                        : await stagehand.context.newPage();

                    await page.goto(tabConfig.url);

                    let actionResult = null;
                    if (tabConfig.instruction) {
                        // Execute action on this tab
                        actionResult = await stagehand.act(tabConfig.instruction);
                    }

                    results.push({
                        url: tabConfig.url,
                        status: "completed",
                        result: actionResult
                    });
                }

                await stagehand.close();

                return {
                    success: true,
                    results: results,
                    sessionId: sessionId,
                    sessionUrl: session.url,
                };

            } catch (error) {
                console.error("Failed to execute multi-tab workflow:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to execute multi-tab workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    // ========================================
    // PERSISTENT SESSION MANAGEMENT ENDPOINTS
    // ========================================

    /**
     * Get current active persistent session for the user
     * Returns session details if one exists, null otherwise
     */
    getActiveSession: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user.id;
            const activeSession = persistentSessionManager.getActiveSession(userId);

            if (!activeSession) {
                return {
                    hasActiveSession: false,
                    session: null,
                };
            }

            // Get debug URLs
            let debugUrl: string | undefined;
            let liveViewUrl: string | undefined;

            try {
                const debugInfo = await browserbaseSDK.getSessionDebug(activeSession.sessionId);
                debugUrl = debugInfo.debuggerUrl;
                liveViewUrl = debugInfo.debuggerFullscreenUrl;
            } catch (error) {
                console.error("[AI Router] Failed to get debug info for active session:", error);
            }

            return {
                hasActiveSession: true,
                session: {
                    sessionId: activeSession.sessionId,
                    userId: activeSession.userId,
                    lastActivity: activeSession.lastActivity,
                    expiresAt: activeSession.expiresAt,
                    debugUrl,
                    liveViewUrl,
                    sessionUrl: `https://www.browserbase.com/sessions/${activeSession.sessionId}`,
                },
            };
        }),

    /**
     * Terminate the current active persistent session
     */
    terminateSession: protectedProcedure
        .input(
            z.object({
                sessionId: z.string().optional(), // Specific session or current active
            }).optional()
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;
            const db = await getDb();

            try {
                if (input?.sessionId) {
                    // Terminate specific session
                    await persistentSessionManager.closeSession(input.sessionId);

                    if (db) {
                        await db.update(browserSessions)
                            .set({
                                status: "completed",
                                completedAt: new Date(),
                                updatedAt: new Date(),
                            })
                            .where(eq(browserSessions.sessionId, input.sessionId));
                    }

                    return {
                        success: true,
                        message: `Session ${input.sessionId} terminated`,
                        terminatedSessionId: input.sessionId,
                    };
                } else {
                    // Terminate all user sessions
                    await persistentSessionManager.closeUserSessions(userId);

                    return {
                        success: true,
                        message: "All active sessions terminated",
                    };
                }
            } catch (error) {
                console.error("[AI Router] Failed to terminate session:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to terminate session: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Extend the timeout of the current active session
     */
    extendSession: protectedProcedure
        .input(
            z.object({
                sessionId: z.string().optional(),
                additionalMinutes: z.number().min(1).max(60).default(15),
            }).optional()
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;

            try {
                const sessionId = input?.sessionId || persistentSessionManager.getActiveSession(userId)?.sessionId;

                if (!sessionId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "No active session found",
                    });
                }

                const additionalMs = (input?.additionalMinutes || 15) * 60 * 1000;
                const success = await persistentSessionManager.extendSession(sessionId, additionalMs);

                if (!success) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Session not found or already expired",
                    });
                }

                const session = persistentSessionManager.getSession(sessionId);

                return {
                    success: true,
                    sessionId,
                    newExpiresAt: session?.expiresAt,
                    message: `Session extended by ${input?.additionalMinutes || 15} minutes`,
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error("[AI Router] Failed to extend session:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to extend session: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Delete a session record (closes session if active and removes from database)
     */
    deleteSession: protectedProcedure
        .input(
            z.object({
                sessionId: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;
            const db = await getDb();

            try {
                // Close session if active
                await persistentSessionManager.closeSession(input.sessionId);

                // Delete from database
                if (db) {
                    await db.delete(browserSessions)
                        .where(eq(browserSessions.sessionId, input.sessionId));
                }

                return {
                    success: true,
                    message: `Session ${input.sessionId} deleted`,
                };
            } catch (error) {
                console.error("[AI Router] Failed to delete session:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to delete session: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    /**
     * Get persistent session manager stats
     */
    getSessionStats: protectedProcedure
        .query(async ({ ctx }) => {
            const stats = persistentSessionManager.getStats();
            return {
                ...stats,
                timestamp: new Date(),
            };
        }),
});
