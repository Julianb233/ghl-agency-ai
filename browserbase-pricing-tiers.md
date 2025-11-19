# Browserbase Pricing Tiers (Actual)

## Pricing Plans

| Plan | Price | Concurrent Browsers | Browser Hours | Overage Rate |
|------|-------|---------------------|---------------|--------------|
| Free | $0/mo | 1 | 1 hour | N/A |
| Developer | $20/mo | 25 | 100 hours | $0.12/hour |
| Startup | $99/mo | 100 | 500 hours | $0.10/hour |
| Scale | Custom | 250+ | Usage-based | Negotiated |

## Key Insights for Cost Modeling

### Concurrent vs. Per-Client Costs

**Critical Understanding:**
- You pay for **concurrent browser sessions**, NOT per client
- If you have 100 clients but only 20 are active simultaneously, you only need 20 concurrent browsers
- Typical usage pattern: 10-20% of clients active at any given time

### Realistic Concurrent Usage Estimates

**Starter Tier Clients** (2-3 browsers each):
- 10 clients: ~2-3 concurrent (most idle)
- 100 clients: ~15-20 concurrent (10-20% active)
- 1,000 clients: ~150-200 concurrent (15-20% active)

**Growth Tier Clients** (5 browsers each):
- 10 clients: ~5-8 concurrent
- 100 clients: ~50-70 concurrent
- 1,000 clients: ~500-700 concurrent

### Browserbase Plan Selection by Scale

**10-50 total clients:**
- Developer Plan ($20/mo) - 25 concurrent browsers
- Covers: ~10-15 Starter clients OR ~5 Growth clients

**50-200 total clients:**
- Startup Plan ($99/mo) - 100 concurrent browsers
- Covers: ~50-75 Starter clients OR ~20-30 Growth clients OR mix

**200-1,000 total clients:**
- Scale Plan (Custom, est. $500-1,500/mo) - 250+ concurrent
- Negotiate volume pricing

**1,000+ total clients:**
- Enterprise Scale Plan (Custom, est. $2,000-5,000/mo)
- Dedicated infrastructure, custom SLA

## Cost Scaling Model

### Shared Infrastructure Approach

Instead of linear scaling (clients × cost), use **tier-based scaling**:

| Total Clients | Browserbase Plan | Monthly Cost | Cost Per Client |
|---------------|------------------|--------------|-----------------|
| 10 | Developer | $20 | $2.00 |
| 50 | Startup | $99 | $1.98 |
| 100 | Startup | $99 | $0.99 |
| 500 | Scale (est.) | $500 | $1.00 |
| 1,000 | Scale (est.) | $1,200 | $1.20 |
| 5,000 | Enterprise (est.) | $3,500 | $0.70 |
| 10,000 | Enterprise (est.) | $6,000 | $0.60 |

### Volume Discounts

- **Neon DB**: Free tier → $19/mo → $69/mo → Custom (not per-client)
- **Vercel**: Hobby (free) → Pro ($20/mo) → Enterprise (custom)
- **1Password**: $7/mo for unlimited vaults (shared across all clients)
- **n8n**: Self-hosted on Hostinger (no additional cost)

## Corrected Cost Structure

### Per-Tier Operational Costs (Shared Infrastructure)

| Client Count | Browserbase | Neon DB | Vercel | 1Password | Total Monthly Cost | Avg Cost/Client |
|--------------|-------------|---------|--------|-----------|-------------------|-----------------|
| 10 | $20 | $0 | $0 | $7 | **$27** | $2.70 |
| 50 | $99 | $19 | $20 | $7 | **$145** | $2.90 |
| 100 | $99 | $19 | $20 | $7 | **$145** | $1.45 |
| 500 | $500 | $69 | $20 | $7 | **$596** | $1.19 |
| 1,000 | $1,200 | $69 | $20 | $7 | **$1,296** | $1.30 |
| 5,000 | $3,500 | $69 | $20 | $7 | **$3,596** | $0.72 |
| 10,000 | $6,000 | $69 | $20 | $7 | **$6,096** | $0.61 |

## Key Takeaway

**Costs scale with infrastructure tiers, NOT linearly with client count.**

At 10,000 clients, your total operational cost is ~$6,100/month, NOT $60,000+/month as incorrectly calculated before.
