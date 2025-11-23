import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { aiRouter } from "./api/routers/ai";
import { emailRouter } from "./api/routers/email";
import { voiceRouter } from "./api/routers/voice";
import { seoRouter } from "./api/routers/seo";
import { adsRouter } from "./api/routers/ads";
import { marketplaceRouter } from "./api/routers/marketplace";
import { tasksRouter } from "./api/routers/tasks";
import { templatesRouter } from "./api/routers/templates";
import { workflowsRouter } from "./api/routers/workflows";
import { quizRouter } from "./api/routers/quiz";
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
  tasks: tasksRouter,
  templates: templatesRouter,
  workflows: workflowsRouter,
  quiz: quizRouter,
});

export type AppRouter = typeof appRouter;
