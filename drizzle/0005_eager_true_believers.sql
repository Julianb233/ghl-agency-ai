CREATE TABLE "agent_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"taskDescription" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"plan" jsonb,
	"phases" jsonb DEFAULT '[]' NOT NULL,
	"currentPhaseIndex" integer DEFAULT 0 NOT NULL,
	"thinkingSteps" jsonb DEFAULT '[]' NOT NULL,
	"toolExecutions" jsonb DEFAULT '[]' NOT NULL,
	"result" jsonb,
	"error" text,
	"iterations" integer DEFAULT 0 NOT NULL,
	"durationMs" integer,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionUuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) DEFAULT 'idle' NOT NULL,
	"context" jsonb,
	"thinkingSteps" jsonb DEFAULT '[]' NOT NULL,
	"toolHistory" jsonb DEFAULT '[]' NOT NULL,
	"plan" jsonb,
	"currentPhase" varchar(100),
	"iterationCount" integer DEFAULT 0 NOT NULL,
	"maxIterations" integer DEFAULT 100 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_sessions_sessionUuid_unique" UNIQUE("sessionUuid")
);
--> statement-breakpoint
CREATE TABLE "generated_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"executionId" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"techStack" varchar(50) DEFAULT 'react' NOT NULL,
	"features" jsonb DEFAULT '{}' NOT NULL,
	"filesSnapshot" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"devServerPort" integer,
	"previewUrl" text,
	"deploymentUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"context" text NOT NULL,
	"content" text NOT NULL,
	"examples" jsonb,
	"confidence" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"executionId" integer NOT NULL,
	"toolName" varchar(100) NOT NULL,
	"parameters" jsonb,
	"result" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"durationMs" integer,
	"error" text,
	"executedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_sessionId_agent_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_projects" ADD CONSTRAINT "generated_projects_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_projects" ADD CONSTRAINT "generated_projects_executionId_agent_executions_id_fk" FOREIGN KEY ("executionId") REFERENCES "public"."agent_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_executionId_agent_executions_id_fk" FOREIGN KEY ("executionId") REFERENCES "public"."agent_executions"("id") ON DELETE no action ON UPDATE no action;