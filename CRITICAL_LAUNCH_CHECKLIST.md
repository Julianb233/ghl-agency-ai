# CRITICAL LAUNCH CHECKLIST
## GHL Agency AI - Final Verification Steps

**Target Launch:** Within 24-48 hours
**Current Status:** 95% Ready
**Production URL:** https://ghlagencyai.com

---

## 🔴 BLOCKING ITEMS (Must Complete Before Launch)

### Item 1: Build Verification ⏱️ 15 minutes
**Status:** ⬜ NOT STARTED

```bash
cd /root/github-repos/ghl-agency-ai
pnpm run check    # TypeScript type checking
pnpm run build    # Full production build
```

**Success Criteria:**
- ✅ Zero TypeScript errors
- ✅ Build completes successfully
- ✅ Output files generated in `dist/` directory
- ✅ No warnings about missing dependencies

**If Fails:**
- Review error messages
- Fix type errors in strict mode
- Verify all imports resolve correctly
- Check for circular dependencies

---

### Item 2: Router Export Validation ⏱️ 10 minutes
**Status:** ⬜ NOT STARTED

```bash
cat /root/github-repos/ghl-agency-ai/server/api/routers/index.ts | grep "export"
```

**Success Criteria:**
- ✅ File exists at `server/api/routers/index.ts`
- ✅ All 50 routers are exported
- ✅ No missing router files
- ✅ Export syntax is correct

**Expected Router List:**
```typescript
export { default as agent } from './agent';
export { default as browser } from './browser';
export { default as swarm } from './swarm';
export { default as memory } from './memory';
export { default as knowledge } from './knowledge';
export { default as costs } from './costs';
// ... (50 total routers)
```

**If Fails:**
- Create missing `index.ts` file
- Add all router exports
- Verify file paths are correct
- Test endpoints respond after fix

---

### Item 3: Database Migration Verification ⏱️ 10 minutes
**Status:** ⬜ NOT STARTED

```bash
# Connect to production database
psql $DATABASE_URL

# Check tables exist
\dt

# Verify critical tables
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
```

**Success Criteria:**
- ✅ Database connection successful
- ✅ All critical tables exist:
  - users, sessions, client_profiles
  - browser_sessions, automation_workflows
  - scheduled_tasks, webhooks
  - audit_logs, api_keys
  - cost_tracking, credit_usage
  - knowledge_base, rag_documents
  - swarm_agents, agent_memory
- ✅ Expected table count: ~40+ tables

**If Fails:**
- Run migrations: `pnpm db:push`
- Check migration errors
- Verify DATABASE_URL is correct
- Test database connectivity

---

### Item 4: Environment Variable Audit ⏱️ 20 minutes
**Status:** ⬜ NOT STARTED

**Location:** Vercel Dashboard → Settings → Environment Variables

**Critical Variables (MUST be set):**

#### Tier 1: Absolutely Required
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Strong random secret (32+ chars)
- [ ] `BROWSERBASE_API_KEY` - bb_live_xxx
- [ ] `BROWSERBASE_PROJECT_ID` - UUID format
- [ ] `STRIPE_SECRET_KEY` - sk_live_xxx
- [ ] `STRIPE_WEBHOOK_SECRET` - whsec_xxx

#### Tier 2: Required for AI (at least ONE)
- [ ] `ANTHROPIC_API_KEY` - sk-ant-xxx (Claude)
- [ ] `GEMINI_API_KEY` - AIza-xxx (Google)
- [ ] `OPENAI_API_KEY` - sk-xxx (OpenAI)

#### Tier 3: Required for Full Functionality
- [ ] `REDIS_URL` - Redis connection for caching
- [ ] `AWS_ACCESS_KEY_ID` - S3 storage
- [ ] `AWS_SECRET_ACCESS_KEY` - S3 storage
- [ ] `AWS_S3_BUCKET` - Bucket name
- [ ] `ENCRYPTION_KEY` - 64-char hex for OAuth tokens
- [ ] `RESEND_API_KEY` - Email delivery
- [ ] `SENTRY_DSN` - Error tracking
- [ ] `VITE_SENTRY_DSN` - Client-side error tracking

#### Tier 4: Optional (Enhanced Features)
- [ ] `GMAIL_CLIENT_ID` - Gmail OAuth
- [ ] `GMAIL_CLIENT_SECRET` - Gmail OAuth
- [ ] `OUTLOOK_CLIENT_ID` - Outlook OAuth
- [ ] `OUTLOOK_CLIENT_SECRET` - Outlook OAuth
- [ ] `META_APP_ID` - Meta Ads integration
- [ ] `META_APP_SECRET` - Meta Ads integration
- [ ] `GHL_API_KEY` - GoHighLevel integration
- [ ] `CDN_ENABLED` - CloudFront CDN
- [ ] `CLOUDFRONT_DISTRIBUTION_ID` - CDN distribution

**Success Criteria:**
- ✅ All Tier 1 variables set
- ✅ At least one Tier 2 AI key set
- ✅ All Tier 3 variables set
- ✅ No placeholder values (no "your-key-here")
- ✅ All secrets are production keys (not test keys)

**If Fails:**
- Add missing variables in Vercel
- Verify secrets are correct (test API calls)
- Redeploy after adding variables
- Test endpoints work after deployment

---

### Item 5: Production Health Check ⏱️ 5 minutes
**Status:** ⬜ NOT STARTED

```bash
# Test main health endpoint
curl -i https://ghlagencyai.com/api/health

# Test database health
curl -i https://ghlagencyai.com/api/health/database

# Test Redis health
curl -i https://ghlagencyai.com/api/health/redis

# Test auth endpoint
curl -i https://ghlagencyai.com/api/health/auth
```

**Success Criteria:**
- ✅ All endpoints return HTTP 200 OK
- ✅ Response JSON indicates healthy status
- ✅ Database connectivity confirmed
- ✅ Redis connectivity confirmed
- ✅ No error messages in logs

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-28T...",
  "uptime": "...",
  "database": "connected",
  "redis": "connected"
}
```

**If Fails:**
- Check Vercel deployment logs
- Verify database connection string
- Check Redis URL is correct
- Review error messages
- Test connectivity from server

---

## 🟡 HIGH PRIORITY (Complete Before Go-Live)

### Item 6: Production Smoke Tests ⏱️ 30 minutes
**Status:** ⬜ NOT STARTED

```bash
DEPLOYMENT_URL=https://ghlagencyai.com pnpm test:e2e:smoke
```

**Success Criteria:**
- ✅ Auth flow test passes
- ✅ Console errors test passes
- ✅ Health check test passes
- ✅ All 5 smoke tests green
- ✅ No unexpected failures

---

### Item 7: End-to-End Payment Test ⏱️ 20 minutes
**Status:** ⬜ NOT STARTED

**Steps:**
1. Visit https://ghlagencyai.com
2. Navigate to pricing page (verify page loads)
3. Click "Upgrade" or "Subscribe" button
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any valid ZIP (e.g., 12345)
5. Complete payment flow
6. Verify success message displayed
7. Check database for subscription record
8. Verify Stripe webhook processed

**Success Criteria:**
- ✅ Payment form displays correctly
- ✅ Stripe checkout completes
- ✅ Webhook processed successfully
- ✅ Database record created
- ✅ User redirected to dashboard

---

### Item 8: Browser Automation Test ⏱️ 15 minutes
**Status:** ⬜ NOT STARTED

**Steps:**
1. Login to https://ghlagencyai.com
2. Navigate to AI Browser panel
3. Fill in Execute tab:
   - Start URL: `https://example.com`
   - Instruction: `Find the "More information" link and click it`
4. Click "Execute Action"
5. Wait for result
6. Verify session ID returned
7. Check database for `browser_sessions` record

**Success Criteria:**
- ✅ Browserbase session created
- ✅ Automation executes successfully
- ✅ Result displayed in UI
- ✅ Session data persisted to database
- ✅ No errors in browser console

---

### Item 9: OAuth Integration Test ⏱️ 15 minutes
**Status:** ⬜ NOT STARTED

**Google OAuth:**
1. Click "Login with Google"
2. Complete OAuth flow
3. Verify redirect to dashboard
4. Check session created

**Success Criteria:**
- ✅ OAuth flow completes
- ✅ User authenticated
- ✅ Token stored securely
- ✅ Dashboard accessible

---

### Item 10: Performance Baseline ⏱️ 30 minutes
**Status:** ⬜ NOT STARTED

```bash
# Smoke test (quick)
pnpm test:load:smoke

# Load test (normal capacity)
pnpm test:load
```

**Success Criteria:**
- ✅ API response time < 1s for simple endpoints
- ✅ API response time < 5s for complex endpoints
- ✅ Error rate < 1%
- ✅ No 5xx errors
- ✅ System remains responsive under load

**Document Results:**
- Average response time: _______ ms
- P95 response time: _______ ms
- P99 response time: _______ ms
- Error rate: _______ %
- Requests per second: _______

---

## 🟢 RECOMMENDED (Nice to Have)

### Item 11: Monitoring Dashboard Setup ⏱️ 30 minutes
**Status:** ⬜ NOT STARTED

**Actions:**
- [ ] Configure Sentry alerts (email/Slack)
- [ ] Set up Vercel Analytics dashboard
- [ ] Create custom alert rules
- [ ] Configure on-call rotation
- [ ] Test alert notifications

---

### Item 12: Support Team Briefing ⏱️ 60 minutes
**Status:** ⬜ NOT STARTED

**Actions:**
- [ ] Share USER_GUIDE.md with support team
- [ ] Review common issues in TROUBLESHOOTING.md
- [ ] Demo critical workflows
- [ ] Set up support ticket system
- [ ] Define response SLAs

---

### Item 13: Final Security Review ⏱️ 30 minutes
**Status:** ⬜ NOT STARTED

**Checklist:**
- [ ] No hardcoded secrets in codebase
- [ ] SSL certificate valid and not expired
- [ ] Security headers configured (verify with curl -I)
- [ ] Rate limiting active on production
- [ ] Audit logs capturing all critical actions
- [ ] No sensitive data in error messages

---

## COMPLETION TRACKING

### Critical Items (MUST complete)
- [ ] Item 1: Build Verification
- [ ] Item 2: Router Export Validation
- [ ] Item 3: Database Migration Verification
- [ ] Item 4: Environment Variable Audit
- [ ] Item 5: Production Health Check

**Critical Items Complete:** 0/5 (0%)

### High Priority Items (SHOULD complete)
- [ ] Item 6: Production Smoke Tests
- [ ] Item 7: End-to-End Payment Test
- [ ] Item 8: Browser Automation Test
- [ ] Item 9: OAuth Integration Test
- [ ] Item 10: Performance Baseline

**High Priority Complete:** 0/5 (0%)

### Recommended Items (NICE to have)
- [ ] Item 11: Monitoring Dashboard Setup
- [ ] Item 12: Support Team Briefing
- [ ] Item 13: Final Security Review

**Recommended Complete:** 0/3 (0%)

---

## OVERALL PROGRESS

**Total Items:** 13
**Critical Path:** 5 items
**Estimated Time:** 3-5 hours for all critical + high priority items

**Current Status:**
- ⬜ Not Started (0%)
- 🟡 In Progress (0%)
- ✅ Complete (0%)

**Launch Blocker Status:** 🔴 BLOCKED (0/5 critical items complete)

---

## SIGN-OFF

Once all critical items are complete, sign off below:

**Technical Lead:** __________________ Date: __________

**QA Lead:** __________________ Date: __________

**DevOps Lead:** __________________ Date: __________

**CEO/Stakeholder:** __________________ Date: __________

---

## LAUNCH DECISION

**Decision:** ⬜ GO / ⬜ NO-GO

**Date/Time:** __________________

**Next Steps:** __________________

---

**Last Updated:** 2025-12-28
**Prepared By:** Tyler-TypeScript (QA Specialist)
**Status:** Ready for execution
