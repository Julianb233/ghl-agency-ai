# GHL Agency AI - Incident Response Runbook

**Purpose:** Quick reference guide for responding to uptime alerts
**Updated:** 2025-12-20
**Used By:** Engineering team, on-call rotation

---

## Quick Decision Tree

```
Alert received in #alerts channel?
│
├─ YES: Server Liveness or Readiness down?
│   └─ YES: CRITICAL - Follow P0 Response (below)
│   └─ NO: Continue checking...
│
├─ Frontend down? (ghlagencyai.com won't load)
│   └─ YES: HIGH - Follow P1 Response (below)
│
└─ Other alert?
    └─ MEDIUM - Follow P2 Response (below)
```

---

## P0 - Critical Response (Liveness/Readiness Down)

**Target Response Time:** Immediate (0-5 minutes)
**Impact:** Complete outage - no users can access service

### Step 1: Acknowledge Alert (1 minute)

```
In Slack #alerts channel:
"@Petra Investigating P0 incident - Liveness/Readiness down"
```

### Step 2: Verify the Issue (2 minutes)

```bash
# Test health endpoint manually
curl -v https://ghlagencyai.com/api/trpc/health.liveness

# Expected: 200 OK response within 1 second
# If getting connection refused: server is down
# If getting 500 error: server crashed
# If getting timeout: network issue
```

### Step 3: Check External Status (1 minute)

1. **Check Vercel Status:**
   - Visit https://www.vercelstatus.com
   - If red status, it's a platform outage (not our issue)
   - Wait for Vercel to recover

2. **Check BetterStack Dashboard:**
   - Login to https://betterstack.com
   - View incident details
   - Check which regions are detecting downtime
   - See if incident timeline shows recovery attempts

### Step 4: Determine Root Cause (2-3 minutes)

**Is it a deployment issue?**
```bash
# Check Vercel deployment status
# Visit: https://vercel.com/dashboard → Click project
# View recent deployments
# If red: rollback to last working version
```

**Is the code crashing?**
```bash
# Check function logs in Vercel
# Vercel Dashboard → Functions → View logs
# Look for errors in past 2-5 minutes
```

**Is it an external service dependency?**
```bash
# Check circuit breaker status
# Call: /api/trpc/health.getCircuitStates
# See which service is down (vapi, apify, browserbase, etc.)
```

**Is it a network/DNS issue?**
```bash
# Test DNS resolution
nslookup ghlagencyai.com

# Test from another location
# Ask teammate to test from different network
```

### Step 5: Take Action (Immediate)

**Option A: Redeploy (if code issue)**
1. Check git for recent changes
2. Rollback to last known good version
3. Or fix the issue and redeploy
4. Monitor health endpoint recovery

**Option B: Restart Service (if temporary glitch)**
1. In Vercel: Redeploy current version
2. Monitor for recovery

**Option C: Escalate (if infrastructure issue)**
1. Contact Vercel support (https://vercel.com/support)
2. Post to #alerts that escalation in progress
3. Continue monitoring BetterStack

### Step 6: Communicate (Continuous)

**Every 5 minutes:**
```
Slack #alerts:
"[15:42] Still investigating - [Brief status]"
"[15:47] Found issue: [Description]"
"[15:52] Deploying fix..."
"[15:55] Testing recovery... monitoring /api/trpc/health.liveness"
```

### Step 7: Verify Recovery (2 minutes)

Once service is responding:

```bash
# Test health endpoint
curl https://ghlagencyai.com/api/trpc/health.liveness
# Should return: {"status":"ok",...}

# Check BetterStack
# Wait 2-3 minutes for monitors to confirm recovery
# Should see "Up" status in all regions
```

### Step 8: Post-Incident (After resolution)

```
Slack #alerts:
"[RESOLVED] P0 Incident resolved at 15:58
Root Cause: [Description]
Duration: 16 minutes
Preventions: [What we'll do to prevent]"
```

### P0 Alert Checklist

- [ ] Alert acknowledged in Slack
- [ ] Health endpoint tested manually
- [ ] Vercel status checked
- [ ] Root cause identified
- [ ] Action taken (redeploy/rollback/escalate)
- [ ] Recovery verified
- [ ] Team communicated status
- [ ] Post-incident summary posted

---

## P1 - High Priority Response (Frontend Down)

**Target Response Time:** 5-10 minutes
**Impact:** Users can't access web dashboard, but API might be working

### Symptoms
- Alert: "GHL Agency AI - Web Dashboard down"
- Users can't visit https://ghlagencyai.com
- Health endpoint might still be working

### Quick Response

1. **Acknowledge:** Post in #alerts "Investigating P1 - Frontend"

2. **Test Frontend:**
   ```bash
   curl -v https://ghlagencyai.com/
   # Should return HTML (status 200)
   # If not: check Vercel, check build logs
   ```

3. **Check Vercel:**
   - Dashboard → Recent deployments
   - Last deployment status
   - Build logs if failed

4. **Check API Endpoints:**
   ```bash
   curl https://ghlagencyai.com/api/trpc/health.liveness
   # If API works but frontend fails: static file issue
   # If API also fails: P0 issue, escalate
   ```

5. **Possible Fixes:**
   - Redeploy latest version
   - Check for missing static assets
   - Verify environment variables

6. **Update:** Post status every 5 minutes in #alerts

### P1 Checklist

- [ ] Acknowledged in Slack
- [ ] Frontend tested (curl)
- [ ] API status verified
- [ ] Vercel build status checked
- [ ] Action taken
- [ ] Recovery verified
- [ ] Status updated in Slack

---

## P2 - Medium Priority Response (Metrics or Performance Alert)

**Target Response Time:** 15-30 minutes
**Impact:** Performance degradation or metric endpoint issues

### Symptoms
- Alert: "Metrics Endpoint down" or "Response time high"
- Service is still running and accessible
- Some functionality might be slow

### Quick Response

1. **Acknowledge:** "Investigating P2 - Performance/Metrics"

2. **Check Metrics Endpoint:**
   ```bash
   curl https://ghlagencyai.com/api/trpc/health.getMetrics
   # Should return JSON with metrics
   ```

3. **Check Response Times:**
   - Login to BetterStack
   - View response time graph
   - Identify slow endpoints
   - Check if trending up or isolated spike

4. **Determine Cause:**
   - Database slow? (heavy queries)
   - External service slow? (check circuit breaker)
   - Traffic spike? (normal, monitor)
   - Resource exhaustion? (CPU/memory)

5. **Action:**
   - If database slow: optimize queries or check Neon status
   - If external service: might be outside our control
   - If traffic spike: expected during peak hours
   - If resource issue: scale up or optimize code

6. **Monitor:** Check metrics every 10 minutes

### P2 Checklist

- [ ] Acknowledged in Slack
- [ ] Endpoint tested
- [ ] Root cause identified
- [ ] Action taken (if applicable)
- [ ] Status updated
- [ ] Monitoring increased

---

## Service Dependency Troubleshooting

Your app depends on these external services. If failing, shows in circuit breaker status.

### Browserbase (Cloud Browser) - Most Critical

**Symptoms:** Browser automation not working, sessions fail to start

**Quick Check:**
```bash
curl https://ghlagencyai.com/api/trpc/health.getCircuitStates
# Look for "browserbase": "open" (indicates failure)
```

**Troubleshooting:**
1. Check https://www.browserbase.com/status
2. Verify API key in environment (check Vercel settings)
3. Check Browserbase account isn't rate-limited
4. Restart service (redeploy)

### OpenAI / Anthropic (AI Models)

**Symptoms:** AI features not working, slow responses

**Quick Check:**
```bash
curl https://ghlagencyai.com/api/trpc/health.getMetrics
# Check openai and anthropic service states
```

**Troubleshooting:**
1. Check https://status.openai.com (OpenAI status)
2. Verify API keys valid in environment
3. Check rate limits: get current usage
4. Fallback to other model if available

### Vapi (Voice AI)

**Symptoms:** Voice/phone features not working

**Quick Check:**
```bash
# Check circuit breaker
curl https://ghlagencyai.com/api/trpc/health.getCircuitStates
# Look for "vapi" state
```

**Troubleshooting:**
1. Verify API key in Vercel environment
2. Check Vapi account status/credits
3. Check if rate limited
4. Contact Vapi support if persistent

### Gmail / Outlook (Email Integration)

**Symptoms:** Email sending fails, OAuth issues

**Quick Check:**
```bash
# Check service health
curl https://ghlagencyai.com/api/trpc/health.getServiceAvailability
# Check gmail and outlook status
```

**Troubleshooting:**
1. Verify OAuth tokens aren't expired
2. Refresh credentials in integration settings
3. Check Gmail/Microsoft API quotas
4. Re-authenticate if needed

---

## Communication Templates

### Initial Alert (Immediately)

```
⚠️ [LEVEL] INCIDENT: [Service] - [Brief description]
Time: [HH:MM UTC]
Status: Investigating
Investigating: @[Your name]
Updates: Every 5 minutes
```

### Update (Every 5 minutes while investigating)

```
[HH:MM UTC] Status Update:
Investigation: [What you've checked]
Finding: [What you found]
Next Step: [What you're doing]
```

### Resolution (When fixed)

```
✅ RESOLVED: [Service] is back online
Time Down: [X minutes]
Root Cause: [Brief description]
Fix: [What fixed it]
Next: Will investigate root cause and implement prevention
```

---

## Escalation Contacts

If you can't resolve within target time:

| Severity | Contact | Method |
|----------|---------|--------|
| **P0** | Petra-DevOps | Slack @Petra or phone |
| **P0** | Backup contact | [Name] |
| **P0** | Vercel Support | https://vercel.com/support |
| **P1** | Team Lead | Slack notification |
| **P2** | Team Lead | Slack (no urgency) |

---

## Common Issues & Quick Fixes

### Issue: Server returns 503 Service Unavailable

**Cause:** Server is overwhelmed or crashed
**Fix:**
```bash
# Check if Vercel is having issues
# Redeploy: Vercel Dashboard → Redeploy
# Check logs: Vercel Dashboard → Functions → Logs
# If logs show errors: fix code and redeploy
```

### Issue: Timeout errors in health check

**Cause:** Server is very slow or network issue
**Fix:**
```bash
# Check resource usage in Vercel
# Check if external service is slow
# Verify network connectivity
# Restart: redeploy
```

### Issue: Health check works but app down for users

**Cause:** API working but frontend static assets missing
**Fix:**
```bash
# Check Vercel build logs
# Verify: build command generates dist/public
# Check: environment variables
# Redeploy with fresh build
```

### Issue: Intermittent failures (works sometimes)

**Cause:** Race condition, memory leak, or resource contention
**Fix:**
```bash
# Check logs for pattern
# Restart: redeploy
# If continues: profile for memory leaks
# Check for concurrent request issues
```

### Issue: External service down (circuit breaker open)

**Cause:** Third-party service (Browserbase, OpenAI, etc.) is down
**Fix:**
```bash
# Check third-party status page
# Verify API credentials
# Wait for service to recover
# Or: implement fallback if available
# Contact: third-party support if critical
```

---

## Monitoring During Incident

### Check These Every 2-5 Minutes

1. **Health Endpoint:**
   ```bash
   curl https://ghlagencyai.com/api/trpc/health.liveness
   ```

2. **BetterStack Dashboard:**
   - Check monitor status
   - Watch incident timeline
   - Note recovery detection time

3. **Vercel Logs:**
   - Check for errors
   - Watch for deployments
   - Monitor function execution

4. **External Services:**
   - Check status pages
   - Verify circuit breaker states

---

## Post-Incident Activities

### Within 24 Hours

1. **Write Summary:**
   ```
   Title: [Date] - [Service] Outage Summary
   Duration: [X minutes]
   Root Cause: [Description]
   Impact: [Number of users affected]
   Detection: [Who detected / how long to detect]
   Resolution: [What fixed it]
   ```

2. **Document Root Cause:**
   - What went wrong?
   - Why did it happen?
   - How did it escape detection?

3. **Plan Prevention:**
   - What monitoring should catch this?
   - What code change prevents this?
   - What process improvement helps?

### Within 1 Week

1. **Implement Improvements:**
   - Add monitoring for this scenario
   - Fix underlying code issue
   - Update runbook

2. **Share Learnings:**
   - Post in #alerts channel
   - Update this runbook
   - Train team if relevant

---

## Success Metrics

After each incident, track:

- **Mean Time to Detect (MTTD):** How fast was it detected?
  - Target: <2 minutes
  - Acceptable: <5 minutes
  - Poor: >10 minutes

- **Mean Time to Resolution (MTTR):** How fast was it fixed?
  - Target: <15 minutes
  - Acceptable: <30 minutes
  - Poor: >60 minutes

- **Impact:** How many users affected?
  - Zero: No impact
  - 1-10: Minor impact
  - 10+: Major impact

---

## Key Resources

### During an Incident

- **BetterStack Dashboard:** https://betterstack.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Health Endpoint:** https://ghlagencyai.com/api/trpc/health.liveness
- **Documentation:** `/UPTIME_MONITORING_PRODUCTION.md`

### Reference

- **Health Code:** `/server/api/routers/health.ts`
- **Monitoring Setup:** `/MONITORING_IMPLEMENTATION_GUIDE.md`
- **Status Page:** https://status.ghlagencyai.betteruptime.com

---

## Quick Command Reference

```bash
# Test liveness
curl https://ghlagencyai.com/api/trpc/health.liveness

# Test readiness
curl https://ghlagencyai.com/api/trpc/health.readiness

# Get full health report
curl https://ghlagencyai.com/api/trpc/health.getSystemHealth

# Get metrics and circuit states
curl https://ghlagencyai.com/api/trpc/health.getMetrics

# Get service availability summary
curl https://ghlagencyai.com/api/trpc/health.getServiceAvailability

# Test with detailed output
curl -v https://ghlagencyai.com/api/trpc/health.liveness

# Measure response time
time curl https://ghlagencyai.com/api/trpc/health.liveness
```

---

## Checklist for Before Going On-Call

- [ ] Have BetterStack login credentials
- [ ] Know how to access Vercel dashboard
- [ ] Know health endpoint URLs
- [ ] Have team member contact info
- [ ] Read this entire runbook
- [ ] Understand your escalation path
- [ ] Have Slack notifications enabled for #alerts

---

**Last Updated:** 2025-12-20
**Next Review:** When incident occurs or quarterly
**Maintained By:** DevOps/Platform Team

---

**SAVE THIS LINK: When an alert fires, come back to this document for quick reference.**

