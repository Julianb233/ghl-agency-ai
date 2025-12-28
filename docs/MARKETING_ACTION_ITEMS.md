# Marketing Action Items - Implementation Checklist
**Project:** Bottleneck Bot
**Generated:** December 20, 2025
**Source:** Marketing Audit by Morgan-Marketing (T9)

---

## 🔴 CRITICAL - Pre-Launch Blockers

### Task 1: Configure Google Analytics 4
**Priority:** P0 (Blocking)
**Effort:** 2 hours
**Assignee:** Marketing + Developer

**Steps:**
1. Go to https://analytics.google.com
2. Create new GA4 property for "Bottleneck Bot"
3. Copy Measurement ID (format: G-XXXXXXXXX)
4. Replace placeholder in `/root/github-repos/ghl-agency-ai/client/index.html` line 77 and 82
5. Test with GA4 DebugView
6. Verify data collection (wait 24-48 hours for first reports)

**File to Edit:**
```html
<!-- /client/index.html line 77 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ACTUAL-ID-HERE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ACTUAL-ID-HERE'); <!-- line 82 -->
</script>
```

**Validation:**
- [ ] Measurement ID copied
- [ ] Placeholder replaced in both locations
- [ ] Real-time report showing traffic
- [ ] DebugView showing events

---

### Task 2: Configure Meta Pixel
**Priority:** P0 (Blocking)
**Effort:** 2 hours
**Assignee:** Marketing + Developer

**Steps:**
1. Go to https://business.facebook.com/events_manager
2. Create new pixel for "Bottleneck Bot"
3. Copy Pixel ID (format: 15-16 digit number)
4. Replace placeholder in `/root/github-repos/ghl-agency-ai/client/index.html` line 95 and 103
5. Install Meta Pixel Helper browser extension
6. Test PageView event firing

**File to Edit:**
```html
<!-- /client/index.html line 95 -->
fbq('init', 'ACTUAL-PIXEL-ID-HERE');

<!-- /client/index.html line 103 (noscript fallback) -->
<img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=ACTUAL-PIXEL-ID-HERE&ev=PageView&noscript=1"
/>
```

**Validation:**
- [ ] Pixel ID copied
- [ ] Placeholder replaced in both locations
- [ ] Meta Pixel Helper shows green checkmark
- [ ] Events Manager showing PageView events

---

### Task 3: Create Branded OG Image
**Priority:** P0 (Blocking)
**Effort:** 3 hours
**Assignee:** Designer

**Specifications:**
- **Dimensions:** 1200x630px (exact)
- **Format:** PNG (optimized) or WebP
- **File size:** <200KB
- **Save to:** `/root/github-repos/ghl-agency-ai/client/public/assets/og-image.png`

**Content Requirements:**
- Product dashboard screenshot (background or main element)
- Headline: "AI Workforce That Never Sleeps" or similar
- Bottleneck Bot logo
- Social proof badge: "Trusted by 487+ Agencies"
- Brand colors: Purple (#7c3aed) accent

**Design Resources:**
- Use existing screenshot: `/client/public/assets/demo/global_ops_view_1763563925931.png`
- Tools: Canva Pro template, Figma, or Adobe Creative Cloud
- Reference: https://www.canva.com/create/open-graph/

**Validation:**
- [ ] File created at correct path
- [ ] Dimensions exactly 1200x630px
- [ ] File size <200KB
- [ ] Tested with Facebook Sharing Debugger: https://developers.facebook.com/tools/debug
- [ ] Tested with Twitter Card Validator: https://cards-dev.twitter.com/validator
- [ ] Image displays correctly on social platforms

---

### Task 4: Create Favicon Set
**Priority:** P0 (Blocking)
**Effort:** 2 hours
**Assignee:** Designer

**Required Files:**
1. **favicon.ico** (multi-size: 16x16, 32x32, 48x48)
   - Save to: `/root/github-repos/ghl-agency-ai/client/public/favicon.ico`

2. **favicon.png** (192x192)
   - Save to: `/root/github-repos/ghl-agency-ai/client/public/favicon.png`

3. **apple-touch-icon.png** (512x512)
   - Save to: `/root/github-repos/ghl-agency-ai/client/public/apple-touch-icon.png`

**Design Guidelines:**
- Use simplified "B" logo or robot icon
- Brand purple (#7c3aed) as primary color
- White or transparent background
- High contrast for visibility at small sizes
- SVG source file for future scaling

**Tools:**
- Favicon generator: https://realfavicongenerator.net/
- Online converter: https://www.favicon-generator.org/

**Validation:**
- [ ] All three files created
- [ ] Files in correct locations
- [ ] Favicon shows in browser tab
- [ ] Apple touch icon shows when saved to iOS home screen
- [ ] Manifest.json references updated (if needed)

---

### Task 5: Privacy Policy Page
**Priority:** P0 (Blocking - GDPR)
**Effort:** 6 hours
**Assignee:** Legal + Marketing

**Steps:**
1. Review existing app functionality and data collection
2. Document all data collected (analytics, user info, cookies)
3. Write comprehensive privacy policy covering:
   - What data is collected
   - How data is used
   - Third-party services (GA4, Meta Pixel, Sentry, Vercel)
   - Cookie usage
   - User rights (access, deletion, portability)
   - GDPR compliance
   - CCPA compliance
   - Contact information

4. Create route in application (e.g., `/privacy-policy`)
5. Add link to footer
6. Update sitemap.xml

**Template Resources:**
- https://www.termsfeed.com/privacy-policy-generator/
- https://www.privacypolicies.com/
- Review competitors' privacy policies

**Required Sections:**
- [ ] Information we collect
- [ ] How we use information
- [ ] Third-party services disclosure
- [ ] Cookie policy
- [ ] User rights (GDPR)
- [ ] California privacy rights (CCPA)
- [ ] Data retention
- [ ] Security measures
- [ ] Children's privacy (COPPA)
- [ ] Changes to policy
- [ ] Contact information

**Validation:**
- [ ] Legal review completed
- [ ] Page accessible at `/privacy-policy`
- [ ] Link in footer
- [ ] Link in signup flow
- [ ] Sitemap updated

---

### Task 6: Terms of Service Page
**Priority:** P0 (Blocking - Legal)
**Effort:** 6 hours
**Assignee:** Legal + Marketing

**Required Sections:**
- [ ] Service description
- [ ] Account terms
- [ ] Payment terms
- [ ] Refund policy
- [ ] User responsibilities
- [ ] Prohibited uses
- [ ] Intellectual property
- [ ] Limitation of liability
- [ ] Indemnification
- [ ] Termination
- [ ] Governing law
- [ ] Dispute resolution
- [ ] Changes to terms
- [ ] Contact information

**Template Resources:**
- https://www.termsfeed.com/terms-conditions-generator/
- Review SaaS competitors' terms

**Validation:**
- [ ] Legal review completed
- [ ] Page accessible at `/terms`
- [ ] Link in footer
- [ ] Link in signup flow
- [ ] Sitemap updated

---

### Task 7: Cookie Consent Implementation
**Priority:** P0 (Blocking - GDPR)
**Effort:** 3 hours
**Assignee:** Developer

**Component:** `/root/github-repos/ghl-agency-ai/client/src/components/CookieConsent.tsx`

**Requirements:**
1. Activate existing CookieConsent component
2. Display on first visit to all pages
3. Include options:
   - Essential cookies (always on)
   - Analytics cookies (opt-in)
   - Marketing cookies (opt-in)
4. Store preferences in localStorage
5. Conditional analytics loading:
   ```javascript
   if (cookieConsent.analytics) {
     gtag('config', 'G-XXXXXXXXXX');
     fbq('init', 'XXXXXXXXXXXXXXXXX');
   }
   ```
6. Add "Cookie Preferences" link to footer
7. Allow users to revoke consent

**Validation:**
- [ ] Banner shows on first visit
- [ ] Preferences saved correctly
- [ ] Analytics only fire after consent
- [ ] Revocation works properly
- [ ] Link in privacy policy to cookie settings

---

## 🟡 HIGH PRIORITY - Launch Week

### Task 8: GA4 Conversion Goals Setup
**Priority:** P1
**Effort:** 3 hours
**Assignee:** Marketing

**Goals to Configure:**
1. **Sign Up Completion**
   - Event name: `sign_up`
   - Trigger: Account creation success
   - Value: $0 (lead value)

2. **Demo Request**
   - Event name: `generate_lead`
   - Trigger: Demo form submission
   - Value: $100 (estimated lead value)

3. **Credit Purchase**
   - Event name: `purchase`
   - Trigger: Stripe payment success
   - Value: Transaction amount
   - Enhanced ecommerce parameters

4. **Agent Created**
   - Event name: `agent_created` (custom)
   - Trigger: First agent creation
   - Value: $0

5. **Integration Connected**
   - Event name: `integration_connected` (custom)
   - Trigger: GHL OAuth success
   - Value: $0

**Steps:**
1. Define events in GA4 Events section
2. Mark as conversions
3. Set up conversion funnels
4. Create custom reports

**Validation:**
- [ ] All 5 conversions configured
- [ ] Test events firing in DebugView
- [ ] Conversion funnel reports showing data

---

### Task 9: Meta Pixel Standard Events
**Priority:** P1
**Effort:** 4 hours
**Assignee:** Developer

**Events to Implement:**

```javascript
// Sign up completion
fbq('track', 'CompleteRegistration', {
  value: 0,
  currency: 'USD'
});

// Demo request
fbq('track', 'Lead', {
  content_name: 'Demo Request',
  content_category: 'Sales'
});

// Pricing page view
fbq('track', 'ViewContent', {
  content_name: 'Pricing',
  content_category: 'Product'
});

// Credit package selection
fbq('track', 'AddToCart', {
  content_ids: ['credits_500'],
  content_type: 'product',
  value: 497,
  currency: 'USD'
});

// Payment initiation
fbq('track', 'InitiateCheckout', {
  value: 497,
  currency: 'USD',
  num_items: 1
});

// Purchase completion
fbq('track', 'Purchase', {
  value: 497,
  currency: 'USD',
  content_ids: ['credits_500'],
  content_type: 'product'
});
```

**Implementation Locations:**
- Sign up: `/client/src/pages/SignUp.tsx` or auth success handler
- Demo request: Demo form submission handler
- Pricing: `/client/src/pages/Pricing.tsx` on mount
- Cart events: Credit purchase flow components

**Validation:**
- [ ] All events firing in Meta Pixel Helper
- [ ] Events showing in Events Manager
- [ ] Custom conversions created for key events

---

### Task 10: Image Optimization
**Priority:** P1
**Effort:** 4 hours
**Assignee:** Developer

**Files to Optimize:**
All 9 screenshots in `/root/github-repos/ghl-agency-ai/client/public/assets/demo/`

**Current Size:** 2.23MB total
**Target Size:** <450KB total (80% reduction)

**Process:**
1. Convert all PNG to WebP format
2. Create responsive variants:
   - Thumbnail: 400px width
   - Medium: 800px width
   - Large: 1600px width
3. Compress with quality 80-85
4. Implement lazy loading
5. Add srcset attributes

**Tools:**
- WebP conversion: `cwebp` command line or https://cloudconvert.com/webp-converter
- Compression: https://tinypng.com or https://squoosh.app
- Batch processing: ImageMagick or Sharp.js

**Example Implementation:**
```html
<picture>
  <source
    srcset="/assets/demo/dashboard-400w.webp 400w,
            /assets/demo/dashboard-800w.webp 800w,
            /assets/demo/dashboard-1600w.webp 1600w"
    type="image/webp"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <img
    src="/assets/demo/dashboard-1600w.png"
    alt="Bottleneck Bot global operations dashboard"
    loading="lazy"
    width="1600"
    height="1200"
  >
</picture>
```

**Validation:**
- [ ] All images converted to WebP
- [ ] PNG fallbacks exist
- [ ] Total size reduced by 80%
- [ ] Lazy loading working
- [ ] Lighthouse performance score improved

---

### Task 11: Demo Video Production
**Priority:** P1
**Effort:** 8 hours
**Assignee:** Marketing/Video Production

**Specifications:**
- **Duration:** 60-90 seconds
- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080 (Full HD)
- **File size:** <5MB
- **Hosting:** Wistia, Vimeo, or YouTube

**Script Outline:**
1. **Hook (0-5s):** "Stop managing VAs. Start managing growth."
2. **Problem (5-15s):** Show agency owner overwhelmed with tasks
3. **Solution (15-30s):** Introduce Bottleneck Bot dashboard
4. **Features (30-50s):** Quick tour of email, SEO, voice agents
5. **Results (50-60s):** Show time saved, testimonial quote
6. **CTA (60-65s):** "Try free for 14 days"

**Production Checklist:**
- [ ] Script finalized
- [ ] Screen recordings captured
- [ ] Voiceover recorded
- [ ] Music/sound effects added
- [ ] Captions/subtitles added
- [ ] Exported and compressed
- [ ] Uploaded to hosting platform
- [ ] Embed code added to landing page
- [ ] OG video tags added to index.html

**Validation:**
- [ ] Video plays on landing page
- [ ] Auto-play on mute (mobile-friendly)
- [ ] Click to unmute works
- [ ] Social platforms show video preview

---

## 🟢 MEDIUM PRIORITY - Month 1

### Task 12: Email Welcome Sequence
**Priority:** P2
**Effort:** 6 hours
**Assignee:** Marketing + Copywriter

**Platform:** Mailchimp, SendGrid, or Customer.io

**Sequence (5 emails):**

**Email 1: Welcome (Day 0 - Immediate)**
- Subject: "Welcome to Bottleneck Bot! Here's your quick start guide"
- Content: Account setup checklist, first steps
- CTA: Complete profile setup

**Email 2: First Agent Tutorial (Day 2)**
- Subject: "Create your first AI agent in 5 minutes"
- Content: Step-by-step guide with screenshots
- CTA: Create agent now

**Email 3: Integration Guide (Day 5)**
- Subject: "Connect GHL and unlock full automation"
- Content: Integration benefits, walkthrough
- CTA: Connect integration

**Email 4: Success Stories (Day 10)**
- Subject: "How Sarah saved 20 hours/week with Bottleneck Bot"
- Content: Customer case study
- CTA: Explore features

**Email 5: Upgrade Prompt (Day 15 - If still on free tier)**
- Subject: "Ready to scale? Upgrade and get 50% more credits"
- Content: Plan comparison, ROI calculator
- CTA: View pricing

**Implementation:**
- [ ] Email service account created
- [ ] Email templates designed
- [ ] Copy written and approved
- [ ] Automation triggers configured
- [ ] Test sequence sent to team
- [ ] Live sequence activated

---

### Task 13: Blog Setup
**Priority:** P2
**Effort:** 12 hours
**Assignee:** Developer + Content Team

**Technical Requirements:**
- Create `/blog` route in application
- Set up blog CMS (Sanity, Contentful, or markdown files)
- Design blog post template
- Add blog to sitemap
- Implement RSS feed

**Initial Content (3 Posts):**

**Post 1: "The Real Cost of Virtual Assistants vs AI Automation"**
- Target keyword: "virtual assistant vs AI"
- Word count: 2000+
- Content: Cost comparison, case studies, ROI calculator

**Post 2: "10 Agency Tasks You Should Automate Today"**
- Target keyword: "agency automation"
- Word count: 1500+
- Content: Task checklist, time savings, implementation tips

**Post 3: "How to Scale Your Agency Without Hiring"**
- Target keyword: "scale agency"
- Word count: 2500+
- Content: Growth strategies, AI tools, success stories

**SEO Checklist:**
- [ ] Keyword research completed
- [ ] Outline approved
- [ ] Content written
- [ ] Images created/optimized
- [ ] Internal links added
- [ ] Meta description written
- [ ] Schema markup added
- [ ] Published and promoted

---

### Task 14: A/B Testing Framework
**Priority:** P2
**Effort:** 8 hours
**Assignee:** Growth Team + Developer

**Tool:** Google Optimize (free) or Vercel Edge Config

**Test 1: Homepage Headline**
- Control: "Buy Back Your Time, Peace, and Freedom"
- Variant A: "Fire Your VAs. Hire AI That Actually Works."
- Variant B: "487 Agencies Automated. You're Next."
- Metric: Sign-up rate
- Duration: 2 weeks
- Sample size: 1000+ visitors per variant

**Test 2: CTA Button**
- Control: "Get Started Free"
- Variant A: "Start Free Trial"
- Variant B: "Automate My Agency"
- Metric: Click-through rate
- Duration: 1 week
- Sample size: 500+ visitors per variant

**Test 3: Pricing Presentation**
- Control: Standard tier cards
- Variant A: Value-based pricing (hours saved)
- Variant B: Comparison table (AI vs VA cost)
- Metric: Purchase rate
- Duration: 3 weeks
- Sample size: 2000+ visitors per variant

**Implementation:**
- [ ] Testing tool configured
- [ ] Baseline metrics recorded
- [ ] Variants designed
- [ ] Tests created and published
- [ ] Results tracked
- [ ] Winner implemented

---

## 📋 Tracking & Reporting

### Task 15: Analytics Dashboard Setup
**Priority:** P2
**Effort:** 4 hours
**Assignee:** Data Analyst

**Dashboards to Create:**

**1. Marketing Overview Dashboard**
- Traffic sources
- Conversion rates by channel
- Cost per acquisition
- ROI by campaign

**2. Product Analytics Dashboard**
- Daily/weekly/monthly active users
- Feature adoption rates
- User retention cohorts
- Churn analysis

**3. Revenue Dashboard**
- Monthly recurring revenue
- Average revenue per user
- Customer lifetime value
- Revenue by plan tier

**Tools:**
- Google Analytics 4 built-in reports
- Google Data Studio for custom dashboards
- Mixpanel or Amplitude for product analytics

**Validation:**
- [ ] All dashboards created
- [ ] Shared with team
- [ ] Weekly review scheduled
- [ ] Alerts configured for anomalies

---

## 📞 Contact & Coordination

**Task Assignments:**
- Marketing Lead: Tasks 1, 2, 8, 11, 12
- Designer: Tasks 3, 4
- Developer: Tasks 1, 2, 7, 9, 10, 13
- Legal: Tasks 5, 6
- Data Analyst: Task 15
- Growth Team: Task 14

**Weekly Sync Meeting:**
- Review completed tasks
- Unblock issues
- Adjust priorities
- Plan next week

**Progress Tracking:**
Update this checklist weekly and report status in:
`/root/github-repos/ghl-agency-ai/docs/TODO_FUTURE.md`

---

**Generated by:** Morgan-Marketing (T9)
**Last Updated:** December 20, 2025
**Next Review:** Pre-launch sprint planning
