# Vercel Deployment Quick Fix - Step-by-Step Guide

**Problem:** API returns 500 errors - Missing environment variables
**Solution Time:** 15-30 minutes
**Success Rate:** 99% (if all variables available)

---

## FAST TRACK: 5-Minute Solution

If you're in a hurry, run this:

```bash
cd /root/github-repos/bottleneck-bots

# 1. Install Vercel CLI
npm install -g vercel

# 2. Login and link project
vercel login
vercel link

# 3. Run the automated setup
bash VERCEL_ENV_SETUP.sh

# 4. Redeploy
vercel deploy --prod

# 5. Verify
curl https://ghlagencyai.com/api/health
# Should return: { "status": "ok" }
```

Done! API should be working.

---

## DETAILED WALKTHROUGH

### Step 1: Prepare Your Environment

**A. Verify You Have the Required Information**

Open `.env.local` in the project directory and confirm these variables exist with values:

```bash
cat /root/github-repos/bottleneck-bots/.env.local | head -20
```

You should see:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
BROWSERBASE_API_KEY=bb_live_...
BROWSERBASE_PROJECT_ID=70a57111-...
DATABASE_URL=postgresql://...
JWT_SECRET=h26EmSUc...
```

If `.env.local` is missing, you need to get the environment variables from your deployment system or Notion.

**B. Install Vercel CLI**

```bash
npm install -g vercel
```

Verify installation:
```bash
vercel --version
# Should output: Vercel CLI 37.x.x (or newer)
```

### Step 2: Authenticate with Vercel

```bash
vercel login
```

This opens a browser for OAuth authentication. Complete the login process.

Verify you're logged in:
```bash
vercel whoami
# Should output your Vercel account name
```

### Step 3: Link Project to Vercel

Navigate to the project directory:
```bash
cd /root/github-repos/bottleneck-bots
```

Link the project:
```bash
vercel link
```

When prompted:
- **Set up and deploy?** → `Y` (yes)
- **Which scope should contain your project?** → Select your account
- **Found existing Vercel project. Link to it?** → `Y` (yes, to bottleneck-bots)
- **Local settings saved to .vercel/project.json**

### Step 4: Pull Current Production Variables

```bash
vercel env pull --environment=production
```

This updates `.env.local` with the current Vercel production environment variables (if any).

### Step 5: Set Environment Variables (3 Options)

#### OPTION A: Automated Script (Recommended)

```bash
bash VERCEL_ENV_SETUP.sh
```

This script:
- Reads values from `.env.local`
- Sets them in Vercel production environment
- Shows progress for each variable
- Handles errors gracefully

#### OPTION B: Manual CLI Commands

Run these commands one by one (values from `.env.local`):

```bash
# Critical Variables (Must Have)
echo "DATABASE_URL_VALUE" | vercel env add DATABASE_URL --environment=production
echo "JWT_SECRET_VALUE" | vercel env add JWT_SECRET --environment=production
echo "ANTHROPIC_API_KEY_VALUE" | vercel env add ANTHROPIC_API_KEY --environment=production
echo "BROWSERBASE_API_KEY_VALUE" | vercel env add BROWSERBASE_API_KEY --environment=production
echo "BROWSERBASE_PROJECT_ID_VALUE" | vercel env add BROWSERBASE_PROJECT_ID --environment=production

# Important Variables
echo "GHL_API_KEY_VALUE" | vercel env add GHL_API_KEY --environment=production
echo "GHL_SECRET_KEY_VALUE" | vercel env add GHL_SECRET_KEY --environment=production
echo "ENCRYPTION_KEY_VALUE" | vercel env add ENCRYPTION_KEY --environment=production
echo "STRIPE_WEBHOOK_SECRET_VALUE" | vercel env add STRIPE_WEBHOOK_SECRET --environment=production
echo "SENTRY_DSN_VALUE" | vercel env add SENTRY_DSN --environment=production
```

#### OPTION C: Vercel Dashboard (Web UI)

1. Go to https://vercel.com/dashboard
2. Click project: **bottleneck-bots**
3. Go to **Settings** > **Environment Variables**
4. Click **Add New**
5. For each variable:
   - Name: (e.g., `DATABASE_URL`)
   - Value: (paste from `.env.local`)
   - Select `Production` environment
   - Click **Save**
6. Repeat for all variables from the checklist

### Step 6: Verify Variables Were Set

```bash
vercel env list --environment=production
```

You should see a table with variables. Verify the critical ones are present:
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] ANTHROPIC_API_KEY
- [ ] BROWSERBASE_API_KEY
- [ ] BROWSERBASE_PROJECT_ID

### Step 7: Redeploy Application

Trigger a new production deployment:

```bash
vercel deploy --prod
```

This will:
1. Build the application
2. Use the new environment variables
3. Deploy to Vercel

Watch the output for:
- "Build completed in X seconds"
- "Deployed to https://bottleneck-bots.vercel.app"
- No error messages

### Step 8: Verify Deployment Success

Wait 30 seconds for deployment to propagate, then test:

```bash
# Test 1: Health Check (Most Important)
curl https://ghlagencyai.com/api/health

# Expected output:
# { "status": "ok", "timestamp": "2025-12-18T..." }

# If you get 500 error, see troubleshooting below
```

Test with the alternate domain:
```bash
curl https://bottleneck-bots.vercel.app/api/health
```

Test other endpoints:
```bash
# Test 2: Database Connection
curl https://ghlagencyai.com/api/v1/health

# Test 3: AI Integration
curl -X POST https://ghlagencyai.com/api/v1/ai/models

# Test 4: Authentication (should work or give proper auth error, not 500)
curl -X POST https://ghlagencyai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Step 9: Monitor Logs

```bash
# View real-time logs
vercel logs --follow

# If you see errors, read the full error message
# Look for: "DATABASE_URL not set" or "API key missing"
```

---

## Troubleshooting

### Issue 1: Health Check Still Returns 500

**Cause:** Variables not set or deployment not complete

**Solution:**
```bash
# Option 1: Wait 2 minutes and try again
sleep 120
curl https://ghlagencyai.com/api/health

# Option 2: Verify variables are actually set
vercel env list --environment=production | grep DATABASE_URL
# Should show: DATABASE_URL ••••••

# Option 3: Check logs for specific error
vercel logs --follow
# Look for the actual error message
```

### Issue 2: "Variable already exists" Error

**Cause:** Variable was already set in Vercel

**Solution:** This is fine! It means the variable is already configured. The script will skip it.

### Issue 3: DATABASE_URL Connection Timeout

**Cause:** Database connection string may be wrong or database down

**Solution:**
```bash
# Test the connection string locally
psql "$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-)"

# If that fails, get a fresh connection string from Neon:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Copy the connection string (with pooling)
# 4. Update Vercel: vercel env remove DATABASE_URL && echo "NEW_VALUE" | vercel env add DATABASE_URL
```

### Issue 4: API Key Invalid

**Cause:** API key may be incomplete, truncated, or expired

**Solution:**
```bash
# Check the value in .env.local is complete
grep "^ANTHROPIC_API_KEY=" .env.local

# Verify it doesn't end abruptly
# It should be quite long (100+ characters)

# If incorrect:
# 1. Get fresh key from API provider console
# 2. Update Vercel: vercel env remove ANTHROPIC_API_KEY && echo "NEW_KEY" | vercel env add ANTHROPIC_API_KEY
# 3. Redeploy: vercel deploy --prod
```

### Issue 5: "Vercel link" Not Working

**Cause:** Project not connected to Vercel or CLI not authenticated

**Solution:**
```bash
# Check if logged in
vercel whoami
# If error, run: vercel login

# Check if project linked
ls -la .vercel/
# Should see: project.json, project.lstat

# If not linked, manually specify:
vercel link --project=bottleneck-bots --team=your-team
```

### Issue 6: 403 Permission Denied

**Cause:** User account doesn't have access to project

**Solution:**
1. Verify you're logged in as correct user: `vercel whoami`
2. Ask project owner to add you as team member
3. Or use a different account that has access

---

## Verification Checklist

Run this checklist after deployment:

```bash
# 1. Variables Set in Vercel
vercel env list --environment=production | wc -l
# Should show 30+ variables

# 2. Critical Variables Present
vercel env list --environment=production | grep -E "DATABASE_URL|JWT_SECRET|ANTHROPIC"
# Should show 3+ lines

# 3. API Health Check
curl -s https://ghlagencyai.com/api/health | jq .
# Should output: { "status": "ok" }

# 4. Check Logs for Errors
vercel logs --environment=production | head -20
# Should show: "Database connected" or "Server started"
# Should NOT show: "ERROR" or "DATABASE_URL not set"

# 5. Test Database Connection
curl -s https://ghlagencyai.com/api/v1/health | jq .
# Should return valid response, not 500

# 6. Test Authentication
curl -s -X POST https://ghlagencyai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' | jq .
# Should return either { "token": "..." } or { "error": "invalid credentials" }
# NOT 500 error

# 7. Full URL Test
curl -I https://ghlagencyai.com
# Should show: HTTP/1.1 200 OK
# With HTTPS/SSL certificate
```

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)
- [ ] Monitor logs for errors: `vercel logs --follow`
- [ ] Test critical user flows (login, create project, run task)
- [ ] Check error tracking (Sentry) for new errors
- [ ] Verify database connections stable

### Short-term (Within 24 Hours)
- [ ] Run full test suite against production
- [ ] Verify OAuth flows working (Google login, etc.)
- [ ] Check Stripe webhook processing
- [ ] Monitor API response times and error rates

### Medium-term (Within 1 Week)
- [ ] Add remaining optional environment variables (Redis, email, etc.)
- [ ] Set up monitoring and alerting
- [ ] Create runbooks for common issues
- [ ] Document the deployment process

---

## Key Files Reference

| File | Purpose | Location |
|------|---------|----------|
| `.env.local` | Actual production values | `/root/github-repos/bottleneck-bots/.env.local` |
| `.env.example` | Template of all variables | `/root/github-repos/bottleneck-bots/.env.example` |
| `vercel.json` | Vercel deployment config | `/root/github-repos/bottleneck-bots/vercel.json` |
| `VERCEL_DEPLOYMENT_CHECKLIST.md` | Complete variable reference | `/root/github-repos/bottleneck-bots/VERCEL_DEPLOYMENT_CHECKLIST.md` |
| `VERCEL_ENV_SETUP.sh` | Automated setup script | `/root/github-repos/bottleneck-bots/VERCEL_ENV_SETUP.sh` |

---

## Emergency Rollback

If something goes wrong and you need to revert:

```bash
# Option 1: Restore from last working deployment
vercel rollback

# Option 2: Remove problematic variable and redeploy
vercel env remove PROBLEMATIC_VAR
vercel deploy --prod

# Option 3: Full reset (removes all variables)
vercel env pull --yes  # Restore from backup
vercel deploy --prod
```

---

## Success Indicators

Your deployment is successful when:

1. ✓ `curl https://ghlagencyai.com/api/health` returns 200
2. ✓ No 500 errors in Vercel logs
3. ✓ Database queries working (users can login)
4. ✓ API endpoints responding with proper data
5. ✓ No "DATABASE_URL not set" errors in logs
6. ✓ Authentication tokens being generated
7. ✓ AI requests processing (no API key errors)
8. ✓ Error tracking working (Sentry receiving errors)

---

## Support & Documentation

| Resource | Link |
|----------|------|
| Vercel Environment Variables | https://vercel.com/docs/concepts/projects/environment-variables |
| Vercel CLI Docs | https://vercel.com/docs/cli |
| PostgreSQL/Neon | https://neon.tech/docs/ |
| Anthropic API | https://docs.anthropic.com/ |
| Stripe Webhooks | https://stripe.com/docs/webhooks |

---

## Time Estimates

| Task | Time | Done |
|------|------|------|
| Install Vercel CLI | 2 min | [ ] |
| Authenticate & link | 3 min | [ ] |
| Set environment variables | 5 min | [ ] |
| Redeploy | 3 min | [ ] |
| Verify endpoints | 2 min | [ ] |
| Monitor logs | 5 min | [ ] |
| **Total** | **20 min** | |

---

**Status:** Ready to execute
**Next Step:** Run Step 1, then follow the guide
**Expected Result:** API returns 200 OK instead of 500 errors

Good luck! You've got this.

---

**Created by:** Petra-DevOps
**Date:** 2025-12-18
**Version:** 1.0
