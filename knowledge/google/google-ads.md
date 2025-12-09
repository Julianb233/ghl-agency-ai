# Google Ads Complete Guide

## Overview

Google Ads is Google's online advertising platform that allows businesses to display ads across Google Search, YouTube, Gmail, and the Google Display Network.

## Campaign Types

### 1. Search Campaigns
Text ads appearing on Google Search results.

**Best For**: High-intent leads, direct response
**Bidding**: CPC, Target CPA, Target ROAS

**Ad Components**:
- Headlines (up to 15, 30 chars each)
- Descriptions (up to 4, 90 chars each)
- Display URL path
- Final URL
- Ad extensions

### 2. Display Campaigns
Visual ads across 2+ million websites and apps.

**Best For**: Brand awareness, remarketing
**Targeting Options**:
- Audience segments
- Demographics
- Placements
- Topics
- Keywords

**Ad Formats**:
- Responsive display ads
- Image ads (various sizes)
- HTML5 ads

### 3. Video Campaigns (YouTube)
Video ads on YouTube and partner sites.

**Ad Formats**:
- Skippable in-stream
- Non-skippable in-stream
- Bumper ads (6 seconds)
- In-feed video ads
- Shorts ads

### 4. Shopping Campaigns
Product listings with images and prices.

**Requirements**:
- Google Merchant Center account
- Product feed
- Website with checkout

**Types**:
- Standard Shopping
- Performance Max
- Local inventory ads

### 5. Performance Max
AI-driven campaigns across all Google channels.

**Features**:
- Automated targeting
- Asset-based creative
- Cross-channel optimization
- Audience signals

### 6. App Campaigns
Promote mobile apps across Google properties.

**Goals**:
- App installs
- App engagement
- App pre-registration

### 7. Local Campaigns
Drive foot traffic to physical locations.

**Features**:
- Google Maps ads
- Local inventory
- Store visit tracking

## Account Structure

### Hierarchy
```
Account
├── Campaign 1
│   ├── Ad Group A
│   │   ├── Keywords
│   │   └── Ads
│   └── Ad Group B
│       ├── Keywords
│       └── Ads
└── Campaign 2
    └── Ad Groups...
```

### Best Practices
- Group related keywords in ad groups
- Use specific ad groups (10-20 keywords max)
- Separate by match type if needed
- Use naming conventions

## Keyword Strategies

### Match Types

| Type | Symbol | Example | Matches |
|------|--------|---------|---------|
| Broad | none | running shoes | running sneakers, jogging footwear |
| Phrase | "..." | "running shoes" | best running shoes, running shoes for men |
| Exact | [...] | [running shoes] | running shoes, runners shoes |

### Keyword Research Process
1. Brainstorm seed keywords
2. Use Keyword Planner
3. Analyze competitor keywords
4. Check search volume and competition
5. Group by theme/intent
6. Add negative keywords

### Negative Keywords
Prevent ads from showing for irrelevant searches.

**Types**:
- Campaign-level negatives
- Ad group-level negatives
- Negative keyword lists (shared)

**Common Negatives**:
- Free, cheap, discount (if premium brand)
- Jobs, careers, salary (unless hiring)
- How to, tutorial, DIY (unless selling courses)

## Bidding Strategies

### Manual Bidding
- **Manual CPC**: Set max CPC for each keyword
- **Enhanced CPC**: Manual with smart adjustments

### Automated Bidding
- **Maximize Clicks**: Get most clicks within budget
- **Maximize Conversions**: Get most conversions
- **Target CPA**: Maintain target cost per acquisition
- **Target ROAS**: Maintain target return on ad spend
- **Maximize Conversion Value**: Optimize for revenue
- **Target Impression Share**: Maintain visibility

### Bidding Recommendations
| Goal | Strategy |
|------|----------|
| Brand awareness | Target Impression Share |
| Website traffic | Maximize Clicks |
| Lead generation | Target CPA |
| E-commerce | Target ROAS |
| New campaigns | Maximize Conversions (learn first) |

## Ad Extensions/Assets

### Extension Types

**Sitelinks**: Additional links to specific pages
```
Example:
[Main Ad]
Shop Now | Contact Us | About Us | FAQ
```

**Callouts**: Highlight features/benefits
```
Free Shipping | 24/7 Support | 30-Day Returns
```

**Structured Snippets**: List features
```
Services: SEO, PPC, Social Media, Email Marketing
```

**Call Extensions**: Phone number
```
Call (555) 123-4567
```

**Location Extensions**: Business address
```
123 Main St, City - 2.5 miles away
```

**Price Extensions**: Show prices
```
Basic Plan: $29/mo | Pro Plan: $99/mo
```

**Image Extensions**: Add images to search ads

**Lead Form Extensions**: Collect leads in-ad

## Conversion Tracking

### Setup Methods

**1. Google Tag (gtag.js)**
```html
<!-- Global site tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-XXXXXXXXX');
</script>

<!-- Conversion tracking -->
<script>
  gtag('event', 'conversion', {
    'send_to': 'AW-XXXXXXXXX/YYYYYYYYY',
    'value': 100.00,
    'currency': 'USD'
  });
</script>
```

**2. Google Tag Manager**
- Create conversion linker tag
- Create conversion tracking tag
- Set up triggers

**3. Import from GA4**
- Link GA4 to Google Ads
- Import GA4 conversions
- Enable auto-tagging

### Conversion Types
- Website actions (form, purchase)
- Phone calls
- App installs/actions
- Imported conversions (offline)

### Enhanced Conversions
Improve measurement accuracy:
```javascript
gtag('set', 'user_data', {
  'email': 'user@example.com',
  'phone_number': '+1234567890'
});
```

## Audience Targeting

### Audience Types

**1. In-Market Audiences**
Users actively researching products/services

**2. Affinity Audiences**
Users based on interests and habits

**3. Custom Audiences**
- Custom intent (keywords, URLs)
- Custom affinity

**4. Remarketing Lists**
- Website visitors
- App users
- Customer lists
- YouTube viewers

**5. Similar Audiences** (being phased out)
Users similar to your existing audiences

**6. Demographic Targeting**
- Age
- Gender
- Parental status
- Household income

### Audience Strategies
- **Observation**: Bid adjustments only
- **Targeting**: Show ads only to audience

## Quality Score

### Components
- Expected CTR
- Ad relevance
- Landing page experience

### Improving Quality Score
1. **Keywords**: Use relevant, specific keywords
2. **Ad Copy**: Include keywords, compelling CTAs
3. **Landing Pages**: Fast, relevant, mobile-friendly
4. **Ad Groups**: Tightly themed
5. **Extensions**: Use all relevant extensions

### Quality Score Impact
| QS | CPC Impact |
|----|------------|
| 10 | -50% |
| 8 | -25% |
| 6 | 0% (baseline) |
| 4 | +25% |
| 2 | +150% |

## Reporting & Analytics

### Key Metrics
- **Impressions**: Ad views
- **Clicks**: Ad clicks
- **CTR**: Click-through rate
- **CPC**: Cost per click
- **Conversions**: Goal completions
- **Conversion Rate**: Conversions/clicks
- **CPA**: Cost per acquisition
- **ROAS**: Revenue/ad spend
- **Impression Share**: % of available impressions

### Custom Reports
1. Go to Reports
2. Create custom report
3. Select dimensions and metrics
4. Add filters and segments
5. Save and schedule

### Segments
- Time (day, week, month)
- Device
- Network
- Click type
- Conversion action

## Optimization Tips

### Daily/Weekly Tasks
- Check budget pacing
- Review search terms
- Add negative keywords
- Pause underperforming ads
- Check conversion tracking

### Monthly Tasks
- Review Quality Scores
- Analyze audience performance
- Test new ad copy
- Adjust bids/targets
- Review competitors

### Optimization Checklist
1. ✓ Negative keywords updated
2. ✓ Ad copy A/B testing
3. ✓ Extensions implemented
4. ✓ Landing pages optimized
5. ✓ Conversion tracking verified
6. ✓ Audiences refined
7. ✓ Bid strategy appropriate
8. ✓ Budget allocation optimized

## Google Ads API

### Authentication
```javascript
const { GoogleAdsApi } = require('google-ads-api');

const client = new GoogleAdsApi({
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
  developer_token: 'YOUR_DEVELOPER_TOKEN'
});

const customer = client.Customer({
  customer_id: 'CUSTOMER_ID',
  refresh_token: 'REFRESH_TOKEN'
});
```

### Common Operations
```javascript
// Get campaigns
const campaigns = await customer.query(`
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
`);

// Update campaign budget
await customer.campaignBudgets.update({
  resource_name: 'customers/123/campaignBudgets/456',
  amount_micros: 50000000 // $50
});
```

## Best Practices

1. **Start with Search**: Build foundation before expanding
2. **Use Smart Bidding**: Let AI optimize after learning period
3. **Write Compelling Ads**: Focus on benefits, use CTAs
4. **Test Constantly**: Ad copy, landing pages, audiences
5. **Monitor Closely**: Check performance daily initially
6. **Use Automation**: Scripts, rules, recommendations
7. **Stay Organized**: Clear naming conventions, labels
8. **Track Everything**: Proper conversion setup is critical

## Common Issues & Solutions

### Low Quality Score
- Review keyword-ad-landing page relevance
- Improve landing page speed
- Add more relevant keywords to ad copy

### High CPA
- Review and narrow targeting
- Add negative keywords
- Test different bidding strategies
- Improve landing page conversion rate

### Low Impression Share
- Increase budget or bids
- Improve Quality Score
- Broaden targeting
- Add more keywords

### Disapproved Ads
- Review policy violations
- Check destination requirements
- Request manual review if appropriate
