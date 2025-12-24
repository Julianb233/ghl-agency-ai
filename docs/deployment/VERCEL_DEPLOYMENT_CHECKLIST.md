# Vercel Deployment Fix - Complete Checklist

**Status:** Production APIs are returning 500 errors due to missing environment variables
**Target URL:** https://ghlagencyai.com (or https://bottleneck-bots.vercel.app)
**Date:** 2025-12-18

---

## CRITICAL: Required Environment Variables

These variables MUST be set in Vercel Dashboard for the API to function. Without them, all API endpoints return 500 errors.

### 1. Database Configuration
| Variable | Source | Description | Sensitivity |
|----------|--------|-------------|-------------|
| `DATABASE_URL` | Neon PostgreSQL | Full connection string with connection pooling | Secret |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL | Connection string without pooling (for migrations) | Secret |

**Current Value:** Available in `.env.local`
**Required:** Yes - API cannot initialize without this

### 2. Authentication & Security
| Variable | Source | Description | Sensitivity |
|----------|--------|-------------|-------------|
| `JWT_SECRET` | Generated/Stored | Secret key for JWT token signing | Secret |
| `ENCRYPTION_KEY` | Generated/Stored | 64-character hex key for OAuth token encryption | Secret |

**Current Values:** Available in `.env.local`
**Required:** Yes - Authentication will fail without these

### 3. OAuth & Authentication Providers
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console | OAuth 2.0 Client ID for Google login | Secret | Already set |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | OAuth 2.0 Client secret | Secret | Already set |
| `GOOGLE_REDIRECT_URI` | App Configuration | Callback URL for Google OAuth | Public | https://www.bottleneckbot.com/api/oauth/google/callback |
| `OAUTH_SERVER_URL` | Manus Platform | Internal OAuth server endpoint | Secret | Required for Manus |
| `OWNER_OPEN_ID` | Manus Platform | Owner OpenID identifier | Secret | Required for Manus |

**Status:** Google OAuth variables are set, but internal OAuth configuration missing

### 4. AI & Browser Automation APIs
| Variable | Source | Description | Sensitivity | Notes |
|----------|--------|-------------|-------------|-------|
| `ANTHROPIC_API_KEY` | Anthropic Console | Claude AI API key (primary AI model) | Secret | Already set in `.env.local` |
| `OPENAI_API_KEY` | OpenAI Dashboard | OpenAI GPT-4 API key (backup) | Secret | Already set in `.env.local` |
| `BROWSERBASE_API_KEY` | Browserbase Dashboard | Cloud browser automation API key | Secret | Already set in `.env.local` |
| `BROWSERBASE_PROJECT_ID` | Browserbase Dashboard | Project ID for browser automation | Secret | Already set in `.env.local` |
| `BROWSERBASE_REGION` | Browserbase Config | Region for browser instances (default: us-west-2) | Public | Optional - uses default if not set |
| `STAGEHAND_MODEL` | Config | AI model for browser intelligence | Public | Set to `anthropic/claude-sonnet-4-20250514` |
| `AI_MODEL` | Config | Fallback AI model selection | Public | Set to `google/gemini-2.0-flash` |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | Build Config | Skip browser download for Vercel | Public | Must be set to `1` for serverless |

**Status:** All required APIs are configured in `.env.local`

### 5. GoHighLevel (GHL) Integration
| Variable | Source | Description | Sensitivity | Notes |
|----------|--------|-------------|-------------|-------|
| `GHL_API_KEY` | GHL Dashboard | GoHighLevel API key for GHL operations | Secret | Check `.env.local` |
| `GHL_SECRET_KEY` | GHL Dashboard | GoHighLevel secret key | Secret | Already set in `.env.local` |
| `GHL_CLIENT_ID` | OAuth Provider | OAuth client ID for GHL login | Secret | May be same as GHL_API_KEY |
| `GHL_CLIENT_SECRET` | OAuth Provider | OAuth client secret for GHL login | Secret | Related to GHL_SECRET_KEY |
| `GHL_LOCATION_ID` | GHL Account | Default location ID for API operations | Public | Optional - set as needed |

**Status:** Some GHL variables configured, verify CLIENT_ID/CLIENT_SECRET

### 6. Payment & Billing (Stripe)
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Stripe secret API key (LIVE mode) | Secret | Already set (live key) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | Stripe publishable key | Public | Already set (live key) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Webhooks | Webhook signing secret | Secret | **EMPTY IN `.env.local` - MISSING** |

**Status:** Webhook secret is missing - must be configured

### 7. Error Tracking & Monitoring
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `SENTRY_DSN` | Sentry Dashboard | Error tracking DSN for server-side errors | Public | Required for production |
| `VITE_SENTRY_DSN` | Sentry Dashboard | Error tracking DSN for client-side errors | Public | Optional for client tracking |

**Status:** Not configured - recommended for production monitoring

### 8. Email Configuration
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `RESEND_API_KEY` | Resend Dashboard | Email API key (primary method) | Secret | Not in `.env.local` |
| `SMTP_HOST` | Email Provider | SMTP server hostname | Public | Optional fallback |
| `SMTP_PORT` | Email Provider | SMTP port (usually 587 or 465) | Public | Optional fallback |
| `SMTP_SECURE` | Config | Use TLS for SMTP connection | Public | Optional fallback |
| `SMTP_USER` | Email Provider | SMTP authentication username | Secret | Optional fallback |
| `SMTP_PASS` | Email Provider | SMTP authentication password | Secret | Optional fallback |
| `SUPPORT_EMAIL` | App Config | Support email address | Public | support@bottleneckbot.com |
| `ADMIN_NOTIFICATION_EMAIL` | App Config | Admin notification email | Public | admin@bottleneckbot.com |

**Status:** Not fully configured - email may be needed for notifications

### 9. Data Storage & Caching
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `REDIS_URL` | Redis Provider | Redis connection string for caching and rate limiting | Secret | Not set - optional but recommended |
| `REDIS_KEY_PREFIX` | Config | Prefix for Redis keys | Public | Default: `bb:` |
| `AWS_ACCESS_KEY_ID` | AWS IAM | AWS access key for S3 storage | Secret | Not set - optional |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM | AWS secret key for S3 storage | Secret | Not set - optional |
| `AWS_REGION` | AWS Config | AWS region for S3 (default: us-east-1) | Public | Optional |
| `AWS_S3_BUCKET` | AWS S3 | S3 bucket name for file storage | Public | Optional |
| `CDN_ENABLED` | Config | Enable CloudFront CDN | Public | false |
| `CLOUDFRONT_DISTRIBUTION_ID` | AWS CloudFront | CloudFront distribution ID | Public | Optional |
| `CLOUDFRONT_DOMAIN` | AWS CloudFront | CloudFront domain name | Public | Optional |
| `CLOUDFRONT_KEY_PAIR_ID` | AWS CloudFront | Key pair ID for signed URLs | Secret | Optional |
| `CLOUDFRONT_PRIVATE_KEY` | AWS CloudFront | Private key for signed URLs | Secret | Optional |

**Status:** Not configured - optional for now but needed for file storage

### 10. Other Integrations
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `META_APP_ID` | Meta Developers | Facebook/Meta app ID for ads | Secret | Not set |
| `META_APP_SECRET` | Meta Developers | Facebook/Meta app secret | Secret | Not set |
| `META_REDIRECT_URI` | Config | OAuth redirect URI for Meta | Public | http://localhost:3000/oauth/meta/callback |
| `GMAIL_CLIENT_ID` | Google Cloud | Gmail OAuth client ID | Secret | Not set |
| `GMAIL_CLIENT_SECRET` | Google Cloud | Gmail OAuth client secret | Secret | Not set |
| `GMAIL_REDIRECT_URI` | Config | Gmail OAuth redirect URI | Public | http://localhost:3000/api/oauth/gmail/callback |
| `OUTLOOK_CLIENT_ID` | Azure AD | Outlook OAuth client ID | Secret | Not set |
| `OUTLOOK_CLIENT_SECRET` | Azure AD | Outlook OAuth client secret | Secret | Not set |
| `OUTLOOK_REDIRECT_URI` | Config | Outlook OAuth redirect URI | Public | http://localhost:3000/api/oauth/outlook/callback |
| `SLACK_WEBHOOK_URL` | Slack Workspace | Slack webhook for notifications | Secret | Not set - optional |
| `NOTION_API_KEY` | Notion Dashboard | Notion integration API key | Secret | Not set - optional |
| `NOTION_DATABASE_ID` | Notion | Notion database ID | Public | Not set - optional |

**Status:** Optional integrations - focus on core variables first

### 11. Application Configuration
| Variable | Source | Description | Sensitivity | Status |
|----------|--------|-------------|-------------|--------|
| `NODE_ENV` | Vercel | Set automatically to `production` | Public | Vercel sets this |
| `PORT` | Config | Server port (usually ignored by Vercel) | Public | Default: 3000 |
| `VITE_APP_ID` | App Config | Application ID | Public | Already set |
| `VITE_APP_TITLE` | App Config | Application title displayed in UI | Public | Already set: "Bottleneck Bot" |
| `VITE_APP_LOGO` | App Config | Path to application logo | Public | Already set: "/logo.png" |
| `APP_URL` | Config | Full application URL for redirects | Public | https://www.bottleneckbot.com |
| `SESSION_CLEANUP_INTERVAL` | Config | Session cleanup interval in ms | Public | Optional - default: 300000 |

**Status:** Most application config already set

### 12. Manus Platform Integration
These variables are automatically provided by Manus platform:
- `BUILT_IN_FORGE_API_KEY`
- `BUILT_IN_FORGE_API_URL`
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `VITE_OAUTH_PORTAL_URL`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `OWNER_NAME`

**Status:** Provided by Manus - do not manually configure

---

## Vercel CLI Setup Commands

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Link Project to Vercel
```bash
cd /root/github-repos/bottleneck-bots
vercel link
# Select the correct project: bottleneck-bots
```

### Step 3: Pull Current Environment Variables
```bash
vercel env pull --environment=production
# This will create/update .env.local with production vars
```

### Step 4: Set Environment Variables - Command Format
For each variable, use the following format:

```bash
vercel env add VARIABLE_NAME --environment=production
# Paste the value when prompted
# Repeat for all variables
```

Or use the shorthand for setting multiple variables:

```bash
vercel env add DATABASE_URL --environment=production
vercel env add JWT_SECRET --environment=production
vercel env add ANTHROPIC_API_KEY --environment=production
vercel env add BROWSERBASE_API_KEY --environment=production
vercel env add BROWSERBASE_PROJECT_ID --environment=production
# ... and so on for each variable
```

### Step 5: List All Environment Variables
```bash
vercel env list --environment=production
```

### Step 6: Verify Specific Variable
```bash
vercel env get DATABASE_URL --environment=production
```

### Step 7: Redeploy Application
```bash
vercel deploy --prod
```

---

## Priority Implementation Order

### PHASE 1: Critical (Must have immediately)
These variables MUST be set for the API to work at all:

1. **DATABASE_URL** - PostgreSQL connection string
2. **JWT_SECRET** - Authentication secret
3. **ANTHROPIC_API_KEY** - Primary AI model
4. **BROWSERBASE_API_KEY** - Browser automation
5. **BROWSERBASE_PROJECT_ID** - Browser project ID

### PHASE 2: Important (Set before public launch)
These variables enable key features:

1. **STRIPE_WEBHOOK_SECRET** - Payment webhooks
2. **SENTRY_DSN** - Error tracking
3. **GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET** - Google login
4. **OAUTH_SERVER_URL** - Manus OAuth
5. **OWNER_OPEN_ID** - Manus owner identification
6. **GHL_API_KEY** & **GHL_SECRET_KEY** - GoHighLevel integration

### PHASE 3: Nice-to-have (Can add later)
These enhance functionality but are optional:

1. **REDIS_URL** - Improves performance (caching/rate limiting)
2. **RESEND_API_KEY** - Email service
3. **GMAIL_CLIENT_ID** & **GMAIL_CLIENT_SECRET** - Gmail integration
4. **META_APP_ID** & **META_APP_SECRET** - Meta ads integration
5. **SLACK_WEBHOOK_URL** - Error notifications

---

## Existing Variables Already in Vercel

Based on `.env.local`, these are already configured:

```
ANTHROPIC_API_KEY=sk-ant-api03-***REDACTED***
BROWSERBASE_API_KEY=bb_live_hUMSzjMBUikuusBWG3wBy0MGzWQ
BROWSERBASE_PROJECT_ID=70a57111-1ece-4bb6-adb8-7e1224dacc0d
DATABASE_URL=postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
ENCRYPTION_KEY=3640d44712afa7a923060558365502db2ecf164ca3c78548815db90fcc62c1c8
GOOGLE_CLIENT_ID=1012840656772-gh3q2r5844adatke21ra2k7j6c5ecm12.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://www.bottleneckbot.com/api/oauth/google/callback
JWT_SECRET=h26EmSUcVSpNu6KAVODJz02y5+ANk8wN+fPKtojyJJ8=
OPENAI_API_KEY=sk-proj-***REDACTED***
STAGEHAND_MODEL=anthropic/claude-sonnet-4-20250514
VITE_APP_LOGO=/logo.png
VITE_APP_TITLE=Bottleneck Bot
GHL_SECRET_KEY=mk_1SfWFRI3WuyTifeMYR6iKzBH
STRIPE_SECRET_KEY=sk_live_***REDACTED***
STRIPE_PUBLISHABLE_KEY=pk_live_1SfWFRI3WuyTifeMYR6iKzBH
```

**Still Missing in Vercel:**
- STRIPE_WEBHOOK_SECRET
- SENTRY_DSN
- OAUTH_SERVER_URL
- OWNER_OPEN_ID
- GHL_API_KEY (check if same as GHL_SECRET_KEY)
- GHL_CLIENT_ID / GHL_CLIENT_SECRET
- REDIS_URL
- Manus-specific variables

---

## Configuration Verification Steps

### Step 1: Test API Health Check
After environment variables are set and redeployed:

```bash
# Test the health endpoint
curl https://ghlagencyai.com/api/health
# or
curl https://bottleneck-bots.vercel.app/api/health

# Expected response (200 OK):
# { "status": "ok", "timestamp": "2025-12-18T..." }

# Current response (500 Error):
# { "error": "FUNCTION_INVOCATION_FAILED" }
```

### Step 2: Verify Database Connection
```bash
# Check if database is initialized
curl https://ghlagencyai.com/api/v1/health
```

### Step 3: Test Authentication
```bash
# Verify JWT is working
curl -X POST https://ghlagencyai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Step 4: Test AI Integration
```bash
# Verify Anthropic API key works
curl -X POST https://ghlagencyai.com/api/v1/ai/completion \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

### Step 5: Check Vercel Logs
```bash
# View real-time deployment logs
vercel logs --follow

# View build logs
vercel logs --follow --build

# View function logs
vercel logs --follow --function
```

---

## Troubleshooting

### Issue: API Still Returns 500 After Setting Variables

**Possible Causes:**
1. Variables not marked as "Secret" (public vars may not be available at runtime)
2. Deployment not restarted after adding variables
3. Variables have incorrect format (e.g., missing protocol in URL)
4. Database connection string has wrong credentials

**Solution:**
```bash
# Redeploy after adding variables
vercel deploy --prod

# Or trigger a redeploy from GitHub by pushing a commit
git commit --allow-empty -m "trigger deployment"
git push origin main
```

### Issue: DATABASE_URL Connection Timeout

**Possible Causes:**
1. Connection pooling endpoint vs direct endpoint used incorrectly
2. Neon project in different region
3. Firewall blocking Vercel IP ranges

**Solution:**
1. Use the pooling endpoint for connection pooling: `.c-3.us-east-1.aws.neon.tech-pooler`
2. For migrations, use unpooled: `.c-3.us-east-1.aws.neon.tech`
3. Verify Neon project allows connections from Vercel IPs

### Issue: Anthropic API Key Invalid

**Solution:**
1. Verify the key is not truncated (keys can be very long)
2. Check key is from the correct Anthropic account
3. Ensure key has not been revoked in console
4. Test key locally first:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### Issue: Stripe Webhooks Not Working

**Solution:**
1. Get webhook secret from Stripe Dashboard > Webhooks
2. The secret starts with `whsec_` not the signing key
3. Set it as `STRIPE_WEBHOOK_SECRET` in Vercel
4. Configure webhook endpoint to: `https://ghlagencyai.com/api/webhooks/stripe`

---

## After Deployment Checklist

- [ ] All required Phase 1 variables set in Vercel
- [ ] Deployment completed successfully with `vercel deploy --prod`
- [ ] Health check endpoint returns 200 OK
- [ ] Database connection established
- [ ] Authentication working (can login)
- [ ] AI completions work (Anthropic API responding)
- [ ] Browser automation works (Browserbase connected)
- [ ] Stripe webhook secret configured and tested
- [ ] Sentry DSN configured for error tracking
- [ ] Email service configured (Resend or SMTP)
- [ ] Monitor error logs for the first hour
- [ ] Test full user flow (login -> use app -> payment)
- [ ] Verify OAuth integrations working
- [ ] Check performance and response times

---

## Quick Reference: All Variables by Category

### Must Have Now
```
DATABASE_URL
JWT_SECRET
ANTHROPIC_API_KEY
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
```

### Add Before Public Launch
```
STRIPE_WEBHOOK_SECRET
SENTRY_DSN
OAUTH_SERVER_URL
OWNER_OPEN_ID
GHL_API_KEY
GHL_CLIENT_ID
GHL_CLIENT_SECRET
```

### Recommended
```
REDIS_URL
RESEND_API_KEY
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
```

### Optional
```
META_APP_ID
META_APP_SECRET
SLACK_WEBHOOK_URL
NOTION_API_KEY
NOTION_DATABASE_ID
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET
CLOUDFRONT_DISTRIBUTION_ID
```

---

## File Locations Reference

- `.env.example` - Template for all possible variables
- `.env.vercel.example` - Vercel-specific template
- `.env.local` - **Contains actual production values** (DO NOT COMMIT)
- `vercel.json` - Vercel deployment configuration
- `PRODUCTION_READINESS_REPORT.md` - Full production status report

---

## Support & Documentation

- Vercel Docs: https://vercel.com/docs/concepts/projects/environment-variables
- Anthropic API: https://docs.anthropic.com/
- Browserbase: https://docs.browserbase.com/
- Stripe: https://stripe.com/docs/api
- PostgreSQL/Neon: https://neon.tech/docs/

---

**Created by:** Petra-DevOps
**Status:** Ready to implement
**Next Step:** Execute Vercel CLI commands to set variables and redeploy
