# Uptime Monitoring Quick Start Guide

**Project:** Bottleneck Bots
**Time to Complete:** 30-60 minutes
**Cost:** $0 (Free Tier)

---

## Step 1: Sign Up for BetterStack (5 minutes)

1. Go to https://betterstack.com
2. Click "Start Free Trial"
3. Sign up with your work email
4. Verify email
5. Select "Uptime Monitoring" as your first product

---

## Step 2: Create Core Monitors (15 minutes)

### Monitor 1: Liveness Probe

```yaml
Name: Bottleneck Bots - Server Liveness
URL: https://bottleneckbot.com/api/trpc/health.liveness
Method: GET
Check Interval: 60 seconds
Timeout: 10 seconds
Regions: US East, US West
Expected Status: 200
Response Contains: "status":"ok"
Alert After: 2 minutes downtime
```

**To Create:**
1. Click "Add Monitor" in BetterStack
2. Select "HTTP Monitor"
3. Paste URL above
4. Set interval to 60 seconds
5. Add expected response: `"status":"ok"`
6. Select 2 regions (US East, US West)
7. Click "Create Monitor"

### Monitor 2: Readiness Probe

```yaml
Name: Bottleneck Bots - Service Readiness
URL: https://bottleneckbot.com/api/trpc/health.readiness
Method: GET
Check Interval: 60 seconds
Timeout: 10 seconds
Regions: US East, US West
Expected Status: 200
Response Contains: "ready":true
Alert After: 2 minutes downtime
```

### Monitor 3: Frontend Availability

```yaml
Name: Bottleneck Bots - Web Dashboard
URL: https://bottleneckbot.com/
Method: GET
Check Interval: 120 seconds (2 minutes)
Timeout: 15 seconds
Regions: US East, Europe
Expected Status: 200
Alert After: 5 minutes downtime
```

### Monitor 4: AI API Endpoint

```yaml
Name: Bottleneck Bots - AI Chat API
URL: https://bottleneckbot.com/api/trpc/ai.chat
Method: POST
Headers:
  Content-Type: application/json
Body:
  {"messages":[{"role":"user","content":"health"}],"startUrl":"https://example.com"}
Check Interval: 300 seconds (5 minutes)
Timeout: 30 seconds
Regions: US East
Expected Status: 200 or 201
Alert After: 10 minutes downtime
```

**Note:** This is a synthetic transaction test - it actually creates a browser session.
Only check every 5 minutes to avoid excessive costs.

---

## Step 3: Configure Alert Channels (10 minutes)

### Slack Integration

1. In BetterStack, go to "Integrations"
2. Click "Add Integration"
3. Select "Slack"
4. Click "Connect to Slack"
5. Authorize BetterStack
6. Select channel: `#alerts` (create if doesn't exist)
7. Test integration

### Email Alerts

1. Go to "On-Call"
2. Click "Add Person"
3. Enter your email
4. Select "Receive alerts via Email"
5. Verify email address
6. Set as default contact

### SMS Alerts (Optional - Paid Only)

1. Upgrade to Team plan ($18/mo) if needed
2. Go to "On-Call"
3. Add phone number
4. Verify with code
5. Enable for critical alerts

---

## Step 4: Set Alert Rules (5 minutes)

### Default Alert Policy

```yaml
Severity: Critical
Conditions:
  - Any monitor down for 2+ minutes
Notifications:
  - Send to: #alerts Slack channel
  - Send to: Primary email
  - Repeat: Every 15 minutes until resolved

Severity: Warning
Conditions:
  - Response time >5 seconds for 3 consecutive checks
Notifications:
  - Send to: #alerts Slack channel
  - Do not repeat
```

**To Configure:**
1. Go to "Policies" in BetterStack
2. Click "Create Policy"
3. Name: "Critical Alerts"
4. Add condition: "Downtime > 2 minutes"
5. Add notification: Slack (#alerts)
6. Add notification: Email (your email)
7. Set repeat interval: 15 minutes
8. Click "Save"

---

## Step 5: Test Alerts (5 minutes)

### Option A: Simulate Downtime (Recommended)

1. In BetterStack, select a monitor
2. Click "..." menu
3. Select "Pause Monitor"
4. Wait 3 minutes
5. Check Slack for alert
6. Resume monitor
7. Check Slack for recovery notification

### Option B: Test with Wrong URL

1. Create temporary monitor
2. URL: `https://bottleneckbot.com/fake-endpoint`
3. Wait for alert
4. Delete temporary monitor

---

## Step 6: Create Status Page (10 minutes) - Optional

1. In BetterStack, go to "Status Pages"
2. Click "Create Status Page"
3. Name: "Bottleneck Bots System Status"
4. Subdomain: `bottleneckbot` (creates status.bottleneckbot.betteruptime.com)
5. Add components:
   - API Services
   - Browser Automation
   - AI Models
   - Web Dashboard
6. Link monitors to components
7. Customize theme (logo, colors)
8. Click "Publish"

**Optional:** Add CNAME for custom domain:
```
CNAME status.bottleneckbot.com -> status.bottleneckbot.betteruptime.com
```

---

## Verification Checklist

- [ ] All 4 monitors created and showing "Up" status
- [ ] Slack integration connected
- [ ] Test alert received in Slack
- [ ] Email alerts configured
- [ ] Alert policy set to 2 minutes downtime
- [ ] Multi-region monitoring enabled (US East + US West)
- [ ] Status page created (optional)

---

## Expected Results

**Monitoring Coverage:**
- ✅ Server availability (liveness probe)
- ✅ Service health (readiness probe)
- ✅ Frontend availability (web dashboard)
- ✅ API functionality (AI endpoint)
- ✅ Multi-region monitoring (2-3 regions)

**Alert Response Time:**
- 🚨 Downtime detected within 1 minute
- 📢 Slack notification within 2 minutes
- 📧 Email notification within 2 minutes
- 🔄 Alerts repeat every 15 minutes until resolved

---

## What to Monitor Next

After basic uptime monitoring is working, add these checks:

### Week 2:
- [ ] Database health endpoint
- [ ] Redis connection monitoring
- [ ] SSL certificate expiration (30-day warning)

### Week 3:
- [ ] Response time alerts (>5s threshold)
- [ ] Error rate monitoring (>5% threshold)
- [ ] Browserbase session monitoring

### Month 2:
- [ ] Synthetic browser tests (full user workflows)
- [ ] API performance monitoring (P95 latency)
- [ ] Cost tracking integration

---

## Troubleshooting

**Problem:** Monitor shows "Down" but site is accessible

**Solutions:**
1. Check if URL is correct (https vs http)
2. Verify firewall isn't blocking BetterStack IPs
3. Check if endpoint requires authentication
4. Test URL manually: `curl -v https://bottleneckbot.com/api/trpc/health.liveness`

**Problem:** Too many alerts (alert fatigue)

**Solutions:**
1. Increase downtime threshold (2 min → 5 min)
2. Reduce check frequency (60s → 120s)
3. Add maintenance windows during deployments
4. Group similar alerts

**Problem:** Alerts not received

**Solutions:**
1. Check Slack integration is connected
2. Verify email address is confirmed
3. Check spam folder
4. Test integration manually
5. Verify alert policy is enabled

---

## Support Resources

**BetterStack Documentation:**
- Getting Started: https://betterstack.com/docs/uptime/getting-started
- HTTP Monitors: https://betterstack.com/docs/uptime/monitors/http-monitors
- Integrations: https://betterstack.com/docs/uptime/integrations

**Bottleneck Bots Resources:**
- Health Endpoints: `/server/api/routers/health.ts`
- Deployment Guide: `/DEPLOYMENT_CHECKLIST.md`
- Full Monitoring Guide: `/UPTIME_MONITORING_SETUP.md`

**Need Help?**
- Slack: #observability
- Email: engineering@bottleneckbot.com

---

## Success Metrics (First 30 Days)

Track these metrics to measure monitoring effectiveness:

| Metric | Target | Actual |
|--------|--------|--------|
| Uptime percentage | 99.9% | ___ |
| Mean time to detection (MTTD) | <2 min | ___ |
| False positive alerts | <5% | ___ |
| Alert response time | <5 min | ___ |
| Undetected outages | 0 | ___ |

**Review weekly** and adjust thresholds as needed.

---

**Setup Complete!** 🎉

Your Bottleneck Bots application now has production-grade uptime monitoring.

Next steps:
1. Monitor for 1 week and tune alert thresholds
2. Add enhanced health checks (see `/UPTIME_MONITORING_SETUP.md`)
3. Create incident response runbook
4. Train team on alert response procedures
