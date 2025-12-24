# Uptime Monitoring Setup for GHL Agency AI

**Project:** GHL Agency AI
**Domain:** https://ghlagencyai.com
**Platform:** Vercel (Auto-scaling, CDN, 99.99% SLA)
**Date:** 2025-12-20
**Status:** Ready for Implementation

---

## Executive Summary

GHL Agency AI is a production SaaS application deployed on Vercel. The application includes production-ready health check endpoints that enable external uptime monitoring. This document provides a complete guide to implementing external uptime monitoring to detect outages before customers report them.

### Current Status
✅ Health check endpoints implemented and accessible
✅ Circuit breaker monitoring for 7 critical services
✅ Error tracking via Sentry configured
❌ No external uptime monitoring service configured
❌ No multi-region availability checks
❌ No automated downtime alerts

### Immediate Recommendation
Implement **BetterStack** (free tier) for external uptime monitoring. Setup time: **60 minutes**.

---

## Part 1: Existing Health Infrastructure

### Available Health Check Endpoints

Your application already has production-ready health endpoints at:

| Endpoint | Purpose | HTTP Method | Response Time |
|----------|---------|-------------|---------------|
| `https://ghlagencyai.com/api/trpc/health.liveness` | Server availability check | GET | <100ms |
| `https://ghlagencyai.com/api/trpc/health.readiness` | Service readiness (circuit breaker check) | GET | <200ms |
| `https://ghlagencyai.com/api/trpc/health.getSystemHealth` | Comprehensive system health | GET | <500ms |
| `https://ghlagencyai.com/api/trpc/health.getMetrics` | Performance metrics & circuit states | GET | <500ms |
| `https://ghlagencyai.com/api/trpc/health.getServiceAvailability` | Service availability summary | GET | <200ms |

### Test Health Endpoints

```bash
# Test liveness probe
curl https://ghlagencyai.com/api/trpc/health.liveness

# Test readiness probe
curl https://ghlagencyai.com/api/trpc/health.readiness

# Test full system health
curl https://ghlagencyai.com/api/trpc/health.getSystemHealth

# Test metrics
curl https://ghlagencyai.com/api/trpc/health.getMetrics
```

### Monitored Services (Circuit Breakers)

The application monitors health of these critical external services:
- **vapi** - Voice AI integration
- **apify** - Web scraping service
- **browserbase** - Cloud browser infrastructure
- **openai** - OpenAI API
- **anthropic** - Anthropic Claude API
- **gmail** - Gmail OAuth/email integration
- **outlook** - Outlook OAuth/email integration

---

## Part 2: External Uptime Monitoring Setup

### Why External Monitoring?

Even with internal health checks, you need external monitoring because:
1. **Detects complete outages** - When your server is completely down, internal checks can't run
2. **Validates connectivity** - Confirms your users can actually reach the service
3. **Multi-region checks** - Identifies regional CDN/network issues
4. **Third-party verification** - Independent proof of uptime for SLAs
5. **Automated alerting** - Real-time notifications via Slack/email/SMS

### Recommended Solution: BetterStack

**Why BetterStack?**
- ✅ Free tier: 10 monitors, 3 status pages (sufficient for MVP)
- ✅ Simple setup: 5-minute monitor configuration
- ✅ Slack integration: Real-time alerts
- ✅ Status pages: Public customer-facing transparency
- ✅ Multi-region: US, EU, Asia monitoring locations
- ✅ Affordable upgrade: $18/month for on-call features

**Pricing:**
- Free: $0/month (10 monitors, basic alerts)
- Team: $18/month (30 monitors, on-call scheduling)
- Business: $49/month (100 monitors, advanced features)

---

## Part 3: Implementation Guide (60 Minutes)

### Step 1: Create BetterStack Account (5 minutes)

1. Visit https://betterstack.com
2. Click "Start Free Trial"
3. Sign up with work email
4. Choose "Uptime Monitoring" as first product
5. Verify email address

### Step 2: Create Core Monitors (15 minutes)

Create these 4 monitors in BetterStack:

#### Monitor 1: Liveness Probe (Critical)

```
Name: GHL Agency AI - Server Liveness
URL: https://ghlagencyai.com/api/trpc/health.liveness
Method: GET
Check Interval: 60 seconds
Timeout: 10 seconds
Regions: US East, US West (multi-region)
Expected Status Code: 200
Expected Response: Contains "ok"
Alert After: 2 minutes downtime
```

**In BetterStack:**
1. Click "Add Monitor" → "HTTP Monitor"
2. Paste URL above
3. Set interval to 60 seconds
4. Add response check: `response.contains("ok")`
5. Select US East + US West regions
6. Set alert threshold to 2 minutes
7. Click "Create Monitor"

#### Monitor 2: Readiness Probe (Critical)

```
Name: GHL Agency AI - Service Readiness
URL: https://ghlagencyai.com/api/trpc/health.readiness
Method: GET
Check Interval: 60 seconds
Timeout: 10 seconds
Regions: US East, US West
Expected Status: 200
Expected Response: Contains "ready":true
Alert After: 2 minutes downtime
```

#### Monitor 3: Frontend Availability (High Priority)

```
Name: GHL Agency AI - Web Dashboard
URL: https://ghlagencyai.com/
Method: GET
Check Interval: 120 seconds (2 minutes)
Timeout: 15 seconds
Regions: US East, US West, Europe
Expected Status: 200
Alert After: 5 minutes downtime
```

#### Monitor 4: System Metrics Endpoint (Medium Priority)

```
Name: GHL Agency AI - Metrics Endpoint
URL: https://ghlagencyai.com/api/trpc/health.getMetrics
Method: GET
Check Interval: 300 seconds (5 minutes)
Timeout: 10 seconds
Regions: US East
Expected Status: 200
Alert After: 10 minutes downtime
```

### Step 3: Configure Alerts (10 minutes)

#### Create Slack Integration

1. In BetterStack, go to "Integrations" → "Add Integration"
2. Select "Slack"
3. Authorize BetterStack to access your workspace
4. Create Slack channel: `#alerts`
5. Select channel for notifications

#### Set Up Email Alerts

1. Go to "On-Call" section
2. Add your email address
3. Enable "Receive alerts via Email"
4. Verify email address

#### Create Alert Policy

**Critical Alerts Policy:**
```
Name: Critical Downtime
Condition: Any monitor down for 2+ minutes
Notifications:
  - Slack channel: #alerts (with @channel mention)
  - Email: engineering team
Repeat: Every 15 minutes until resolved
```

**In BetterStack:**
1. Go to "Policies"
2. Click "Create Policy"
3. Add condition: "Downtime > 2 minutes"
4. Add Slack notification
5. Add email notification
6. Set repeat to 15 minutes

### Step 4: Test Alert Configuration (5 minutes)

**Option A: Simulate Downtime**
1. Select a monitor in BetterStack
2. Click "Pause Monitor"
3. Wait 3 minutes
4. Verify alert appears in Slack
5. Resume monitor
6. Verify recovery notification appears

**Option B: Test Wrong URL**
1. Create temporary test monitor
2. URL: `https://ghlagencyai.com/fake-endpoint`
3. Wait for alert to trigger
4. Delete test monitor

### Step 5: Create Public Status Page (10 minutes)

1. In BetterStack, go to "Status Pages"
2. Click "Create Status Page"
3. Configure:
   - Name: "GHL Agency AI Status"
   - Subdomain: `ghlagencyai-status` (creates ghlagencyai-status.betteruptime.com)
4. Add components:
   - "API Services"
   - "Web Dashboard"
   - "AI Processing"
   - "Integrations"
5. Link monitors to components
6. Customize branding (logo, colors)
7. Click "Publish"

**Optional: Custom Domain**
```
Add CNAME to your DNS:
status.ghlagencyai.com -> status.ghlagencyai.betteruptime.com
```

---

## Part 4: Monitoring Configuration Reference

### Alert Severity Levels

| Severity | Condition | Response Time | Notification Method |
|----------|-----------|---------------|---------------------|
| **P0 - Critical** | Liveness/Readiness down >2 min | Immediate | Slack + Email + SMS |
| **P1 - High** | Frontend down >5 min | 5 minutes | Slack + Email |
| **P2 - Medium** | Response time >5s for 3 checks | 15 minutes | Email |
| **P3 - Low** | Metrics endpoint down >10 min | 24 hours | Email digest |

### SLA Targets

```yaml
API Availability: 99.9% (43 minutes downtime/month)
Response Time (P95): <2 seconds
Frontend Availability: 99.95%
Overall System Uptime: 99.9%
```

### Expected Alert Response Flow

```
1. [0:00] Monitor detects downtime
2. [1:00] BetterStack verifies from 2+ regions
3. [2:00] Alert sent to Slack #alerts channel
4. [2:30] Email notification delivered
5. [5:00] Second alert if still down (repeat every 15 min)
6. [Service recovers]
7. [2 min after recovery] Resolution notification sent
```

---

## Part 5: Monitoring Dashboard & Metrics

### Key Metrics to Track

**System Uptime:**
- Current uptime percentage (last 24h, 7d, 30d)
- Mean time to detection (MTTD): <2 minutes target
- Mean time to resolution (MTTR): <15 minutes target

**Service Health:**
- Circuit breaker states (all 7 services)
- Response times by endpoint
- Error rates by endpoint

**Customer Impact:**
- Downtime events (number and duration)
- Affected users (estimated based on traffic)
- Revenue impact (if SaaS)

### BetterStack Dashboard Access

After setup, you can view:
- Real-time status of all 4 monitors
- Historical uptime graph (30-day view)
- Incident timeline
- Alert history
- Performance trends

**Dashboard URL:** https://betterstack.com/dashboard

---

## Part 6: Additional Monitoring Setup (Week 2-4)

### Enhanced Health Endpoints (Optional but Recommended)

After Week 1, consider adding these endpoints for deeper monitoring:

```typescript
// Database health check
https://ghlagencyai.com/api/trpc/health.getDatabaseHealth
- Tests: Connection, query latency, pool status
- Alert: Latency >500ms

// Cache health check
https://ghlagencyai.com/api/trpc/health.getRedisHealth
- Tests: Connection, latency, memory
- Alert: Latency >100ms

// External service checks
https://ghlagencyai.com/api/trpc/health.getExternalServices
- Tests: All 7 circuit breaker services
- Alert: >3 services unavailable
```

See `/root/github-repos/ghl-agency-ai/server/api/routers/health-enhanced.example.ts` for code samples.

### Response Time Monitoring

Add to BetterStack (Week 2):
```
- Alert if response time > 5 seconds for 3 consecutive checks
- Track P50, P95, P99 latency trends
- Create performance dashboard
```

### Uptime Report Scheduling

Configure automatic reports:
- Daily: Via email (executive summary)
- Weekly: Detailed breakdown by service
- Monthly: SLA compliance report
- Quarterly: Trend analysis + recommendations

---

## Part 7: Incident Response

### When an Alert Fires

**Steps to Take:**

1. **Check BetterStack Dashboard** (immediately)
   - Open https://betterstack.com
   - Confirm which monitors are down
   - Review incident timeline

2. **Check Vercel Status** (immediately)
   - Visit https://www.vercelstatus.com
   - Verify no platform-wide outage

3. **Test Application Manually** (immediately)
   - Visit https://ghlagencyai.com
   - Try login, basic workflow

4. **Check Logs** (if available)
   - Vercel deployment logs
   - Application error logs

5. **Communicate** (immediately)
   - Slack: Post in #alerts with investigation status
   - BetterStack: Create incident with description
   - Update status page if downtime >5 minutes

6. **Resolve** (ongoing)
   - Deploy fix or rollback
   - Monitor recovery in BetterStack
   - Document root cause

7. **Post-Incident** (within 24 hours)
   - Write incident summary
   - Identify root cause
   - Plan prevention measures
   - Update runbook

---

## Part 8: Cost Analysis

### Year 1 Investment

| Service | Tier | Monthly | Annual |
|---------|------|---------|--------|
| BetterStack | Free | $0 | $0 |
| Sentry | Free | $0 | $0 |
| Vercel | Existing | - | - |
| **Total** | - | **$0** | **$0** |

**When to Upgrade to Paid ($18/month):**
- Need SMS alerts for critical issues
- Require on-call rotation scheduling
- More than 10 monitors needed
- Want advanced incident management

### ROI Calculation

```
Cost of 1-hour downtime:
- 100 active users × $50/month SaaS = $5,000 MRR
- 1 hour = $208 revenue loss
- Customer churn risk: 5% = $250 additional loss
- Total: $458 minimum impact per incident

Monitoring cost: $0-18/month
Prevents: 1-2 incidents per month with early detection
ROI: 1,300%+ in first incident prevented
```

---

## Part 9: Implementation Checklist

### Week 1: Core Setup ✓

- [ ] Sign up for BetterStack account (5 min)
- [ ] Create 4 core monitors (15 min)
  - [ ] Liveness probe
  - [ ] Readiness probe
  - [ ] Frontend availability
  - [ ] Metrics endpoint
- [ ] Configure Slack integration (5 min)
- [ ] Set up email alerts (5 min)
- [ ] Test alert routing (5 min)
- [ ] Create status page (10 min)
- [ ] Share status page link with team
- [ ] Document alert procedures

**Total Time: 60 minutes**

### Week 2-3: Enhanced Monitoring

- [ ] Add database health endpoint
- [ ] Add Redis health check
- [ ] Add response time alerts
- [ ] Configure multi-region monitoring
- [ ] Create Grafana dashboard
- [ ] Set up SSL cert expiration alert

### Week 4+: Continuous Improvement

- [ ] Review alert metrics weekly
- [ ] Adjust thresholds based on false positives
- [ ] Conduct monthly status page review
- [ ] Update incident response runbook
- [ ] Train team on alert procedures

---

## Part 10: Verification Checklist

Before considering setup complete, verify:

- [ ] All 4 BetterStack monitors show "Up" status
- [ ] Slack integration connected and tested
- [ ] Test alert received in `#alerts` Slack channel
- [ ] Email alerts working (verify inbox)
- [ ] Multi-region monitoring enabled (2-3 regions)
- [ ] Status page accessible and showing correct status
- [ ] Health endpoints responding with <1s latency
- [ ] Team knows how to access BetterStack dashboard
- [ ] Incident response procedures documented
- [ ] Links documented in team wiki/docs

---

## Part 11: Quick Reference

### Key Endpoints

```
Status Page: https://status.ghlagencyai.betteruptime.com
BetterStack Dashboard: https://betterstack.com/dashboard
Production App: https://ghlagencyai.com
Health Check: https://ghlagencyai.com/api/trpc/health.liveness
```

### Alert Channels

- Slack: `#alerts` (created during setup)
- Email: engineering@ghlagencyai.com
- SMS: Optional (paid tier)

### Support Resources

- **BetterStack Docs:** https://betterstack.com/docs
- **Sentry Docs:** https://docs.sentry.io
- **Vercel Docs:** https://vercel.com/docs
- **Health Endpoint Code:** `/server/api/routers/health.ts`

### Important Contacts

- **DevOps/Platform:** Petra-DevOps
- **Engineering Lead:** [Your team]
- **Executive Alerts:** Engineering team

---

## Part 12: Success Metrics (30 Days)

Track these metrics after setup to measure effectiveness:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Monitoring Coverage** | 100% | All critical endpoints monitored |
| **MTTD (Mean Time to Detect)** | <2 minutes | Alert fires within 2 min of downtime |
| **False Positive Rate** | <5% | Only legitimate issues alert |
| **Alert Response Time** | <5 minutes | Team acknowledges alert within 5 min |
| **Undetected Outages** | 0 | Zero customer-reported outages |
| **Uptime Achievement** | 99.9%+ | 43 minutes downtime/month max |

**Review Weekly** - Adjust thresholds if needed.

---

## Next Steps

### Immediate (This Week)
1. ✅ Review this document
2. Create BetterStack account (5 min)
3. Configure 4 core monitors (15 min)
4. Test alerts (5 min)
5. Share status page with team

### Soon (Next 2 Weeks)
1. Add response time monitoring
2. Create incident runbook
3. Train team on alerts
4. Review first week of data

### Later (Month 2+)
1. Add enhanced health checks
2. Launch automated status updates
3. Establish SLA tracking
4. Quarterly disaster recovery drills

---

## Document Information

**Created:** 2025-12-20
**Last Updated:** 2025-12-20
**Prepared By:** Petra-DevOps
**Status:** Ready for Implementation
**Estimated Setup Time:** 60 minutes
**Cost (Year 1):** $0 (free tier)

For questions or issues: Contact engineering team

---

## Appendix A: Vercel Monitoring Features

Vercel provides built-in monitoring:
- Real-time deployment status
- Function execution metrics
- Edge Network performance
- Analytics dashboard
- Built-in SSL/TLS monitoring

Access at: https://vercel.com/dashboard

---

## Appendix B: Common Troubleshooting

**Problem:** Monitor shows "Down" but site works
- ✅ Solution: Check firewall isn't blocking BetterStack IPs
- ✅ Solution: Verify endpoint URL is correct (https vs http)
- ✅ Solution: Test manually: `curl https://ghlagencyai.com/api/trpc/health.liveness`

**Problem:** Too many alerts (alert fatigue)
- ✅ Solution: Increase downtime threshold to 5 minutes
- ✅ Solution: Reduce check frequency for non-critical monitors
- ✅ Solution: Set maintenance windows during deployments

**Problem:** Alerts not being delivered
- ✅ Solution: Verify Slack integration is connected
- ✅ Solution: Check email isn't being filtered as spam
- ✅ Solution: Confirm alert policy is enabled

---

**Document Complete - Ready for Team Review**

