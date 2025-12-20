# Google Ads Conversion Tracking - Setup Checklist

## Pre-Setup (5 minutes)

- [ ] Log into Google Ads account
- [ ] Navigate to: Tools & Settings → Measurement → Conversions
- [ ] Click "+ New conversion action"
- [ ] Select "Website" as source
- [ ] Choose "Manual code installation"

## Create Conversion Actions (10 minutes)

Create one conversion action for each event:

- [ ] **Email Signup** - Label: `_____________`
- [ ] **Trial Start** - Label: `_____________`
- [ ] **CTA Click** - Label: `_____________`
- [ ] **Pricing View** - Label: `_____________`
- [ ] **Form Submit** - Label: `_____________`
- [ ] **Exit Intent** - Label: `_____________`
- [ ] **Demo Request** - Label: `_____________`
- [ ] **Registration** - Label: `_____________`
- [ ] **Onboarding** - Label: `_____________`

- [ ] Write down your Google Ads Conversion ID: `AW-_____________`

## Code Updates (5 minutes)

### File 1: `/root/github-repos/active/ghl-agency-ai/client/index.html`

- [ ] Line 89: Replace `AW-XXXXXXXXX` with: `AW-_____________`
- [ ] Line 103: Replace `AW-XXXXXXXXX` with: `AW-_____________`

### File 2: `/root/github-repos/active/ghl-agency-ai/client/src/lib/analytics.ts`

- [ ] Line 29: EMAIL_SIGNUP label → `_____________`
- [ ] Line 30: TRIAL_START label → `_____________`
- [ ] Line 31: CTA_CLICK label → `_____________`
- [ ] Line 32: PRICING_VIEW label → `_____________`
- [ ] Line 33: FORM_SUBMIT label → `_____________`
- [ ] Line 34: EXIT_INTENT_CONVERSION label → `_____________`
- [ ] Line 35: DEMO_REQUEST label → `_____________`
- [ ] Line 36: REGISTRATION_COMPLETE label → `_____________`
- [ ] Line 37: ONBOARDING_COMPLETE label → `_____________`

- [ ] Line 65: Replace `AW-XXXXXXXXX` with: `AW-_____________`

## Optional: Google Analytics 4 (2 minutes)

If you want GA4 tracking too:

- [ ] Get GA4 Measurement ID: `G-_____________`
- [ ] In `index.html`, uncomment lines 108-110
- [ ] Replace `G-XXXXXXXXXX` with your GA4 ID

## Deploy (2 minutes)

```bash
# Navigate to project
cd /root/github-repos/active/ghl-agency-ai

# Check for errors
npm run check

# Build
npm run build

# Deploy to production
vercel --prod
```

- [ ] Build completed successfully
- [ ] Deployed to production
- [ ] Deployment URL: `_____________`

## Test (5 minutes)

- [ ] Visit your production site
- [ ] Open browser DevTools → Console
- [ ] Click "Get Started" button
- [ ] See log: `[Analytics] Conversion tracked: cta_click`
- [ ] Complete a signup flow
- [ ] See log: `[Analytics] Conversion tracked: registration_complete`
- [ ] Install [Google Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm)
- [ ] Verify tags firing correctly
- [ ] All tests passing

## Verify (24-48 hours later)

- [ ] Log into Google Ads
- [ ] Go to: Tools & Settings → Conversions
- [ ] Check "Recent conversions" column
- [ ] See test conversions appearing
- [ ] Tracking verified and working

## Troubleshooting

If conversions not showing:

- [ ] Checked conversion ID is correct
- [ ] Checked conversion labels match Google Ads exactly
- [ ] Accepted cookie consent on site
- [ ] Disabled ad blockers for testing
- [ ] Waited full 24-48 hours
- [ ] Checked browser console for errors
- [ ] Verified `window.gtag` exists in console
- [ ] Tested in incognito mode

If still having issues, check:
```javascript
// In browser console:
window.dataLayer  // Should show array
window.gtag       // Should be function
localStorage.getItem('cookieConsent')  // Should be 'accepted'
```

## Alternative: Use Google Tag Manager

If you prefer GTM instead of gtag.js:

- [ ] Get GTM Container ID: `GTM-_____________`
- [ ] In `index.html`, comment out lines 86-111 (gtag section)
- [ ] In `index.html`, uncomment lines 76-84 (GTM head)
- [ ] In `index.html`, uncomment lines 129-133 (GTM body)
- [ ] Replace `GTM-XXXXXXX` with your GTM ID (2 places)
- [ ] In GTM dashboard, create tags for each conversion
- [ ] Map dataLayer events to conversion tags
- [ ] Test and deploy

## Documentation

For detailed setup instructions, see:
- `GOOGLE_ADS_CONVERSION_TRACKING_SETUP.md` - Full guide
- `docs/conversion-tracking-quick-reference.md` - Quick reference
- `CONVERSION_TRACKING_IMPLEMENTATION_SUMMARY.md` - What was built

---

**Estimated Total Time:** 30 minutes + 24-48 hours verification

**Status:** [ ] Not Started  [ ] In Progress  [ ] Complete
