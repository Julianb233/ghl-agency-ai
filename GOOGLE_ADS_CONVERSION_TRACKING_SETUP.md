# Google Ads Conversion Tracking Setup Guide

This guide explains how to set up and configure Google Ads conversion tracking for GHL Agency AI.

## Table of Contents

- [Overview](#overview)
- [Setup Options](#setup-options)
- [Configuration Steps](#configuration-steps)
- [Conversion Events](#conversion-events)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The GHL Agency AI application now includes comprehensive conversion tracking for Google Ads and Google Analytics. The implementation supports:

- **Google Ads conversion tracking** via gtag.js
- **Google Tag Manager (GTM)** as an alternative option
- **Enhanced conversions** for better attribution
- **Facebook Pixel integration** (already configured)
- **GDPR-compliant consent management**

## Setup Options

You have two options for tracking:

### Option 1: Google Ads with gtag.js (Default - Currently Active)

This is simpler and requires only your Google Ads Conversion ID.

**Pros:**
- Faster to set up
- Less overhead
- Direct tracking

**Cons:**
- Less flexible for managing multiple tags
- Requires code changes to add new tracking

### Option 2: Google Tag Manager (Recommended for Scale)

Use GTM for centralized tag management.

**Pros:**
- Manage all tracking tags in one place
- No code changes needed to add/modify tracking
- Better for teams
- Can include Google Ads, GA4, Facebook Pixel, and more

**Cons:**
- Slightly more complex initial setup
- Additional tool to manage

## Configuration Steps

### Step 1: Get Your Google Ads Conversion ID

1. Log into your Google Ads account
2. Click **Tools & Settings** > **Measurement** > **Conversions**
3. Click **+ New conversion action**
4. Select **Website** as the conversion source
5. Choose **Manual code installation** (or use GTM)
6. Your conversion ID will look like: `AW-XXXXXXXXX`
7. Create conversion actions for each event type (see below)
8. Note down the conversion labels for each action

### Step 2A: Configure gtag.js (Default Method)

1. Open `/root/github-repos/active/ghl-agency-ai/client/index.html`

2. Replace `AW-XXXXXXXXX` with your actual Google Ads Conversion ID (in 3 places):

```html
<!-- Line 89: Load gtag.js -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>

<!-- Line 103: Configure Google Ads -->
gtag('config', 'AW-XXXXXXXXX', {
  'allow_enhanced_conversions': true
});
```

3. **Optional:** If you want GA4 tracking as well, uncomment lines 108-110 and add your GA4 ID:

```html
gtag('config', 'G-XXXXXXXXXX', {
  'send_page_view': true
});
```

4. Open `/root/github-repos/active/ghl-agency-ai/client/src/lib/analytics.ts`

5. Update the conversion labels (line 27-37) with your actual labels from Google Ads:

```typescript
const CONVERSION_LABELS: Record<ConversionEvent, string> = {
  [ConversionEvent.EMAIL_SIGNUP]: 'YOUR_LABEL_HERE',
  [ConversionEvent.TRIAL_START]: 'YOUR_LABEL_HERE',
  [ConversionEvent.CTA_CLICK]: 'YOUR_LABEL_HERE',
  // ... etc
};
```

6. Update the conversion ID in the tracking function (line 65):

```typescript
send_to: `AW-XXXXXXXXX/${label}`, // Replace with your actual ID
```

### Step 2B: Configure Google Tag Manager (Alternative)

If you prefer GTM:

1. Open `/root/github-repos/active/ghl-agency-ai/client/index.html`

2. **Comment out** the gtag.js section (lines 86-111)

3. **Uncomment** the GTM section (lines 76-84 and 129-133)

4. Replace `GTM-XXXXXXX` with your actual GTM Container ID:

```html
<!-- In <head> -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- In <body> -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

5. In your GTM account:
   - Create triggers for each conversion event
   - Create tags for Google Ads conversions
   - Map the dataLayer events to your conversion actions

## Conversion Events

The following conversion events are tracked automatically:

| Event | Description | Tracked When | Value |
|-------|-------------|--------------|-------|
| `email_signup` | User submits email | Newsletter/lead forms | - |
| `trial_start` | User starts trial | Clicks trial button | $497 |
| `cta_click` | CTA button clicked | Any "Get Started" button | - |
| `pricing_view` | Pricing section viewed | User scrolls to pricing or clicks nav | - |
| `form_submit` | Form submitted | Contact/demo forms | - |
| `exit_intent_conversion` | Exit popup conversion | User clicks exit popup CTA | - |
| `demo_request` | Demo requested | Enterprise/custom plan buttons | - |
| `registration_complete` | User completes signup | After successful registration | $497 |
| `onboarding_complete` | User completes onboarding | After onboarding flow | - |

### Event Locations

Conversion tracking is implemented on these buttons:

**Header:**
- Mobile: "Log In", "Start Free"
- Desktop: "Log In", "Start Free"
- Mobile Menu: "Log In", "Start Free"

**Hero Section:**
- "Claim Your Freedom" (main CTA)

**Pricing Section:**
- "Get Started" (Starter tier)
- "Get Started" (Growth tier)
- "Get Started" (Professional tier)
- "Book a Demo" (Enterprise tier)

**Final CTA:**
- "I'm Ready To Reclaim My Life"

**Forms:**
- Login/Signup form
- Onboarding completion
- Exit intent popup

## Testing

### Test in Development

1. Build the app:
```bash
npm run build
npm run dev
```

2. Open browser DevTools > Console

3. Click various CTAs and buttons

4. Look for console logs:
```
[Analytics] Conversion tracked: cta_click {button_location: "hero_claim_freedom", ...}
```

5. Check Network tab for gtag requests to `www.google-analytics.com/g/collect`

### Test with Google Tag Assistant

1. Install [Tag Assistant Companion](https://chrome.google.com/webstore/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm)

2. Visit your site

3. Click "Tag Assistant" in browser toolbar

4. Verify tags are firing correctly

### Test in Google Ads

1. Go to Google Ads > Tools > Conversions

2. Check "Recent conversions" column

3. Test conversions should appear within a few hours

## Troubleshooting

### Conversions Not Showing in Google Ads

**Check:**
1. Conversion ID is correct in `index.html`
2. Conversion labels are correct in `analytics.ts`
3. Cookie consent was granted (check browser cookies)
4. Ad blockers are disabled during testing
5. Wait 24-48 hours for data to appear in Google Ads

**Debug:**
```javascript
// In browser console:
window.dataLayer
// Should show array of events

window.gtag
// Should be defined
```

### Cookie Consent Issues

The app uses GDPR-compliant consent mode. Users must accept cookies before tracking starts.

**To test consent:**
1. Clear localStorage: `localStorage.clear()`
2. Reload page
3. Accept cookie banner
4. Test conversions again

### TypeScript Errors

If you see TypeScript errors after adding tracking:

```bash
npm run check
```

The analytics module includes proper TypeScript declarations, so there should be no errors.

## Advanced Configuration

### Custom Conversion Values

To set custom values for conversions, edit the hook in `/client/src/hooks/useConversionTracking.ts`:

```typescript
const trackTrialStart = useCallback((params: TrackingParams = {}) => {
  trackConversion(ConversionEvent.TRIAL_START, {
    event_category: 'conversion',
    value: 497, // Change this value
    currency: 'USD',
    ...params,
  });
}, []);
```

### Add New Conversion Events

1. Add event to enum in `analytics.ts`:
```typescript
export enum ConversionEvent {
  // ... existing events
  NEW_EVENT = 'new_event',
}
```

2. Add conversion label:
```typescript
const CONVERSION_LABELS: Record<ConversionEvent, string> = {
  // ... existing labels
  [ConversionEvent.NEW_EVENT]: 'LABEL_NEW_EVENT',
};
```

3. Add tracking function to hook:
```typescript
const trackNewEvent = useCallback((params: TrackingParams = {}) => {
  trackConversion(ConversionEvent.NEW_EVENT, params);
}, []);
```

4. Use in component:
```typescript
const { trackNewEvent } = useConversionTracking();
trackNewEvent({ custom_param: 'value' });
```

### Enhanced Conversions

Enhanced conversions are enabled by default. To pass user data for better matching:

```typescript
import { setUserProperties } from '@/lib/analytics';

// After user signs up:
setUserProperties({
  email: 'user@example.com',
  phone_number: '+1234567890',
  address: {
    first_name: 'John',
    last_name: 'Doe',
    city: 'New York',
    region: 'NY',
    postal_code: '10001',
    country: 'US',
  },
});
```

## Files Modified/Created

### New Files
- `/client/src/lib/analytics.ts` - Core analytics module
- `/client/src/hooks/useConversionTracking.ts` - React hook for tracking
- `GOOGLE_ADS_CONVERSION_TRACKING_SETUP.md` - This file

### Modified Files
- `/client/index.html` - Added GTM/gtag.js snippets
- `/client/src/components/LandingPage.tsx` - Added CTA tracking
- `/client/src/components/LoginScreen.tsx` - Added registration tracking
- `/client/src/components/OnboardingFlow.tsx` - Added onboarding tracking
- `/client/src/components/CookieConsent.tsx` - Integrated with analytics module
- `/client/src/components/ExitIntentPopup.tsx` - Integrated with analytics module

## Next Steps

1. ✅ Get Google Ads Conversion ID and labels
2. ✅ Update `index.html` with your ID
3. ✅ Update `analytics.ts` with your conversion labels
4. ✅ Deploy to production
5. ✅ Test conversions
6. ✅ Verify in Google Ads after 24-48 hours
7. ✅ Set up conversion goals and optimize campaigns

## Support

For issues or questions:
- Check browser console for `[Analytics]` logs
- Verify gtag is loaded: `typeof window.gtag !== 'undefined'`
- Test with Google Tag Assistant
- Review Google Ads conversion troubleshooting docs

## Production Deployment

When deploying to production:

1. Ensure all placeholder IDs are replaced
2. Test on staging first
3. Monitor Google Ads conversion reporting
4. Set up alerts for tracking failures
5. Document your conversion labels for team reference

---

**Setup Complete!** Your conversion tracking is ready to go. Just add your Google Ads IDs and labels.
