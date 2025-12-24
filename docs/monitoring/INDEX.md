# Monitoring & Observability Documentation

This directory contains all monitoring, observability, and incident response documentation for the GHL Agency AI platform.

## Quick Access

### Main Documentation
- [MONITORING_INDEX.md](./MONITORING_INDEX.md) - Comprehensive monitoring index
- [MONITORING_QUICK_START.md](./MONITORING_QUICK_START.md) - Quick start guide for monitoring setup
- [MONITORING_SUMMARY.md](./MONITORING_SUMMARY.md) - Summary of monitoring implementation

### Implementation Guides
- [MONITORING_IMPLEMENTATION_GUIDE.md](./MONITORING_IMPLEMENTATION_GUIDE.md) - Detailed implementation guide
- [UPTIME_MONITORING_SETUP.md](./UPTIME_MONITORING_SETUP.md) - Uptime monitoring setup instructions
- [UPTIME_MONITORING_PRODUCTION.md](./UPTIME_MONITORING_PRODUCTION.md) - Production uptime monitoring

### Reports & Status
- [MONITORING_REPORT.md](./MONITORING_REPORT.md) - Latest monitoring report
- [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md) - Incident response procedures

### Configuration
- [.betterstack-monitors.json](./.betterstack-monitors.json) - BetterStack monitoring configuration

## Monitoring Stack

### BetterStack (Uptime & Status Pages)
- Uptime monitoring
- Status pages
- Incident management
- Alerting

### Application Monitoring
- API endpoint health checks
- Database performance monitoring
- Cache hit rates
- Error tracking

## Getting Started

### Initial Setup
1. Review [MONITORING_QUICK_START.md](./MONITORING_QUICK_START.md)
2. Follow [MONITORING_IMPLEMENTATION_GUIDE.md](./MONITORING_IMPLEMENTATION_GUIDE.md)
3. Set up uptime monitoring: [UPTIME_MONITORING_SETUP.md](./UPTIME_MONITORING_SETUP.md)

### Production Deployment
1. Review [UPTIME_MONITORING_PRODUCTION.md](./UPTIME_MONITORING_PRODUCTION.md)
2. Configure alerts using [.betterstack-monitors.json](./.betterstack-monitors.json)
3. Test incident response with [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md)

## Incident Response

When incidents occur:
1. Follow [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md)
2. Check monitoring dashboards
3. Review recent alerts
4. Document incident in [MONITORING_REPORT.md](./MONITORING_REPORT.md)

## Key Metrics

### Uptime Targets
- API Uptime: 99.9%
- Database Uptime: 99.95%
- Frontend Uptime: 99.9%

### Performance Targets
- API Response Time: < 500ms (p95)
- Page Load Time: < 2s (p95)
- Database Query Time: < 100ms (p95)

## Alerts

All alerts are configured in [.betterstack-monitors.json](./.betterstack-monitors.json):
- API downtime
- High error rates
- Slow response times
- Database connectivity issues
- Cache failures

## Related Documentation

- [Deployment Documentation](../deployment/)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [Architecture Documentation](../ARCHITECTURE.md)

## Dashboards

### BetterStack
- Status page: [Configure in BetterStack]
- Uptime dashboard: [Configure in BetterStack]

### Application Metrics
- Performance metrics endpoint: `/api/health`
- System metrics: See [MONITORING_REPORT.md](./MONITORING_REPORT.md)
