import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: [
    "./drizzle/schema.ts",
    "./drizzle/schema-scheduled-tasks.ts",
    "./drizzle/schema-rag.ts",
    "./drizzle/schema-webhooks.ts",
    "./drizzle/schema-agent.ts",
    "./drizzle/relations.ts",
    "./server/rag/schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
