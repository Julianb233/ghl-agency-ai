# Environment Variables - Quick Reference

## PHASE 1: Critical (Must Configure for API to Work)

| Variable | Source | Type | Status | From .env.local |
|----------|--------|------|--------|-----------------|
| DATABASE_URL | Neon PostgreSQL | Secret | ✓ Present | ✓ Available |
| JWT_SECRET | Generated | Secret | ✓ Present | ✓ Available |
| ANTHROPIC_API_KEY | Anthropic Console | Secret | ✓ Present | ✓ Available |
| BROWSERBASE_API_KEY | Browserbase Dashboard | Secret | ✓ Present | ✓ Available |
| BROWSERBASE_PROJECT_ID | Browserbase Dashboard | Secret | ✓ Present | ✓ Available |

**Vercel Status:** ✗ NOT SET - Must configure immediately

---

## PHASE 2: Important (Set Before Public Launch)

| Variable | Source | Type | Status | From .env.local |
|----------|--------|------|--------|-----------------|
| GHL_API_KEY | GoHighLevel | Secret | Check | Optional |
| GHL_SECRET_KEY | GoHighLevel | Secret | ✓ Present | ✓ Available |
| GHL_CLIENT_ID | OAuth Provider | Secret | Missing | ✗ Not found |
| GHL_CLIENT_SECRET | OAuth Provider | Secret | Missing | ✗ Not found |
| STRIPE_WEBHOOK_SECRET | Stripe Dashboard | Secret | ✗ Empty | ✗ Empty |
| STRIPE_SECRET_KEY | Stripe Dashboard | Secret | ✓ Present | ✓ Available (LIVE) |
| STRIPE_PUBLISHABLE_KEY | Stripe Dashboard | Public | ✓ Present | ✓ Available (LIVE) |
| SENTRY_DSN | Sentry Dashboard | Public | Missing | ✗ Not found |
| OAUTH_SERVER_URL | Manus Platform | Secret | Missing | ✗ Not found |
| OWNER_OPEN_ID | Manus Platform | Secret | Missing | ✗ Not found |
| ENCRYPTION_KEY | Generated | Secret | ✓ Present | ✓ Available |
| GOOGLE_CLIENT_ID | Google Cloud | Secret | ✓ Present | ✓ Available |
| GOOGLE_CLIENT_SECRET | Google Cloud | Secret | ✓ Present | ✓ Available |
| GOOGLE_REDIRECT_URI | Config | Public | ✓ Present | ✓ Available |
| OPENAI_API_KEY | OpenAI Dashboard | Secret | ✓ Present | ✓ Available |

**Vercel Status:** Partial - Some set, some missing

---

## PHASE 3: Recommended (Improves Functionality)

| Variable | Source | Type | Purpose | Status |
|----------|--------|------|---------|--------|
| REDIS_URL | Redis Provider | Secret | Caching & rate limiting | ✗ Missing |
| RESEND_API_KEY | Resend Dashboard | Secret | Email service | ✗ Missing |
| GMAIL_CLIENT_ID | Google Cloud | Secret | Gmail OAuth | ✗ Missing |
| GMAIL_CLIENT_SECRET | Google Cloud | Secret | Gmail OAuth | ✗ Missing |
| GMAIL_REDIRECT_URI | Config | Public | Gmail callback | ✗ Missing |
| OUTLOOK_CLIENT_ID | Azure AD | Secret | Outlook OAuth | ✗ Missing |
| OUTLOOK_CLIENT_SECRET | Azure AD | Secret | Outlook OAuth | ✗ Missing |
| OUTLOOK_REDIRECT_URI | Config | Public | Outlook callback | ✗ Missing |
| DATABASE_URL_UNPOOLED | Neon PostgreSQL | Secret | Migrations | ✓ Available |
| STAGEHAND_MODEL | Config | Public | AI model | ✓ Available |
| VITE_APP_TITLE | App Config | Public | UI title | ✓ Available |
| VITE_APP_LOGO | App Config | Public | Logo path | ✓ Available |

---

## PHASE 4: Optional (Advanced Features)

| Variable | Source | Type | Purpose | Status |
|----------|--------|------|---------|--------|
| META_APP_ID | Meta Developers | Secret | Meta Ads | ✗ Missing |
| META_APP_SECRET | Meta Developers | Secret | Meta Ads | ✗ Missing |
| META_REDIRECT_URI | Config | Public | Meta callback | ✗ Missing |
| SLACK_WEBHOOK_URL | Slack Workspace | Secret | Notifications | ✗ Missing |
| NOTION_API_KEY | Notion | Secret | Notion integration | ✗ Missing |
| NOTION_DATABASE_ID | Notion | Public | Notion database | ✗ Missing |
| AWS_ACCESS_KEY_ID | AWS IAM | Secret | S3 storage | ✗ Missing |
| AWS_SECRET_ACCESS_KEY | AWS IAM | Secret | S3 storage | ✗ Missing |
| AWS_REGION | AWS Config | Public | S3 region | ✗ Missing |
| AWS_S3_BUCKET | AWS S3 | Public | S3 bucket | ✗ Missing |
| CLOUDFRONT_DISTRIBUTION_ID | AWS CloudFront | Public | CDN | ✗ Missing |
| CLOUDFRONT_DOMAIN | AWS CloudFront | Public | CDN domain | ✗ Missing |
| CDN_ENABLED | Config | Public | Enable CDN | Optional |
| SESSION_CLEANUP_INTERVAL | Config | Public | Session cleanup | Optional |
| PORT | Config | Public | Server port | Auto-set by Vercel |
| NODE_ENV | Config | Public | Environment | Auto-set to "production" |

---

## Variables Automatically Provided by Manus

These should NOT be manually configured - they come from the Manus platform:

- BUILT_IN_FORGE_API_KEY
- BUILT_IN_FORGE_API_URL
- VITE_ANALYTICS_ENDPOINT
- VITE_ANALYTICS_WEBSITE_ID
- VITE_OAUTH_PORTAL_URL
- VITE_FRONTEND_FORGE_API_KEY
- VITE_FRONTEND_FORGE_API_URL
- OWNER_NAME

---

## Copy-Paste Values from .env.local

```bash
# PHASE 1: Critical (Copy these to Vercel NOW)

DATABASE_URL="postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="h26EmSUcVSpNu6KAVODJz02y5+ANk8wN+fPKtojyJJ8="

ANTHROPIC_API_KEY="sk-ant-api03-***REDACTED***"

BROWSERBASE_API_KEY="bb_live_hUMSzjMBUikuusBWG3wBy0MGzWQ"

BROWSERBASE_PROJECT_ID="70a57111-1ece-4bb6-adb8-7e1224dacc0d"
```

```bash
# PHASE 2: Important (Copy these next)

GOOGLE_CLIENT_ID="1012840656772-gh3q2r5844adatke21ra2k7j6c5ecm12.apps.googleusercontent.com"

GOOGLE_CLIENT_SECRET="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"

GOOGLE_REDIRECT_URI="https://www.bottleneckbot.com/api/oauth/google/callback"

GHL_SECRET_KEY="mk_1SfWFRI3WuyTifeMYR6iKzBH"

STRIPE_SECRET_KEY="sk_live_***REDACTED***"

STRIPE_PUBLISHABLE_KEY="pk_live_1SfWFRI3WuyTifeMYR6iKzBH"

ENCRYPTION_KEY="3640d44712afa7a923060558365502db2ecf164ca3c78548815db90fcc62c1c8"

OPENAI_API_KEY="sk-proj-***REDACTED***"

STAGEHAND_MODEL="anthropic/claude-sonnet-4-20250514"

VITE_APP_TITLE="Bottleneck Bot"

VITE_APP_LOGO="/logo.png"

DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

```bash
# PHASE 2 & 3: Still Missing (Need to obtain)

# Get from GHL Dashboard:
GHL_API_KEY="your_ghl_api_key_here"
GHL_CLIENT_ID="your_ghl_client_id_here"
GHL_CLIENT_SECRET="your_ghl_client_secret_here"

# Get from Stripe Dashboard > Webhooks:
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Get from Sentry Dashboard:
SENTRY_DSN="https://your_sentry_dsn_here"

# Get from Manus Platform:
OAUTH_SERVER_URL="https://your_oauth_server_url"
OWNER_OPEN_ID="your_owner_open_id"

# Optional: Get from appropriate providers:
REDIS_URL="redis://your_redis_url"
RESEND_API_KEY="re_your_resend_key"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

## Vercel CLI Commands

### Set a Single Variable
```bash
echo "VALUE_HERE" | vercel env add VARIABLE_NAME --environment=production
```

### Set All Critical Variables at Once
```bash
echo "postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL --environment=production

echo "h26EmSUcVSpNu6KAVODJz02y5+ANk8wN+fPKtojyJJ8=" | vercel env add JWT_SECRET --environment=production

echo "sk-ant-api03-***REDACTED***" | vercel env add ANTHROPIC_API_KEY --environment=production

echo "bb_live_hUMSzjMBUikuusBWG3wBy0MGzWQ" | vercel env add BROWSERBASE_API_KEY --environment=production

echo "70a57111-1ece-4bb6-adb8-7e1224dacc0d" | vercel env add BROWSERBASE_PROJECT_ID --environment=production
```

### List All Variables
```bash
vercel env list --environment=production
```

### View Specific Variable
```bash
vercel env get DATABASE_URL --environment=production
```

### Remove Variable
```bash
vercel env remove DATABASE_URL --environment=production
```

### Pull from Vercel to .env.local
```bash
vercel env pull --environment=production
```

---

## Verification Commands

### Health Check (Primary)
```bash
curl https://ghlagencyai.com/api/health
# Expected: { "status": "ok" }
```

### Database Connection
```bash
curl https://ghlagencyai.com/api/v1/health
# Expected: { "status": "ok", "db": "connected" }
```

### AI Integration
```bash
curl -X POST https://ghlagencyai.com/api/v1/ai/models
# Expected: { "models": [...] }
```

### Authentication Test
```bash
curl -X POST https://ghlagencyai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Expected: { "token": "..." } or { "error": "invalid credentials" }
# NOT: 500 error
```

### View Logs
```bash
vercel logs --follow --environment=production
```

---

## Summary Table

| Phase | Count | Critical | Status | Action |
|-------|-------|----------|--------|--------|
| Phase 1 | 5 | YES | ✗ NOT SET | URGENT - Set now |
| Phase 2 | 10 | YES | ✗ PARTIAL | Important - Set before launch |
| Phase 3 | 12 | NO | ✗ MISSING | Nice-to-have - Set when available |
| Phase 4 | 12+ | NO | ✗ MISSING | Optional - Only if needed |
| Auto | 8 | - | ✓ PROVIDED | Manus platform - Do not configure |

---

## Quick Triage

**What's broken?** → API returns 500 errors
**Why?** → Phase 1 variables not set in Vercel
**How to fix?** → Set 5 Phase 1 variables, redeploy
**How long?** → 15 minutes
**Difficulty?** → Easy (configuration only)

---

## Support Resources

- **Quick Fix:** DEPLOYMENT_QUICK_FIX.md
- **Complete Reference:** VERCEL_DEPLOYMENT_CHECKLIST.md
- **Technical Analysis:** VERCEL_FIX_TECHNICAL_ANALYSIS.md
- **Executive Summary:** DEPLOYMENT_EXECUTIVE_SUMMARY.md
- **Automated Setup:** VERCEL_ENV_SETUP.sh

---

**Created by:** Petra-DevOps
**Date:** 2025-12-18
**Status:** Ready to execute
**Next Step:** Run VERCEL_ENV_SETUP.sh or follow DEPLOYMENT_QUICK_FIX.md
