CREATE TABLE "ad_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"adId" varchar(128),
	"screenshotUrl" text NOT NULL,
	"impressions" integer,
	"clicks" integer,
	"ctr" numeric(5, 2),
	"cpc" numeric(10, 2),
	"spend" numeric(10, 2),
	"conversions" integer,
	"roas" numeric(10, 2),
	"insights" jsonb,
	"suggestions" jsonb,
	"sentiment" varchar(20),
	"confidence" numeric(3, 2),
	"rawAnalysis" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_automation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"jobId" integer,
	"actionType" varchar(50) NOT NULL,
	"adId" varchar(128),
	"adSetId" varchar(128),
	"campaignId" varchar(128),
	"changes" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sessionId" varchar(128),
	"debugUrl" text,
	"recordingUrl" text,
	"result" jsonb,
	"errorMessage" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_copy_variations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"originalAdId" varchar(128),
	"headline" text NOT NULL,
	"primaryText" text NOT NULL,
	"description" text,
	"callToAction" varchar(50),
	"reasoning" text,
	"variationNumber" integer NOT NULL,
	"targetAudience" text,
	"tone" varchar(50),
	"objective" varchar(50),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"testAdId" varchar(128),
	"performanceMetrics" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"analysisId" integer,
	"adId" varchar(128),
	"type" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"expectedImpact" text,
	"actionable" varchar(10) DEFAULT 'true' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"appliedAt" timestamp,
	"appliedBy" integer,
	"resultMetrics" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'info' NOT NULL,
	"targetRoles" jsonb,
	"targetUsers" jsonb,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"isDismissible" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"linkUrl" text,
	"linkText" varchar(100),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" varchar(100),
	"oldValues" jsonb,
	"newValues" jsonb,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backlinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"targetUrl" text NOT NULL,
	"sourceUrl" text NOT NULL,
	"sourceDomain" text NOT NULL,
	"anchorText" text,
	"isDoFollow" boolean DEFAULT true,
	"isActive" boolean DEFAULT true,
	"domainRating" integer DEFAULT 0,
	"domainAuthority" integer DEFAULT 0,
	"pageAuthority" integer DEFAULT 0,
	"isToxic" boolean DEFAULT false,
	"firstSeen" timestamp DEFAULT now() NOT NULL,
	"lastSeen" timestamp DEFAULT now() NOT NULL,
	"lastChecked" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" varchar(20) NOT NULL,
	"email" varchar(320) NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"scope" text NOT NULL,
	"metadata" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp,
	"syncCursor" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailId" integer NOT NULL,
	"connectionId" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"bodyType" varchar(10) DEFAULT 'html' NOT NULL,
	"tone" varchar(20),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"model" varchar(50),
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"sentAt" timestamp,
	"providerId" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sync_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"connectionId" integer NOT NULL,
	"jobId" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"emailsFetched" integer DEFAULT 0 NOT NULL,
	"emailsProcessed" integer DEFAULT 0 NOT NULL,
	"draftsGenerated" integer DEFAULT 0 NOT NULL,
	"error" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"duration" integer,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"rolloutPercentage" integer DEFAULT 0 NOT NULL,
	"userWhitelist" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "heatmap_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"eventType" varchar(20) NOT NULL,
	"x" integer,
	"y" integer,
	"element" text,
	"scrollDepth" integer,
	"scrollPercentage" integer,
	"visitorId" varchar(100),
	"userAgent" text,
	"ipAddress" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heatmap_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"trackingId" varchar(100) NOT NULL,
	"totalClicks" integer DEFAULT 0,
	"totalSessions" integer DEFAULT 0,
	"averageScrollDepth" integer DEFAULT 0,
	"bounceRate" integer DEFAULT 0,
	"averageTimeOnPage" integer DEFAULT 0,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heatmap_sessions_trackingId_unique" UNIQUE("trackingId")
);
--> statement-breakpoint
CREATE TABLE "keyword_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"keyword" text NOT NULL,
	"position" integer,
	"previousPosition" integer,
	"change" integer DEFAULT 0,
	"searchEngine" varchar(20) DEFAULT 'google',
	"location" varchar(100) DEFAULT 'United States',
	"pageTitle" text,
	"pageUrl" text,
	"snippet" text,
	"checkedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_research" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"topic" text NOT NULL,
	"keyword" text NOT NULL,
	"searchVolume" integer DEFAULT 0,
	"difficulty" integer DEFAULT 50,
	"cpc" integer DEFAULT 0,
	"trend" varchar(10) DEFAULT 'stable',
	"relatedKeywords" jsonb,
	"source" varchar(50) DEFAULT 'ai',
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_ad_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"accountId" varchar(128) NOT NULL,
	"accountName" text NOT NULL,
	"accountStatus" varchar(50),
	"currency" varchar(10),
	"metadata" jsonb,
	"lastSyncedAt" timestamp,
	"isActive" varchar(10) DEFAULT 'true' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_ad_accounts_accountId_unique" UNIQUE("accountId")
);
--> statement-breakpoint
CREATE TABLE "meta_ad_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"campaignId" integer NOT NULL,
	"adSetId" varchar(128) NOT NULL,
	"adSetName" text NOT NULL,
	"status" varchar(50),
	"dailyBudget" numeric(10, 2),
	"lifetimeBudget" numeric(10, 2),
	"targetingDescription" text,
	"targeting" jsonb,
	"metadata" jsonb,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_ad_sets_adSetId_unique" UNIQUE("adSetId")
);
--> statement-breakpoint
CREATE TABLE "meta_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"adSetId" integer NOT NULL,
	"adId" varchar(128) NOT NULL,
	"adName" text NOT NULL,
	"status" varchar(50),
	"headline" text,
	"primaryText" text,
	"description" text,
	"imageUrl" text,
	"videoUrl" text,
	"callToAction" varchar(50),
	"creative" jsonb,
	"latestMetrics" jsonb,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_ads_adId_unique" UNIQUE("adId")
);
--> statement-breakpoint
CREATE TABLE "meta_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"campaignId" varchar(128) NOT NULL,
	"campaignName" text NOT NULL,
	"status" varchar(50),
	"objective" varchar(100),
	"dailyBudget" numeric(10, 2),
	"lifetimeBudget" numeric(10, 2),
	"metadata" jsonb,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_campaigns_campaignId_unique" UNIQUE("campaignId")
);
--> statement-breakpoint
CREATE TABLE "scheduled_seo_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"frequency" varchar(20) NOT NULL,
	"nextRunAt" timestamp NOT NULL,
	"lastRunAt" timestamp,
	"reportOptions" jsonb,
	"recipients" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"eventType" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'low' NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"ipAddress" varchar(45),
	"userAgent" text,
	"geoLocation" jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolvedBy" integer,
	"resolvedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"userUrl" text NOT NULL,
	"competitorUrl" text NOT NULL,
	"competitorName" text,
	"lastScore" integer,
	"lastDomainAuthority" integer,
	"lastBacklinkCount" integer,
	"lastKeywordCount" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastChecked" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"score" integer NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"metaDescription" text,
	"metaKeywords" text,
	"headings" jsonb,
	"images" jsonb,
	"links" jsonb,
	"performance" jsonb,
	"technicalSEO" jsonb,
	"contentAnalysis" jsonb,
	"aiInsights" text,
	"recommendations" jsonb,
	"pdfUrl" text,
	"reportType" varchar(20) DEFAULT 'full',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"assignedTo" integer,
	"category" varchar(50),
	"tags" jsonb,
	"metadata" jsonb,
	"resolvedAt" timestamp,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synced_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"connectionId" integer NOT NULL,
	"messageId" text NOT NULL,
	"threadId" text,
	"subject" text,
	"from" jsonb NOT NULL,
	"to" jsonb NOT NULL,
	"cc" jsonb,
	"bcc" jsonb,
	"replyTo" jsonb,
	"date" timestamp NOT NULL,
	"body" text,
	"bodyType" varchar(10),
	"snippet" text,
	"labels" jsonb,
	"isRead" boolean DEFAULT false NOT NULL,
	"isStarred" boolean DEFAULT false NOT NULL,
	"hasAttachments" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"headers" jsonb,
	"rawData" jsonb,
	"sentiment" varchar(20),
	"sentimentScore" integer,
	"importance" varchar(20),
	"category" varchar(50),
	"requiresResponse" boolean,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "synced_emails_messageId_unique" UNIQUE("messageId")
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticketId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"message" text NOT NULL,
	"isInternal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhookId" text NOT NULL,
	"userId" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"method" varchar(10) DEFAULT 'POST' NOT NULL,
	"requestHeaders" jsonb,
	"requestBody" jsonb,
	"responseStatus" integer,
	"responseBody" text,
	"responseTime" integer,
	"status" varchar(50) NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"nextRetryAt" timestamp,
	"error" text,
	"errorCode" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspendedAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspensionReason" text;--> statement-breakpoint
ALTER TABLE "user_webhooks" ADD COLUMN "secretKey" varchar(64);--> statement-breakpoint
ALTER TABLE "ad_analyses" ADD CONSTRAINT "ad_analyses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_automation_history" ADD CONSTRAINT "ad_automation_history_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variations" ADD CONSTRAINT "ad_copy_variations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_recommendations" ADD CONSTRAINT "ad_recommendations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_recommendations" ADD CONSTRAINT "ad_recommendations_analysisId_ad_analyses_id_fk" FOREIGN KEY ("analysisId") REFERENCES "public"."ad_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_recommendations" ADD CONSTRAINT "ad_recommendations_appliedBy_users_id_fk" FOREIGN KEY ("appliedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_emailId_synced_emails_id_fk" FOREIGN KEY ("emailId") REFERENCES "public"."synced_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_connectionId_email_connections_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."email_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sync_history" ADD CONSTRAINT "email_sync_history_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sync_history" ADD CONSTRAINT "email_sync_history_connectionId_email_connections_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."email_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_events" ADD CONSTRAINT "heatmap_events_sessionId_heatmap_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."heatmap_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_sessions" ADD CONSTRAINT "heatmap_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_rankings" ADD CONSTRAINT "keyword_rankings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_research" ADD CONSTRAINT "keyword_research_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_campaignId_meta_campaigns_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."meta_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_adSetId_meta_ad_sets_id_fk" FOREIGN KEY ("adSetId") REFERENCES "public"."meta_ad_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_accountId_meta_ad_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."meta_ad_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_seo_reports" ADD CONSTRAINT "scheduled_seo_reports_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolvedBy_users_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_competitors" ADD CONSTRAINT "seo_competitors_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedTo_users_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_emails" ADD CONSTRAINT "synced_emails_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_emails" ADD CONSTRAINT "synced_emails_connectionId_email_connections_id_fk" FOREIGN KEY ("connectionId") REFERENCES "public"."email_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_support_tickets_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_logs_webhook_id_idx" ON "webhook_logs" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX "webhook_logs_user_id_idx" ON "webhook_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_logs_event_idx" ON "webhook_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "webhook_logs_next_retry_at_idx" ON "webhook_logs" USING btree ("nextRetryAt");--> statement-breakpoint
CREATE INDEX "webhook_logs_user_webhook_idx" ON "webhook_logs" USING btree ("userId","webhookId");--> statement-breakpoint
CREATE INDEX "webhook_logs_status_retry_idx" ON "webhook_logs" USING btree ("status","nextRetryAt");--> statement-breakpoint
CREATE INDEX "webhook_logs_user_status_idx" ON "webhook_logs" USING btree ("userId","status");