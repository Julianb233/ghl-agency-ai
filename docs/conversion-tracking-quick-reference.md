# Conversion Tracking Quick Reference

## Quick Setup Checklist

- [ ] Get Google Ads Conversion ID from Google Ads account
- [ ] Replace `AW-XXXXXXXXX` in `client/index.html` (3 places)
- [ ] Get conversion labels for each event from Google Ads
- [ ] Update `CONVERSION_LABELS` in `client/src/lib/analytics.ts`
- [ ] Update `send_to` line in `analytics.ts` with your conversion ID
- [ ] Test locally with browser console
- [ ] Deploy to production
- [ ] Verify conversions in Google Ads (24-48 hours)

## File Locations

```
client/
├── index.html                                  # Add GTM/gtag.js here
├── src/
    ├── lib/
    │   └── analytics.ts                       # Core tracking module
    ├── hooks/
    │   └── useConversionTracking.ts           # React hook for components
    └── components/
        ├── LandingPage.tsx                    # CTA tracking
        ├── LoginScreen.tsx                    # Registration tracking
        ├── OnboardingFlow.tsx                 # Onboarding tracking
        ├── CookieConsent.tsx                  # Consent management
        └── ExitIntentPopup.tsx                # Exit intent tracking
```

## Conversion IDs to Replace

### In `client/index.html`:

```html
<!-- Line 89 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>

<!-- Line 103 -->
gtag('config', 'AW-XXXXXXXXX', {
  'allow_enhanced_conversions': true
});
```

### In `client/src/lib/analytics.ts`:

```typescript
// Line 27-37: Update all conversion labels
const CONVERSION_LABELS: Record<ConversionEvent, string> = {
  [ConversionEvent.EMAIL_SIGNUP]: 'REPLACE_ME',
  [ConversionEvent.TRIAL_START]: 'REPLACE_ME',
  [ConversionEvent.CTA_CLICK]: 'REPLACE_ME',
  [ConversionEvent.PRICING_VIEW]: 'REPLACE_ME',
  [ConversionEvent.FORM_SUBMIT]: 'REPLACE_ME',
  [ConversionEvent.EXIT_INTENT_CONVERSION]: 'REPLACE_ME',
  [ConversionEvent.DEMO_REQUEST]: 'REPLACE_ME',
  [ConversionEvent.REGISTRATION_COMPLETE]: 'REPLACE_ME',
  [ConversionEvent.ONBOARDING_COMPLETE]: 'REPLACE_ME',
};

// Line 65: Update conversion ID
send_to: `AW-XXXXXXXXX/${label}`, // Replace AW-XXXXXXXXX
```

## Testing Commands

```bash
# Build and run locally
npm run build
npm run dev

# Check TypeScript
npm run check

# Deploy
vercel --prod
```

## Browser Console Debug

```javascript
// Check if gtag is loaded
typeof window.gtag !== 'undefined'

// View dataLayer
window.dataLayer

// Check cookies
document.cookie

// Check localStorage consent
localStorage.getItem('cookieConsent')
```

## Tracked Events

| Event | Fires When | Value |
|-------|-----------|-------|
| `cta_click` | Any CTA button clicked | - |
| `registration_complete` | User signs up | $497 |
| `onboarding_complete` | User completes onboarding | - |
| `pricing_view` | User views pricing section | - |
| `exit_intent_conversion` | User clicks exit popup CTA | - |

## Common Issues

### No conversions showing
1. Check conversion ID is correct
2. Check conversion labels match Google Ads
3. Accept cookie consent
4. Wait 24-48 hours
5. Disable ad blockers for testing

### TypeScript errors
```bash
npm run check
```

### Tracking not firing
1. Open DevTools Console
2. Look for `[Analytics]` logs
3. Check Network tab for gtag requests
4. Verify `window.gtag` exists

## GTM Alternative

To use Google Tag Manager instead:

1. Comment out gtag.js in `index.html` (lines 86-111)
2. Uncomment GTM code (lines 76-84, 129-133)
3. Replace `GTM-XXXXXXX` with your GTM ID
4. Configure tags in GTM dashboard

## Support Links

- [Google Ads Conversion Tracking Help](https://support.google.com/google-ads/answer/1722022)
- [Enhanced Conversions Guide](https://support.google.com/google-ads/answer/9888656)
- [GTM Setup Guide](https://support.google.com/tagmanager/answer/6103696)
- [Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm)
