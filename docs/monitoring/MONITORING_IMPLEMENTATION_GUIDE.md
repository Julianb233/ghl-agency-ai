# GHL Agency AI - Uptime Monitoring Implementation Guide

**Quick Start:** 60 minutes to production-grade monitoring

---

## Overview

Your application has production-ready health endpoints. You need **external uptime monitoring** to detect outages before customers do.

**Solution:** BetterStack (free tier, 5-minute setup)

---

## 60-Minute Implementation Plan

### Minute 0-5: Sign Up

1. Go to https://betterstack.com
2. Click "Start Free Trial"
3. Sign up with work email
4. Verify email
5. Select "Uptime Monitoring"

### Minute 5-20: Create 4 Monitors

In BetterStack dashboard, click "Add Monitor" for each:

**Monitor 1: Liveness**
- URL: `https://ghlagencyai.com/api/trpc/health.liveness`
- Interval: 60 seconds
- Regions: US East, US West
- Alert after: 2 minutes down

**Monitor 2: Readiness**
- URL: `https://ghlagencyai.com/api/trpc/health.readiness`
- Interval: 60 seconds
- Regions: US East, US West
- Alert after: 2 minutes down

**Monitor 3: Frontend**
- URL: `https://ghlagencyai.com/`
- Interval: 120 seconds
- Regions: US East, US West, Europe
- Alert after: 5 minutes down

**Monitor 4: Metrics**
- URL: `https://ghlagencyai.com/api/trpc/health.getMetrics`
- Interval: 300 seconds
- Regions: US East
- Alert after: 10 minutes down

### Minute 20-35: Configure Alerts

**Slack Integration:**
1. Go to "Integrations"
2. Click "Add Integration"
3. Select "Slack"
4. Authorize and select `#alerts` channel (create if needed)

**Email Alerts:**
1. Go to "On-Call"
2. Add your email
3. Enable email notifications

**Alert Policy:**
1. Go to "Policies"
2. Create new policy: "Critical Downtime"
3. Condition: "Downtime > 2 minutes"
4. Notifications: Slack + Email
5. Repeat every 15 minutes

### Minute 35-45: Test Alerts

1. Select a monitor
2. Click "Pause Monitor"
3. Wait 3 minutes
4. Check Slack for alert
5. Resume monitor
6. Check Slack for recovery notification

### Minute 45-60: Create Status Page & Document

**Status Page:**
1. Go to "Status Pages"
2. Click "Create Status Page"
3. Name: "GHL Agency AI Status"
4. Add components: API Services, Web Dashboard, AI Processing
5. Link monitors to components
6. Publish

**Documentation:**
1. Save status page URL
2. Share with team
3. Add to internal wiki
4. Document alert response procedures

---

## After Setup: What to Expect

### First Week
- ✅ 4 monitors showing "Up" status
- ✅ Alerts working when paused for testing
- ✅ Status page accessible to public
- ✅ Team receiving Slack/email alerts

### First Month
- ✅ Real uptime data collected
- ✅ Any actual incidents detected immediately
- ✅ Response time trends visible
- ✅ Baseline established for thresholds

### First 90 Days
- ✅ 99.9%+ uptime verified
- ✅ Mean time to detection <2 minutes
- ✅ Zero undetected outages
- ✅ Team confidence in monitoring

---

## Health Endpoints (Already Deployed)

All these are live at ghlagencyai.com:

```bash
# Test them:
curl https://ghlagencyai.com/api/trpc/health.liveness
curl https://ghlagencyai.com/api/trpc/health.readiness
curl https://ghlagencyai.com/api/trpc/health.getSystemHealth
curl https://ghlagencyai.com/api/trpc/health.getMetrics
```

**Monitored Services:**
- vapi (Voice AI)
- apify (Web scraping)
- browserbase (Cloud browser)
- openai (AI model)
- anthropic (AI model)
- gmail (Email)
- outlook (Email)

---

## Alert Severity Matrix

| What | How Fast | Channel |
|------|----------|---------|
| Server down | 2 min | Slack + Email |
| High response time | 15 min | Slack |
| Metrics failing | 10 min | Email |

---

## Quick Troubleshooting

**Monitor shows "Down" but site works:**
```bash
# Test manually
curl -v https://ghlagencyai.com/api/trpc/health.liveness
```

**No alerts received:**
1. Check Slack integration is connected
2. Verify email isn't in spam
3. Confirm alert policy is enabled

**Too many false alerts:**
1. Increase downtime threshold (2 min → 5 min)
2. Reduce check frequency
3. Add maintenance window during deployments

---

## Key URLs

- **Status Page:** status.ghlagencyai.betteruptime.com
- **BetterStack Dashboard:** betterstack.com/dashboard
- **Production App:** ghlagencyai.com
- **Health Check:** ghlagencyai.com/api/trpc/health.liveness

---

## Success = Done When

- [ ] All 4 monitors showing "Up"
- [ ] Test alert received in Slack
- [ ] Email alert received
- [ ] Status page publicly accessible
- [ ] Team knows how to check BetterStack
- [ ] Incident procedures documented
- [ ] Links saved in team docs

---

## Cost

**Year 1:** $0 (free tier)
**Upgrade to paid ($18/mo):** When you need SMS alerts or on-call scheduling

---

## Support

- BetterStack Docs: https://betterstack.com/docs
- Questions: Engineering team
- Issues: #alerts Slack channel

---

**You're done! Monitoring is now live. ✅**

