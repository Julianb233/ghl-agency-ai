import "./config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./google-auth.ts";
import { emailAuthRouter } from "./email-auth";
import { onboardingRouter } from "./onboarding";
import { registerSSERoutes } from "./sse-routes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function createApp() {
  const app = express();

  // Custom middleware to handle Vercel's pre-parsed body
  // Vercel serverless functions already parse the body, so we need to skip
  // Express body parsing if the body is already an object
  app.use((req, res, next) => {
    // If body is already parsed (Vercel), skip body parsing
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    // Otherwise, use Express JSON parser
    express.json({ limit: "50mb" })(req, res, next);
  });

  app.use((req, res, next) => {
    // Skip if body is already parsed
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Google Auth routes
  registerGoogleAuthRoutes(app);
  // Email/Password Auth routes
  app.use("/api/auth", emailAuthRouter);
  // Onboarding routes
  app.use("/api/onboarding", onboardingRouter);
  // SSE routes for real-time streaming
  registerSSERoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const server = createServer(app);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start the server if this file is run directly (not imported)
// For Vercel, we'll export the app creation function instead
if (import.meta.url === `file://${process.argv[1]}` || process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}

// Export the app creation function for Vercel serverless function
export default createApp;
