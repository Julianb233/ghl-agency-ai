# Google Analytics 4 (GA4) Complete Guide

## Overview

GA4 is Google's latest analytics platform, replacing Universal Analytics. It uses an event-based data model and provides cross-platform tracking.

## Key Differences from Universal Analytics

| Feature | Universal Analytics | GA4 |
|---------|-------------------|-----|
| Data Model | Session-based | Event-based |
| Tracking | Pageviews + Events | All interactions are events |
| Reports | Pre-defined | Customizable + Explorations |
| Attribution | Last Click | Data-driven |
| Privacy | Cookie-dependent | Privacy-centric |
| AI Features | Limited | Predictive metrics, insights |

## Setup & Configuration

### 1. Creating a GA4 Property
1. Go to admin.google.com/analytics
2. Click "Create Property"
3. Enter property name and details
4. Select industry and business size
5. Create data stream (Web, iOS, Android)

### 2. Installing the Tracking Code

**gtag.js Method**
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Google Tag Manager Method (Recommended)**
1. Create GTM container
2. Add GA4 Configuration tag
3. Set trigger to "All Pages"
4. Publish container

### 3. Enhanced Measurement Events
Automatically tracked (enable in Data Stream settings):
- Page views
- Scrolls (90% depth)
- Outbound clicks
- Site search
- Video engagement (YouTube embeds)
- File downloads

## Event Tracking

### Event Structure
```javascript
gtag('event', 'event_name', {
  'parameter_name': 'parameter_value',
  'another_parameter': 'another_value'
});
```

### Recommended Events (E-commerce)
```javascript
// View item
gtag('event', 'view_item', {
  currency: 'USD',
  value: 29.99,
  items: [{
    item_id: 'SKU_123',
    item_name: 'Product Name',
    category: 'Category',
    price: 29.99
  }]
});

// Add to cart
gtag('event', 'add_to_cart', {
  currency: 'USD',
  value: 29.99,
  items: [{item_id: 'SKU_123', item_name: 'Product', quantity: 1}]
});

// Purchase
gtag('event', 'purchase', {
  transaction_id: 'T12345',
  value: 59.98,
  currency: 'USD',
  items: [{item_id: 'SKU_123', item_name: 'Product', quantity: 2}]
});
```

### Lead Generation Events
```javascript
// Form submission
gtag('event', 'generate_lead', {
  currency: 'USD',
  value: 50.00,
  lead_source: 'contact_form'
});

// Sign up
gtag('event', 'sign_up', {
  method: 'email'
});

// Phone click
gtag('event', 'click_to_call', {
  phone_number: '+1234567890'
});
```

### Custom Events
```javascript
// Custom event example
gtag('event', 'video_progress', {
  video_title: 'Product Demo',
  video_percent: 50,
  video_duration: 120
});
```

## Conversions

### Setting Up Conversions
1. Admin > Events
2. Find or create the event
3. Toggle "Mark as conversion"

### Key Conversion Events
- purchase
- generate_lead
- sign_up
- begin_checkout
- contact_form_submit
- phone_call_click
- appointment_scheduled

## Reports & Analysis

### Standard Reports
- **Realtime**: Current users, events, conversions
- **Acquisition**: Traffic sources, campaigns
- **Engagement**: Pages, events, conversions
- **Monetization**: Revenue, purchases, ads
- **Retention**: User retention, cohorts

### Key Metrics
- **Users**: Total unique users
- **Sessions**: User visits
- **Engagement Rate**: Non-bounced sessions / total sessions
- **Average Engagement Time**: Time users actively engaged
- **Conversions**: Goal completions
- **Revenue**: E-commerce revenue

### Explorations
Custom analysis tool for deep dives:
- Free-form exploration
- Funnel exploration
- Path exploration
- Segment overlap
- User lifetime
- Cohort exploration

## Audiences & Segmentation

### Creating Audiences
1. Admin > Audiences > New Audience
2. Define conditions (events, dimensions, metrics)
3. Set duration (how long users stay in audience)
4. Save and activate

### Audience Examples
- **Purchasers**: event = purchase (last 30 days)
- **Cart Abandoners**: add_to_cart but not purchase
- **High Engagers**: session_duration > 5 minutes
- **Returning Users**: session_count > 1

### Predictive Audiences
GA4 creates ML-based audiences:
- Likely 7-day purchasers
- Likely 7-day churners
- Predicted top spenders

## Attribution

### Attribution Models
- **Data-driven**: ML-based, recommended
- **Last click**: Last interaction gets 100%
- **First click**: First interaction gets 100%
- **Linear**: Equal credit to all touchpoints
- **Position-based**: 40% first, 40% last, 20% middle
- **Time decay**: More credit to recent interactions

### Setting Default Model
Admin > Attribution Settings > Reporting Attribution Model

## Google Ads Integration

### Linking GA4 to Google Ads
1. Admin > Google Ads Links
2. Click "Link"
3. Select Google Ads account
4. Enable auto-tagging
5. Import conversions

### Importing Conversions
1. In Google Ads: Tools > Conversions
2. Click "+ New Conversion Action"
3. Select "Import" > Google Analytics 4
4. Select GA4 conversions to import

## BigQuery Export

### Setting Up BigQuery Export
1. Admin > BigQuery Links
2. Create link to BigQuery project
3. Select export frequency (daily/streaming)
4. Data exports to BigQuery tables

### BigQuery Benefits
- Raw event-level data
- Unlimited data retention
- Advanced SQL analysis
- ML model building

## Privacy & Consent

### Consent Mode
```javascript
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied'
});

// When user consents:
gtag('consent', 'update', {
  'analytics_storage': 'granted',
  'ad_storage': 'granted'
});
```

### Data Retention
- Default: 14 months
- Options: 2, 14, 26, 38, 50 months
- Set in Admin > Data Settings > Data Retention

## Common Troubleshooting

### Data Not Showing
1. Check tracking code installation
2. Verify property ID is correct
3. Allow 24-48 hours for data processing
4. Check filters aren't excluding traffic

### Conversions Not Tracking
1. Verify event is firing (Realtime report)
2. Check event is marked as conversion
3. Confirm conversion window settings
4. Test with DebugView

### Using DebugView
1. Install GA Debugger Chrome extension
2. Enable debug mode on your site
3. View events in real-time in GA4 DebugView

## Best Practices

1. **Plan your measurement strategy** before implementation
2. **Use GTM** for tag management
3. **Set up conversions** for all business goals
4. **Create audiences** for remarketing
5. **Link to Google Ads** for full attribution
6. **Export to BigQuery** for advanced analysis
7. **Review data quality** regularly
8. **Document your setup** for team reference
