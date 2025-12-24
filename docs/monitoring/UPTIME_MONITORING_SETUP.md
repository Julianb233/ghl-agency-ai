# Uptime Monitoring Setup for Bottleneck Bots

**Date:** 2025-12-18
**Prepared by:** Otto-Observer (Observability Specialist)
**Project:** Bottleneck Bots - AI-Powered Browser Automation SaaS

---

## Executive Summary

Bottleneck Bots is a mission-critical SaaS platform that automates GoHighLevel operations through AI-powered browser automation. Given the business dependencies on uptime (client workflows, browser sessions, AI processing), comprehensive uptime monitoring is essential for:

- **Business Continuity:** Detect outages before customers report them
- **SLA Compliance:** Maintain 99.9% uptime commitments
- **Cost Control:** Identify resource waste from stalled browser sessions
- **User Experience:** Ensure sub-5s API response times for automation triggers

---

## Current Monitoring Infrastructure

### Existing Capabilities

✅ **Health Check Endpoints** (Production-ready)
- **Location:** `/root/github-repos/ghl-agency-ai/server/api/routers/health.ts`
- **Endpoints Available:**
  - `GET /api/trpc/health.liveness` - Basic server availability
  - `GET /api/trpc/health.readiness` - Service readiness (circuit breaker states)
  - `GET /api/trpc/health.getSystemHealth` - Comprehensive health report
  - `GET /api/trpc/health.getMetrics` - Performance metrics

✅ **Circuit Breaker Monitoring**
- Tracks health of 7 critical services:
  - `vapi` - Voice AI integration
  - `apify` - Web scraping
  - `browserbase` - Cloud browser infrastructure
  - `openai`, `anthropic` - AI model providers
  - `gmail`, `outlook` - Email integrations

✅ **Error Tracking**
- Sentry integration configured (DSN in `.env.example`)
- Client-side and server-side error capture

✅ **Deployment Platform**
- Hosted on Vercel (auto-scaling, CDN, SSL)
- GitHub integration for CI/CD

### Gaps Identified

❌ **No External Uptime Monitoring** - No third-party service pinging endpoints
❌ **No Multi-Region Checks** - Single monitoring location
❌ **No Alert Escalation** - No PagerDuty/Slack integration for critical issues
❌ **No Performance Baselines** - No historical response time tracking
❌ **No Status Page** - No public/customer-facing status dashboard

---

## Recommended Monitoring Solution

### Primary Recommendation: **BetterStack (formerly Better Uptime)**

**Why BetterStack?**
- **Modern SaaS-focused:** Built for API-heavy applications like Bottleneck Bots
- **Generous Free Tier:** 10 monitors, 3 status pages, unlimited team members
- **Incident Management:** Built-in on-call scheduling and escalation
- **Public Status Pages:** Customer-facing transparency
- **Developer-Friendly:** Terraform support, webhook integrations, API access

**Pricing:**
| Tier | Price | Monitors | Status Pages | On-Call |
|------|-------|----------|--------------|---------|
| Free | $0/mo | 10 | 3 | ❌ |
| Team | $18/mo | 30 | 10 | ✅ |
| Business | $49/mo | 100 | Unlimited | ✅ |

**Best Fit:** Start with **Free Tier** (sufficient for MVP), upgrade to **Team ($18/mo)** when on-call rotation needed.

### Alternative Solutions

| Service | Free Tier | Pros | Cons | Best For |
|---------|-----------|------|------|----------|
| **UptimeRobot** | 50 monitors @ 5min intervals | Most generous free tier | Basic alerting, no status pages | Budget-conscious startups |
| **Pingdom** | 14-day trial only | Industry standard, rich features | Expensive ($10/mo for 1 monitor) | Enterprise customers |
| **Checkly** | 50K check runs/mo | Playwright-based browser checks | Overkill for simple uptime | E2E monitoring needs |
| **Cronitor** | 1 monitor | Excellent for cron jobs | Limited uptime checks | Scheduled task monitoring |
| **StatusCake** | Unlimited monitors @ 5min | Unlimited free monitors | Poor UI/UX | High monitor count |

---

## Monitoring Implementation Plan

### Phase 1: Critical Endpoint Monitoring (Week 1)

#### Endpoints to Monitor

| Endpoint | Type | Interval | Expected Response | SLA Target |
|----------|------|----------|-------------------|------------|
| `https://bottleneckbot.com/api/trpc/health.liveness` | HTTP GET | 1 min | 200 OK, `{"status":"ok"}` | 99.9% |
| `https://bottleneckbot.com/api/trpc/health.readiness` | HTTP GET | 1 min | 200 OK, `{"ready":true}` | 99.5% |
| `https://bottleneckbot.com/` | HTTP GET | 2 min | 200 OK, HTML response | 99.9% |
| `https://bottleneckbot.com/api/trpc/ai.chat` | HTTP POST | 5 min | JSON response (not 404/500) | 99.0% |

#### Alert Thresholds

**Incident Severity Levels:**

| Severity | Condition | Response Time | Notification |
|----------|-----------|---------------|--------------|
| **Critical** | Liveness/Readiness down >2 min | Immediate | SMS + Call + Slack |
| **High** | API endpoint errors >5% | 5 minutes | Slack + Email |
| **Medium** | Response time >5s for 3 checks | 15 minutes | Email |
| **Low** | SSL cert expiring <30 days | 24 hours | Email |

**Recommended Alert Rules:**

```yaml
# BetterStack Monitor Configuration
monitors:
  - name: "Bottleneck Bots - Liveness Probe"
    url: "https://bottleneckbot.com/api/trpc/health.liveness"
    method: GET
    interval: 60  # seconds
    timeout: 10  # seconds
    regions: [us-east-1, us-west-2, eu-west-1]  # Multi-region
    expected_status_codes: [200]
    response_body_contains: "ok"
    alert_on:
      - downtime: 2  # minutes
      - response_time: 5000  # ms (5 seconds)

  - name: "Bottleneck Bots - Readiness Probe"
    url: "https://bottleneckbot.com/api/trpc/health.readiness"
    method: GET
    interval: 60
    timeout: 10
    regions: [us-east-1, us-west-2]
    expected_status_codes: [200]
    response_body_contains: '"ready":true'
    alert_on:
      - downtime: 2
      - response_body_not_contains: '"ready":true'

  - name: "Bottleneck Bots - Frontend"
    url: "https://bottleneckbot.com/"
    method: GET
    interval: 120
    timeout: 15
    regions: [us-east-1, eu-west-1]
    expected_status_codes: [200]
    alert_on:
      - downtime: 5
      - response_time: 3000

  - name: "Bottleneck Bots - AI Chat API"
    url: "https://bottleneckbot.com/api/trpc/ai.chat"
    method: POST
    headers:
      Content-Type: application/json
    body: '{"messages":[{"role":"user","content":"health check"}],"startUrl":"https://example.com"}'
    interval: 300  # 5 minutes (expensive operation)
    timeout: 30
    regions: [us-east-1]
    expected_status_codes: [200, 201]
    alert_on:
      - downtime: 10
      - response_time: 10000  # 10 seconds
```

#### Notification Channels

**Priority 1 - Critical Alerts:**
1. SMS: Founder/CTO mobile number
2. Phone Call: Automated voice alert after 5 min downtime
3. Slack: `#alerts-critical` channel with @channel mention
4. Email: engineering@bottleneckbot.com

**Priority 2 - High/Medium Alerts:**
1. Slack: `#alerts` channel (no @channel)
2. Email: engineering@bottleneckbot.com

**Priority 3 - Low Alerts:**
1. Email: devops@bottleneckbot.com (weekly digest)

---

### Phase 2: Advanced Monitoring (Week 2-4)

#### 1. Database Health Monitoring

**Monitor:** PostgreSQL Connection Pool
```typescript
// Add to server/api/routers/health.ts
export const healthRouter = router({
  getDatabaseHealth: publicProcedure.query(async () => {
    const startTime = Date.now();
    try {
      // Simple query to test connection
      await db.execute(sql`SELECT 1 as health_check`);
      const latency = Date.now() - startTime;

      return {
        healthy: latency < 500,  // Flag if >500ms
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }),
});
```

**Monitor Endpoint:** `GET /api/trpc/health.getDatabaseHealth`
- **Expected Response Time:** <100ms
- **Alert Threshold:** >500ms or connection errors

#### 2. Browserbase Session Monitoring

**Monitor:** Active Browser Sessions
```typescript
// Add to server/api/routers/health.ts
export const healthRouter = router({
  getBrowserbaseHealth: publicProcedure.query(async () => {
    try {
      // Query active sessions from database
      const activeSessions = await db.query.browserSessions.findMany({
        where: eq(browserSessions.status, 'running'),
      });

      const stuckSessions = activeSessions.filter(
        s => Date.now() - s.createdAt.getTime() > 30 * 60 * 1000  // >30 min
      );

      return {
        healthy: stuckSessions.length === 0,
        activeSessionCount: activeSessions.length,
        stuckSessionCount: stuckSessions.length,
        warning: stuckSessions.length > 0
          ? 'Possible stuck browser sessions detected'
          : null,
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }),
});
```

**Alert Rule:** Warn if `stuckSessionCount > 3` for >15 minutes

#### 3. AI Model Performance Tracking

**Monitor:** Gemini/OpenAI/Anthropic Response Times
```typescript
// Add middleware to track AI request latency
// server/_core/llm.ts
export async function trackAIModelLatency(
  modelName: string,
  operation: () => Promise<any>
) {
  const startTime = Date.now();
  try {
    const result = await operation();
    const latency = Date.now() - startTime;

    // Log to metrics system
    console.log(JSON.stringify({
      metric: 'ai_model_latency',
      model: modelName,
      latency,
      status: 'success',
    }));

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(JSON.stringify({
      metric: 'ai_model_latency',
      model: modelName,
      latency,
      status: 'error',
      error: error.message,
    }));
    throw error;
  }
}
```

**Dashboard Metrics:**
- P50, P95, P99 latency for each AI model
- Error rates by model
- Token usage per model (cost tracking)

#### 4. Redis Cache Health

**Monitor:** Redis Connection and Performance
```typescript
// Add to server/api/routers/health.ts
export const healthRouter = router({
  getRedisHealth: publicProcedure.query(async ({ ctx }) => {
    const startTime = Date.now();
    try {
      // Test Redis connection with ping
      await ctx.redis.ping();
      const latency = Date.now() - startTime;

      // Get Redis info
      const info = await ctx.redis.info('stats');

      return {
        healthy: latency < 100,
        latency,
        connected: true,
        info,
      };
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        error: error.message,
      };
    }
  }),
});
```

**Alert Threshold:** Redis latency >100ms or connection failure

---

### Phase 3: Status Page & Customer Communication (Month 2)

#### Public Status Page Setup

**Tool:** BetterStack Status Pages (https://status.bottleneckbot.com)

**Components to Display:**
| Component | Description | Status Indicators |
|-----------|-------------|-------------------|
| **API Services** | Core automation API | Operational / Degraded / Down |
| **Browser Automation** | Browserbase sessions | Operational / Degraded / Down |
| **AI Models** | Gemini/OpenAI/Anthropic | Operational / Partial Outage / Down |
| **Dashboard** | Frontend web application | Operational / Down |
| **Database** | PostgreSQL availability | Operational / Down |

**Incident Communication Template:**

```markdown
# [DATE] - Increased API Response Times

**Status:** Investigating
**Affected Services:** API Services, Browser Automation
**Impact:** Users may experience 10-15s delays in automation execution
**Started:** 2025-12-18 14:32 UTC

## Updates

**14:45 UTC** - We have identified the root cause as Browserbase regional capacity limits in us-west-2. Migrating sessions to us-east-1.

**15:02 UTC** - Migration complete. Response times returning to normal. Monitoring for 30 minutes before marking resolved.

**15:35 UTC** - All metrics normal. Incident resolved. Postmortem to follow.

## Root Cause

Browserbase capacity limits in us-west-2 region during peak hours. Browser session creation failed to fallback to alternate regions.

## Resolution

1. Implemented multi-region fallback logic
2. Increased monitoring for regional capacity
3. Pre-provisioning browser instances during peak hours
```

#### Internal Runbook

**Document Location:** `/root/github-repos/ghl-agency-ai/docs/INCIDENT_RESPONSE_RUNBOOK.md`

**Runbook Sections:**
1. **On-Call Rotation Schedule**
2. **Alert Triage Checklist**
3. **Common Issues & Quick Fixes**
4. **Service Dependency Map**
5. **Rollback Procedures**
6. **Escalation Contacts**

---

## Cost Analysis

### Monitoring Stack Costs

| Service | Tier | Monthly Cost | Annual Cost | Notes |
|---------|------|--------------|-------------|-------|
| **BetterStack** | Free → Team | $0 → $18 | $0 → $216 | Upgrade when on-call needed |
| **Sentry** | Free | $0 | $0 | 5K errors/month free |
| **Vercel Monitoring** | Included | $0 | $0 | Built-in with hosting |
| **Optional: DataDog** | Pro | $15/host | $180 | Only if deep APM needed |

**Total Estimated Cost:**
- **Year 1 (Free Tier):** $0/month
- **Year 1 (Paid Tier):** $18-33/month ($216-396/year)
- **ROI:** Preventing a single 1-hour outage ($500-5K revenue loss) pays for 1+ year of monitoring

---

## Implementation Checklist

### Immediate Actions (This Week)

- [ ] Sign up for BetterStack (https://betterstack.com)
- [ ] Create 4 core monitors (liveness, readiness, frontend, AI API)
- [ ] Configure Slack webhook for alerts (`#alerts` channel)
- [ ] Add SMS notification for critical alerts (founder mobile)
- [ ] Test alert routing with simulated downtime
- [ ] Document alert response procedures in Notion

### Week 2-4 Actions

- [ ] Add database health endpoint (`/api/trpc/health.getDatabaseHealth`)
- [ ] Add Browserbase session monitoring endpoint
- [ ] Add Redis health check endpoint
- [ ] Configure multi-region monitoring (US-East, US-West, EU-West)
- [ ] Set up SSL certificate expiration alerts (30-day warning)
- [ ] Create internal incident response runbook

### Month 2 Actions

- [ ] Launch public status page (status.bottleneckbot.com)
- [ ] Add status page link to footer of main app
- [ ] Configure automated incident updates via API
- [ ] Set up weekly uptime report emails
- [ ] Establish SLA baselines (99.9% uptime target)
- [ ] Create customer communication templates for incidents

### Ongoing Maintenance

- [ ] Weekly: Review alert noise and adjust thresholds
- [ ] Monthly: Analyze uptime metrics and performance trends
- [ ] Quarterly: Test disaster recovery procedures
- [ ] Quarterly: Review and update runbook with new learnings

---

## Enhanced Health Check Endpoint

### Recommended Addition to `health.ts`

```typescript
/**
 * Comprehensive system health check
 * Single endpoint for external monitoring services
 */
export const healthRouter = router({
  getComprehensiveHealth: publicProcedure.query(async ({ ctx }) => {
    const checks = await Promise.allSettled([
      // Database check
      (async () => {
        const start = Date.now();
        await ctx.db.execute(sql`SELECT 1`);
        return { name: 'database', healthy: true, latency: Date.now() - start };
      })(),

      // Redis check
      (async () => {
        const start = Date.now();
        await ctx.redis?.ping();
        return { name: 'redis', healthy: true, latency: Date.now() - start };
      })(),

      // Browserbase API check
      (async () => {
        const start = Date.now();
        const response = await fetch('https://api.browserbase.com/v1/sessions', {
          method: 'GET',
          headers: { 'X-API-Key': process.env.BROWSERBASE_API_KEY! },
        });
        return {
          name: 'browserbase',
          healthy: response.ok,
          latency: Date.now() - start
        };
      })(),

      // Circuit breakers check
      (async () => {
        const allHealth = circuitBreakerRegistry.getAllHealth();
        const unhealthy = Object.values(allHealth).filter(h => !h.healthy);
        return {
          name: 'circuit_breakers',
          healthy: unhealthy.length === 0,
          details: allHealth,
        };
      })(),
    ]);

    const results = checks.map((result, idx) =>
      result.status === 'fulfilled'
        ? result.value
        : { name: `check_${idx}`, healthy: false, error: result.reason }
    );

    const overallHealthy = results.every(r => r.healthy);

    return {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: results,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }),
});
```

**External Monitor Configuration:**
```yaml
# Monitor this single endpoint for comprehensive health
- name: "Bottleneck Bots - Full Health Check"
  url: "https://bottleneckbot.com/api/trpc/health.getComprehensiveHealth"
  method: GET
  interval: 60
  expected_status_codes: [200]
  response_body_contains: '"status":"healthy"'
  alert_on:
    - response_body_not_contains: '"status":"healthy"'
    - downtime: 2
```

---

## Monitoring Best Practices

### Alert Fatigue Prevention

**Problem:** Too many alerts → Team ignores them → Critical issues missed

**Solutions:**
1. **Tune Thresholds:** Start conservative, tighten based on real incidents
2. **Alert Grouping:** Batch similar alerts (e.g., "5 services down" vs 5 separate alerts)
3. **Escalation Delays:** Warn before paging (e.g., 2 min warning, 5 min critical)
4. **Auto-Resolution:** Clear alerts when service recovers (no manual ack needed)
5. **Weekly Review:** Team meeting to discuss alert quality

### SLO/SLA Framework

**Service Level Objectives (Internal Targets):**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Availability** | 99.9% | 43 min downtime/month allowed |
| **API Response Time (P95)** | <2s | 95% of requests <2s |
| **Browser Session Start** | <10s | Time to first action |
| **AI Processing Latency (P95)** | <30s | Complex workflow execution |
| **Database Query Latency (P95)** | <100ms | Read queries |

**Error Budget Calculation:**
```
Monthly Error Budget = (1 - SLO) × Time Period
99.9% SLO = 0.1% error budget = 43.2 minutes/month

Example:
- Week 1: 10 min downtime → 23% budget consumed
- Week 2: 5 min downtime → 35% budget consumed
- Week 3: 0 min downtime → 35% budget consumed
- Week 4: 8 min downtime → 54% budget consumed (OVER BUDGET)

Action: Freeze feature releases, focus on stability improvements
```

---

## Monitoring Dashboard Design

### Recommended Grafana/BetterStack Widgets

**Executive Dashboard (for non-technical stakeholders):**
1. **Uptime Percentage (Last 30 Days)** - Single large number (99.95%)
2. **Current Status** - Green/Yellow/Red indicator
3. **Incident Timeline** - Visual calendar of outages
4. **Customer Impact** - "0 customers affected" or incident count
5. **SLA Compliance** - Progress bar toward 99.9% monthly target

**Engineering Dashboard (for ops team):**
1. **Service Health Matrix** - Heatmap of all services (green/yellow/red)
2. **Response Time Trends** - Line chart (P50/P95/P99) over 7 days
3. **Error Rate by Endpoint** - Bar chart of top error endpoints
4. **Circuit Breaker States** - Real-time status of all breakers
5. **Active Alerts** - List of unresolved alerts with age
6. **Resource Utilization** - CPU/Memory/Disk of production servers
7. **Browser Session Metrics** - Active sessions, avg duration, stuck sessions
8. **AI Model Performance** - Latency and error rates by provider

**Sample Queries:**

```sql
-- Average API response time (last 24h)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Error rate by endpoint
SELECT
  endpoint,
  COUNT(*) FILTER (WHERE status >= 500) * 100.0 / COUNT(*) as error_rate
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
HAVING error_rate > 1
ORDER BY error_rate DESC;
```

---

## Disaster Recovery Testing

### Monthly DR Drill Schedule

**Scenario 1: Database Failover (30 min drill)**
1. Simulate primary database failure
2. Verify read replicas take over
3. Confirm zero data loss
4. Test backup restoration
5. Document recovery time

**Scenario 2: Complete Region Outage (45 min drill)**
1. Simulate AWS us-east-1 outage
2. Verify traffic routes to us-west-2
3. Test Browserbase region failover
4. Confirm customer sessions preserved
5. Document RTO (Recovery Time Objective)

**Scenario 3: AI Provider Outage (15 min drill)**
1. Disable Gemini API access
2. Verify fallback to OpenAI/Anthropic
3. Confirm zero customer impact
4. Test circuit breaker recovery
5. Document failover latency

---

## Next Steps & Recommendations

### Immediate Priority (This Week)
1. **Set up BetterStack account** - 30 minutes
2. **Configure 4 core monitors** - 1 hour
3. **Test alert notifications** - 30 minutes
4. **Document runbook** - 2 hours

### High Priority (Next 2 Weeks)
1. **Add comprehensive health endpoint** - 4 hours dev work
2. **Deploy enhanced health checks** - 1 hour
3. **Configure multi-region monitoring** - 1 hour
4. **Create status page** - 2 hours

### Medium Priority (Next Month)
1. **Set up Grafana dashboards** - 4 hours
2. **Implement SLO tracking** - 4 hours dev work
3. **Conduct first DR drill** - 1 hour
4. **Train team on incident response** - 2 hours

### Future Enhancements (Quarter 2)
1. **Synthetic monitoring** - Real browser tests of critical workflows
2. **APM integration** - Deep transaction tracing (DataDog/New Relic)
3. **Log aggregation** - Centralized logging (ELK stack or BetterStack Logs)
4. **Anomaly detection** - ML-based alerting for unusual patterns

---

## Conclusion

Bottleneck Bots has a **solid foundation** for monitoring with existing health check endpoints and circuit breaker infrastructure. The primary gap is **external uptime monitoring and alerting**.

**Recommended Immediate Action:**
Implement BetterStack with 4 core monitors (liveness, readiness, frontend, AI API) and Slack alerts. This provides 99.9% visibility into system health with minimal setup time and zero cost in Year 1.

**Success Metrics (90 Days):**
- [ ] Zero undetected outages (customer reports issue before monitoring)
- [ ] Mean Time to Detection (MTTD) <2 minutes
- [ ] Mean Time to Resolution (MTTR) <15 minutes
- [ ] 99.9%+ uptime achieved
- [ ] <5% alert false positive rate

---

## Contact & Support

**Implementation Questions:**
- Technical Lead: [Your Name]
- Email: engineering@bottleneckbot.com
- Slack: #observability

**Monitoring Providers:**
- BetterStack Support: https://betterstack.com/support
- Sentry Support: https://sentry.io/support/

**Documentation:**
- BetterStack Docs: https://betterstack.com/docs
- Health Endpoint Reference: `/server/api/routers/health.ts`
- Deployment Checklist: `/DEPLOYMENT_CHECKLIST.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Next Review:** 2026-01-18
