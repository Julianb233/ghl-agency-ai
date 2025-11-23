import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
        try {
            console.error(`[Static] Directory contents:`, fs.readdirSync(process.cwd()));
        } catch (e) {
            console.error(`[Static] Could not read directory contents:`, e);
        }

        // Try to find where the files actually are
        // __dirname is not available in ESM, use import.meta.url
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
