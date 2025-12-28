# Marketing Assets Setup Guide

Quick reference for completing the marketing configuration for Bottleneck Bot.

---

## Step 1: Get Analytics IDs (15 minutes)

### Google Analytics 4 ID (G-XXXXXXXXXX)

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property or create new: "Bottleneck Bot"
3. Click Admin > Data streams
4. Select your web stream (bottleneckbot.com)
5. Copy "Measurement ID" (format: G-XXXXXXXXXX)
6. **Update:** `/client/index.html` line 89

**Find and replace:**
```html
<!-- OLD -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>

<!-- NEW -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-GA4-ID"></script>

<!-- Also update line 108 (commented) -->
// gtag('config', 'G-XXXXXXXXXX', {
// BECOMES
// gtag('config', 'G-YOUR-GA4-ID', {
```

---

### Google Ads Conversion ID (AW-XXXXXXXXX)

1. Go to [Google Ads](https://ads.google.com)
2. Click Tools & Settings (top right)
3. Navigate to Measurement > Conversions
4. Find your account ID or create conversion tracking
5. Copy "Conversion ID" (format: AW-XXXXXXXXX)
6. **Update:** `/client/index.html` lines 89, 103-105

**Find and replace (3 locations):**
```html
<!-- Location 1: Line 89 -->
<!-- OLD -->
src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"
<!-- NEW -->
src="https://www.googletagmanager.com/gtag/js?id=AW-YOUR-CONVERSION-ID"

<!-- Locations 2-3: Lines 103-105 -->
<!-- OLD -->
gtag('config', 'AW-XXXXXXXXX', {

<!-- NEW -->
gtag('config', 'AW-YOUR-CONVERSION-ID', {
```

---

### Meta Pixel ID (XXXXXXXXXXXXXXXXX)

1. Go to [Meta Business Manager](https://business.facebook.com)
2. Click Events Manager
3. Select your data source (Pixel)
4. Copy "Pixel ID" (15-digit number)
5. **Update:** `/client/index.html` lines 123, 137

**Find and replace (2 locations):**
```html
<!-- Location 1: Line 123 -->
<!-- OLD -->
fbq('init', 'XXXXXXXXXXXXXXXXX');
<!-- NEW -->
fbq('init', 'YOUR-META-PIXEL-ID');

<!-- Location 2: Line 137 (noscript tag) -->
<!-- OLD -->
src="https://www.facebook.com/tr?id=XXXXXXXXXXXXXXXXX&ev=PageView&noscript=1"
<!-- NEW -->
src="https://www.facebook.com/tr?id=YOUR-META-PIXEL-ID&ev=PageView&noscript=1"
```

---

## Step 2: Create Visual Assets (30 minutes)

### Open Graph Image (1200x630px)

**File:** `/client/public/assets/og-image.png`

**Tool Options:**
- Figma (free tier available)
- Canva (template-based, easier)
- Adobe Express (free)
- DALL-E / Midjourney (AI-generated)

**Design Specifications:**
- **Dimensions:** 1200 x 630 pixels (exact)
- **Format:** PNG (for transparency support)
- **Color Scheme:** Purple (#7c3aed) + Blue gradient
- **Logo:** Bottleneck Bot logo (top-left or center)
- **Headline:** "Buy Back Your Time, Peace, and Freedom"
- **Subheading:** "AI-Powered Agency Automation"
- **Visual:** Automation/robot theme, modern design
- **Text Legibility:** Readable on mobile (min 24pt)
- **File Size:** Under 5MB (ideally 1-2MB)

**Canva Template Approach (Fastest):**
1. Go to [Canva](https://www.canva.com)
2. Create > Custom size > 1200 x 630
3. Use template: "Social Media Banner"
4. Add Bottleneck Bot colors and branding
5. Download as PNG
6. Rename to `og-image.png`
7. Upload to `/client/public/assets/`

**Verification:**
- Open [OG Image Tester](https://www.opengraphcheck.com)
- Enter: `https://www.bottleneckbots.com`
- Verify image displays correctly

---

### Favicon (32x32 or 64x64px)

**File:** `/client/public/favicon.png`

**Specifications:**
- **Size:** 64x64 pixels (or 32x32)
- **Format:** PNG with transparency
- **Content:** Bottleneck Bot icon/logo
- **Style:** Simplified, scalable design
- **File Size:** Under 10KB

**Tool Options:**
- Figma (export as PNG)
- Illustrator / Sketch
- Icon generator tools
- Logo simplification of main logo

**Process:**
1. Export main logo as PNG
2. Scale to 64x64 pixels
3. Ensure transparent background
4. Save as `favicon.png`
5. Upload to `/client/public/`

**Verification:**
- Refresh browser, check tab icon
- Add to bookmarks, verify icon displays
- Clear browser cache if needed

---

### Apple Touch Icon (180x180px)

**File:** `/client/public/apple-touch-icon.png`

**Specifications:**
- **Size:** 180x180 pixels (exact, no scaling)
- **Format:** PNG with SOLID background
- **Background Color:** #7c3aed (purple, matches theme)
- **Content:** Bottleneck Bot logo/icon
- **Style:** Consistent with favicon but larger
- **File Size:** Under 20KB
- **Note:** iOS doesn't support transparency, use solid background

**Process:**
1. Take favicon design (64x64)
2. Scale up to 180x180 pixels
3. Add solid purple background: #7c3aed
4. Ensure logo is centered and legible
5. Save as `apple-touch-icon.png`
6. Upload to `/client/public/`

**Verification (iOS):**
1. Visit website on iPhone/iPad
2. Tap Share button
3. Add to Home Screen
4. Verify icon displays correctly
5. Icon should show purple background with logo

---

## Step 3: Upload Files (5 minutes)

### Directory Structure
```
/client/public/
├── favicon.png                    (32x32 or 64x64)
├── apple-touch-icon.png           (180x180)
├── manifest.json                  (already exists)
├── robots.txt                     (already exists)
├── sitemap.xml                    (already exists)
└── assets/
    ├── og-image.png               (1200x630)
    └── demo/
```

### Upload Steps
1. Navigate to `/client/public/` in project
2. Upload `favicon.png` (directly in public folder)
3. Upload `apple-touch-icon.png` (directly in public folder)
4. Create `assets/` folder if missing
5. Upload `og-image.png` to `assets/` subfolder
6. Verify all files are present: `ls -la client/public/`

---

## Step 4: Update index.html (10 minutes)

**File:** `/client/index.html`

### Changes to Make

#### Add GA4 Configuration (Optional but Recommended)

Lines 107-110 (currently commented):
```html
<!-- UNCOMMENT THIS SECTION -->
// gtag('config', 'G-YOUR-GA4-ID', {
//   'send_page_view': true
// });
```

Becomes:
```html
// Active configuration
gtag('config', 'G-YOUR-GA4-ID', {
  'send_page_view': true
});
```

#### Update all three analytics IDs (CRITICAL)

Search for "XXXXXXXXX" and "XXXXXXXXXXXXXXXXX" in the file.

**Pattern 1:** AW-XXXXXXXXX (appears 2x)
- Line 89: Script source
- Line 103: gtag config

**Pattern 2:** G-XXXXXXXXXX (appears 1x)
- Line 108: gtag config (commented)

**Pattern 3:** XXXXXXXXXXXXXXXXX (appears 2x)
- Line 123: fbq init
- Line 137: noscript tag

---

## Step 5: Test Configuration (20 minutes)

### Browser Testing

#### Test Analytics ID
1. Open website: `https://bottleneckbot.com`
2. Install [Google Tag Assistant](https://chrome.google.com/webstore) (Chrome extension)
3. Click Tag Assistant icon
4. Verify:
   - Google Ads tag loaded (AW-...)
   - GA4 tag loaded (G-...)
   - No errors in console

#### Test Meta Pixel
1. Install [Meta Pixel Helper](https://www.facebook.com/business/tools/meta-pixel-helper) (Chrome extension)
2. Visit website
3. Click Pixel Helper icon
4. Verify:
   - Pixel loaded with your ID
   - PageView event fired
   - No errors

#### Test Favicons
1. **favicon.png**: Open site, check browser tab icon
2. **apple-touch-icon.png**: On iOS, add to home screen
3. Clear browser cache if icons don't update immediately

#### Test OG Image
1. Visit [OG Image Tester](https://www.opengraphcheck.com)
2. Enter: `https://bottleneckbot.com`
3. Verify image displays correctly at 1200x630
4. Test on [Twitter Card Validator](https://cards-dev.twitter.com/validator)
5. Test on [Meta Debugger](https://developers.facebook.com/tools/debug/)

### Console Verification
Open Developer Tools (F12) > Console:
- Should see `[Analytics] Page view tracked: /`
- Should see no errors (red messages)
- May see warnings (yellow messages) - these are OK

### Analytics Dashboard Check
Wait 24-48 hours, then check:
1. **Google Analytics:** dashboard.google.com
   - Go to Real-time > Overview
   - Verify users showing as active
   - Check Events tab for pageview events

2. **Google Ads:** ads.google.com
   - Go to Tools > Conversions
   - Check conversion tracking status
   - May show "Unverified" initially

3. **Meta Pixel:** events.facebook.com
   - Go to Data Sources > Your Pixel
   - Check Real-time tab
   - Verify PageView events showing

---

## Step 6: Deployment (5 minutes)

### Pre-Deployment
```bash
# Verify no build errors
npm run build

# Check for 404s on asset files
# Look for errors like "404: favicon.png not found"

# Test locally if possible
npm run dev
```

### Deployment
```bash
# Standard deployment process
git add .
git commit -m "feat: configure marketing assets with analytics IDs and images"
git push origin main

# Deploy to production
# (Your deployment command here)
```

### Post-Deployment Verification
1. Visit live site
2. Run Tag Assistant - verify tracking IDs
3. Run Meta Pixel Helper - verify pixel
4. Check favicon appears in tab
5. Test social sharing (copy URL, share on Twitter/LinkedIn)
6. Verify OG image appears in preview

---

## Common Issues & Fixes

### Favicons Not Showing
**Problem:** Favicon.png or apple-touch-icon.png not appearing

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check file path in index.html matches actual file location
4. Verify file format is PNG (not jpg)
5. Re-upload files if using CDN/cloud storage

---

### Analytics Not Showing Data
**Problem:** GA4 or Google Ads shows no events

**Possible Causes:**
1. **Wrong IDs:** Verify IDs are copied exactly
2. **Blocked Tracking:** User has adblocker/privacy tools
3. **Time Lag:** GA4 takes 24-48 hours to show data
4. **Privacy Mode:** Testing in private browser won't send data

**Verification:**
- Use Tag Assistant to confirm tags loaded
- Check Console for `[Analytics]` logs
- Verify cookies consent accepts analytics
- Test in regular (non-private) browser

---

### OG Image Not Showing on Social Media
**Problem:** Image doesn't appear when sharing on Twitter/LinkedIn

**Solutions:**
1. Verify image dimensions are exactly 1200x630
2. Check file is PNG format
3. Use Meta Debugger to clear cache: https://developers.facebook.com/tools/debug/
4. For Twitter: Use https://cards-dev.twitter.com/validator
5. Check image file size (under 5MB)
6. Wait 24 hours for social platforms to re-cache

---

### Meta Pixel Not Firing
**Problem:** Meta Pixel Helper shows no events

**Causes:**
1. Pixel ID is wrong or old pixel
2. Pixel is in "test mode"
3. Privacy tools blocking pixel
4. Ad blocker blocking pixel

**Fix:**
1. Verify pixel ID in Events Manager
2. Check if pixel needs activation
3. Test in regular browser (not private)
4. Check for "Pixel loaded" message in Meta Pixel Helper

---

## Files Summary

### Files Created/Modified
```
MODIFIED:
- /client/src/App.tsx
  └─ Added CookieConsent import and render

CREATED:
- /MARKETING_ASSETS_STATUS.md (this file)
- /MARKETING_SETUP_GUIDE.md
- /client/public/assets/.gitkeep

NEED TO CREATE:
- /client/public/favicon.png
- /client/public/apple-touch-icon.png
- /client/public/assets/og-image.png

ALREADY EXIST:
- /client/src/pages/PrivacyPolicy.tsx
- /client/src/pages/TermsOfService.tsx
- /client/src/components/CookieConsent.tsx
- /client/src/lib/analytics.ts
- /client/index.html (needs ID updates)
- /client/public/manifest.json
- /client/public/robots.txt
- /client/public/sitemap.xml
```

---

## Timeline Estimate

| Task | Time | Difficulty |
|------|------|------------|
| Get Google Analytics 4 ID | 5 min | Easy |
| Get Google Ads ID | 5 min | Easy |
| Get Meta Pixel ID | 5 min | Easy |
| Create OG Image | 15 min | Medium |
| Create favicon | 10 min | Medium |
| Create apple-touch-icon | 10 min | Medium |
| Update index.html | 5 min | Easy |
| Upload files | 5 min | Easy |
| Test all systems | 20 min | Medium |
| Deploy | 5 min | Easy |
| **TOTAL** | **85 minutes** | **~1.5 hours** |

---

## Checklist for Completion

### Phase 1: Get IDs (15 min)
- [ ] Google Analytics 4 ID obtained
- [ ] Google Ads Conversion ID obtained
- [ ] Meta Pixel ID obtained

### Phase 2: Create Assets (35 min)
- [ ] OG Image created (1200x630 PNG)
- [ ] Favicon created (64x64 PNG)
- [ ] Apple Touch Icon created (180x180 PNG)

### Phase 3: Configure (15 min)
- [ ] IDs added to index.html (3 locations)
- [ ] Image files uploaded
- [ ] index.html reviewed for accuracy

### Phase 4: Test (20 min)
- [ ] Tag Assistant shows proper IDs
- [ ] Meta Pixel Helper confirms pixel loaded
- [ ] Favicon appears in browser tab
- [ ] Apple icon works on iOS
- [ ] OG image previews correctly

### Phase 5: Deploy (5 min)
- [ ] Changes committed to git
- [ ] Deployed to production
- [ ] Live site verification complete
- [ ] Monitor analytics dashboard

---

## Quick Reference: ID Locations

| ID | Format | File | Lines | Count |
|---|---|---|---|---|
| GA4 | G-XXXXXXXXXX | index.html | 89, 108 | 2 |
| Google Ads | AW-XXXXXXXXX | index.html | 89, 103 | 2 |
| Meta Pixel | 15 digits | index.html | 123, 137 | 2 |

---

## Next Actions

1. **Immediate (Today):**
   - Gather all three analytics IDs
   - Create three image files

2. **Soon (This Week):**
   - Update index.html with IDs
   - Upload image files
   - Run tests
   - Deploy

3. **Monitor (Ongoing):**
   - Check GA4 dashboard for data
   - Monitor conversion tracking
   - Review analytics weekly

---

**Need help?** Review the detailed MARKETING_ASSETS_STATUS.md for comprehensive information about each component.
