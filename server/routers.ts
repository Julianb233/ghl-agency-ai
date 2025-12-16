import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { aiRouter } from "./api/routers/ai";
import { emailRouter } from "./api/routers/email";
import { voiceRouter } from "./api/routers/voice";
import { seoRouter } from "./api/routers/seo";
import { adsRouter } from "./api/routers/ads";
import { marketplaceRouter } from "./api/routers/marketplace";
import { stripeWebhookRouter } from "./api/routers/stripe-webhook";
import { tasksRouter } from "./api/routers/tasks";
import { templatesRouter } from "./api/routers/templates";
import { workflowsRouter } from "./api/routers/workflows";
import { quizRouter } from "./api/routers/quiz";
import { browserRouter } from "./api/routers/browser";
import { onboardingRouter } from "./api/routers/onboarding";
import { aiCallingRouter } from "./api/routers/aiCalling";
import { creditsRouter } from "./api/routers/credits";
import { leadEnrichmentRouter } from "./api/routers/leadEnrichment";
import { scheduledTasksRouter } from "./api/routers/scheduledTasks";
import { ragRouter } from "./api/routers/rag";
import { alertsRouter } from "./api/routers/alerts";
import { apiKeysRouter } from "./api/routers/apiKeys";
import { analyticsRouter } from "./api/routers/analytics";
import { settingsRouter } from "./api/routers/settings";
import { webhooksRouter } from "./api/routers/webhooks";
import { agencyTasksRouter } from "./api/routers/agencyTasks";
import { clientProfilesRouter } from "./api/routers/clientProfiles";
import { adminRouter } from "./api/routers/admin";
import { healthRouter } from "./api/routers/health";
import { agentRouter } from "./api/routers/agent";
import { webdevRouter } from "./api/routers/webdev";
import { deploymentRouter } from "./api/routers/deployment";
import { mcpRouter } from "./api/routers/mcp";
import { swarmRouter } from "./api/routers/swarm";
import { knowledgeRouter } from "./api/routers/knowledge";
import { subscriptionRouter } from "./api/routers/subscription";
import { memoryRouter } from "./api/routers/memory";
import { toolsRouter } from "./api/routers/tools";
import { subAccountsRouter } from "./api/routers/subAccounts";
import { agentPermissionsRouter } from "./api/routers/agentPermissions";
import { agentMemoryRouter } from "./api/routers/agentMemory";
import { costsRouter } from "./api/routers/costs";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  ai: aiRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  email: emailRouter,
  voice: voiceRouter,
  seo: seoRouter,
  ads: adsRouter,
  marketplace: marketplaceRouter,
  stripeWebhook: stripeWebhookRouter,
  tasks: tasksRouter,
  templates: templatesRouter,
  workflows: workflowsRouter,
  quiz: quizRouter,
  browser: browserRouter,
  onboarding: onboardingRouter,

  // AI & Lead Management
  aiCalling: aiCallingRouter,
  credits: creditsRouter,
  leadEnrichment: leadEnrichmentRouter,

  // Automation & Scheduling
  scheduledTasks: scheduledTasksRouter,

  // RAG & Documentation
  rag: ragRouter,

  // Monitoring & Analytics
  alerts: alertsRouter,
  analytics: analyticsRouter,
  costs: costsRouter,
  health: healthRouter,

  // Settings & Configuration
  apiKeys: apiKeysRouter,
  settings: settingsRouter,

  // Webhooks & Communication
  webhooks: webhooksRouter,
  agencyTasks: agencyTasksRouter,

  // Client Management
  clientProfiles: clientProfilesRouter,
  subAccounts: subAccountsRouter,

  // Admin Dashboard
  admin: adminRouter,

  // Autonomous Agent
  agent: agentRouter,
  agentPermissions: agentPermissionsRouter,

  // Webdev Projects
  webdev: webdevRouter,
  deployment: deploymentRouter,

  // MCP (Model Context Protocol)
  mcp: mcpRouter,

  // Tools Execution Engine
  tools: toolsRouter,

  // Swarm Coordination (Multi-Agent System)
  swarm: swarmRouter,

  // Knowledge & Training System
  knowledge: knowledgeRouter,

  // Subscription & Billing
  subscription: subscriptionRouter,

  // Memory Management System
  memory: memoryRouter,

  // Agent Memory (Browser Agent Training & Learning)
  agentMemory: agentMemoryRouter,
});

export type AppRouter = typeof appRouter;
