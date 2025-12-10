# Google Tag Manager Complete Guide

## Overview

Google Tag Manager (GTM) is a free tag management system that lets you manage and deploy marketing tags (snippets of code) on your website without modifying code.

## Setup

### Installing GTM

**Container Code** (Add to all pages)
```html
<!-- Head section (as high as possible) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- Body section (immediately after opening tag) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

### Container Types
- **Web**: Websites
- **AMP**: Accelerated Mobile Pages
- **iOS**: iOS apps
- **Android**: Android apps
- **Server**: Server-side tagging

## Core Concepts

### Tags
Code snippets that execute on your site.

**Common Tags**:
- Google Analytics 4 Configuration
- Google Ads Conversion Tracking
- Google Ads Remarketing
- Facebook Pixel
- LinkedIn Insight Tag
- Custom HTML
- Custom Image

### Triggers
Conditions that fire tags.

**Trigger Types**:
- Page View
- DOM Ready
- Window Loaded
- Click (All Elements / Just Links)
- Form Submission
- Scroll Depth
- Element Visibility
- YouTube Video
- Timer
- History Change
- Custom Event

### Variables
Dynamic values used in tags and triggers.

**Built-in Variables**:
- Page URL, Page Path, Page Hostname
- Click Element, Click Classes, Click ID, Click URL
- Form Element, Form Classes, Form ID
- Video Title, Video Status, Video Percent

**User-Defined Variables**:
- Data Layer Variable
- JavaScript Variable
- 1st Party Cookie
- DOM Element
- Constant
- Lookup Table
- RegEx Table

## Data Layer

### What is the Data Layer?
A JavaScript object that stores data for GTM to use.

```javascript
// Initialize (automatic, but can customize)
window.dataLayer = window.dataLayer || [];
```

### Pushing Data
```javascript
// Simple push
dataLayer.push({
  'event': 'button_click',
  'buttonName': 'Sign Up'
});

// E-commerce data
dataLayer.push({
  'event': 'purchase',
  'ecommerce': {
    'transaction_id': 'T12345',
    'value': 99.99,
    'currency': 'USD',
    'items': [{
      'item_id': 'SKU123',
      'item_name': 'Product Name',
      'price': 99.99,
      'quantity': 1
    }]
  }
});
```

### Data Layer Best Practices
1. Push before GTM container loads when possible
2. Use consistent naming conventions
3. Document your data layer schema
4. Reset e-commerce object before new push
```javascript
dataLayer.push({ ecommerce: null }); // Clear previous
dataLayer.push({ event: 'purchase', ecommerce: {...} });
```

## GA4 Implementation

### GA4 Configuration Tag
1. Create new tag
2. Select "Google Analytics: GA4 Configuration"
3. Enter Measurement ID (G-XXXXXXXX)
4. Set trigger: All Pages
5. Save and publish

### GA4 Event Tag
1. Create new tag
2. Select "Google Analytics: GA4 Event"
3. Select Configuration Tag
4. Enter Event Name
5. Add Event Parameters
6. Set appropriate trigger

### Common GA4 Events Setup

**Page View** (automatic with config tag)

**Form Submission**
```
Tag: GA4 Event - generate_lead
Event Name: generate_lead
Parameters:
  - form_id: {{Form ID}}
  - form_name: {{Form Name Variable}}
Trigger: Form Submission
```

**Button Click**
```
Tag: GA4 Event - button_click
Event Name: button_click
Parameters:
  - button_text: {{Click Text}}
  - button_id: {{Click ID}}
Trigger: Click - Just Links/All Elements (with conditions)
```

**Scroll Tracking**
```
Tag: GA4 Event - scroll
Event Name: scroll
Parameters:
  - percent_scrolled: {{Scroll Depth Threshold}}
Trigger: Scroll Depth (25%, 50%, 75%, 90%)
```

## Google Ads Tracking

### Conversion Linker Tag
Required for accurate conversion tracking.
1. Create tag: Conversion Linker
2. Trigger: All Pages
3. Enable "Link across domains" if needed

### Conversion Tracking Tag
```
Tag Type: Google Ads Conversion Tracking
Conversion ID: AW-XXXXXXXXX
Conversion Label: YYYYYYYYY
Conversion Value: {{Purchase Value}} (optional)
Currency Code: USD
Trigger: Form Submission / Purchase Confirmation
```

### Remarketing Tag
```
Tag Type: Google Ads Remarketing
Conversion ID: AW-XXXXXXXXX
Trigger: All Pages
Custom Parameters: (optional for dynamic remarketing)
  - ecomm_prodid: {{Product ID}}
  - ecomm_pagetype: {{Page Type}}
  - ecomm_totalvalue: {{Cart Value}}
```

## Facebook Pixel

### Base Pixel Setup
```
Tag Type: Custom HTML
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
Trigger: All Pages
```

### Facebook Event Tags
```
Tag Type: Custom HTML
<script>
fbq('track', 'Lead', {
  content_name: '{{Form Name}}',
  content_category: 'Contact Form'
});
</script>
Trigger: Form Submission
```

## Advanced Triggers

### Click Trigger with Conditions
```
Trigger Type: Click - All Elements
Fire on: Some Clicks
Conditions:
  - Click Classes contains "cta-button"
  - OR Click ID equals "signup-btn"
  - OR Click Text contains "Get Started"
```

### Custom Event Trigger
```
Trigger Type: Custom Event
Event name: form_success
// Fires when: dataLayer.push({'event': 'form_success'})
```

### Element Visibility Trigger
```
Trigger Type: Element Visibility
Selection Method: CSS Selector
Element Selector: #pricing-section
Fire on: Once per page
Minimum visible: 50%
```

### YouTube Video Trigger
```
Trigger Type: YouTube Video
Capture: Start, Complete, Pause, Seeking, Progress
Progress percentages: 25, 50, 75, 90
```

## Variables Deep Dive

### Data Layer Variable
```
Variable Type: Data Layer Variable
Data Layer Variable Name: ecommerce.transaction_id
Version: Version 2
```

### JavaScript Variable
```
Variable Type: JavaScript Variable
Global Variable Name: document.title
```

### Custom JavaScript Variable
```
Variable Type: Custom JavaScript
function() {
  var url = window.location.href;
  if (url.indexOf('/product/') > -1) {
    return 'Product Page';
  } else if (url.indexOf('/cart') > -1) {
    return 'Cart Page';
  }
  return 'Other';
}
```

### Lookup Table
```
Variable Type: Lookup Table
Input Variable: {{Page Path}}
Lookup Table:
  /contact → Contact Page
  /pricing → Pricing Page
  /about → About Page
Default: Other
```

### RegEx Table
```
Variable Type: RegEx Table
Input Variable: {{Page URL}}
Pattern → Output:
  /blog/.* → Blog
  /product/\d+ → Product
  /category/.+ → Category
```

## Server-Side Tagging

### Benefits
- Improved performance
- Better data control
- Enhanced privacy
- Reduced ad blocker impact

### Setup Overview
1. Create Server container in GTM
2. Deploy to Google Cloud or custom server
3. Configure client(s)
4. Create server-side tags
5. Update web container to send to server

### Server Container Clients
- GA4
- Google Ads
- Facebook Conversions API
- Custom

## Debugging & Testing

### Preview Mode
1. Click "Preview" in GTM
2. Enter site URL
3. Debug panel opens
4. See tags fired, variables, data layer

### Debug Panel Features
- Tags tab: See fired/not fired tags
- Variables tab: All variable values
- Data Layer tab: Push history
- Errors tab: Any issues

### Common Debugging Issues

**Tag Not Firing**
1. Check trigger conditions
2. Verify variables have values
3. Look for JavaScript errors
4. Check tag sequencing

**Wrong Data Captured**
1. Inspect variable configuration
2. Check data layer pushes
3. Verify timing (too early/late)

## Best Practices

### Naming Conventions
```
Tags: [Type] - [Platform] - [Description]
  GA4 - Event - Form Submission
  GADS - Conversion - Purchase
  FB - Event - Lead

Triggers: [Type] - [Condition]
  Click - CTA Button
  PageView - Thank You Page
  Custom - Form Success

Variables: [Type] - [Description]
  DLV - Transaction ID
  JS - Page Type
  Cookie - User ID
```

### Organization
- Use folders for different platforms
- Document complex configurations
- Use consistent naming
- Add notes to tags

### Performance
- Minimize custom HTML tags
- Use built-in tags when possible
- Consider tag sequencing
- Implement server-side tagging for high-traffic sites

### Version Control
- Name versions descriptively
- Publish incrementally
- Test before publishing
- Use workspaces for team collaboration

## Troubleshooting

### Tags Not Firing
1. ✓ Check trigger conditions in preview
2. ✓ Verify all required variables
3. ✓ Look for JavaScript console errors
4. ✓ Confirm GTM container is installed

### Data Not Appearing in GA4
1. ✓ Verify Measurement ID
2. ✓ Check GA4 real-time reports
3. ✓ Wait 24-48 hours for reports
4. ✓ Verify event parameters match schema

### Conversion Tracking Issues
1. ✓ Confirm Conversion Linker is firing
2. ✓ Check conversion ID/label
3. ✓ Verify trigger timing
4. ✓ Test with Google Tag Assistant
