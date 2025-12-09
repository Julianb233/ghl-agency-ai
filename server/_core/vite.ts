import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  // Dynamic import to avoid loading vite in production
  const { createServer: createViteServer } = await import("vite");
  const viteConfigModule = await import("../../vite.config.js");
  const viteConfig = viteConfigModule.default || viteConfigModule;
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the bundled code is in dist/, so we need to resolve the public directory
  // For Vercel, the working directory is the project root
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  console.log(`[Static] Attempting to serve from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] ERROR: Could not find the build directory: ${distPath}`
    );
    console.error(`[Static] Current working directory: ${process.cwd()}`);
    console.error(`[Static] Directory contents:`, fs.readdirSync(process.cwd()));
    
    // Try to find where the files actually are
    const altPath = path.resolve(__dirname, "../../dist/public");
    if (fs.existsSync(altPath)) {
      console.log(`[Static] Found alternative path: ${altPath}`);
      return serveStaticFromPath(app, altPath);
    }
  } else {
    console.log(`[Static] Successfully found dist directory`);
  }

  serveStaticFromPath(app, distPath);
}

function serveStaticFromPath(app: Express, distPath: string) {
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
