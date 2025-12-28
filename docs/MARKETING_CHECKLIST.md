# Marketing Pre-Launch Checklist
**Project:** Bottleneck Bot
**Status:** Pre-Launch Audit Complete
**Date:** December 20, 2025

---

## Analytics & Tracking

| Component | Status | Location | Action Required |
|-----------|--------|----------|-----------------|
| Google Analytics 4 | ❌ Placeholder | `client/index.html` L77, L82 | Replace `G-XXXXXXXXXX` with real ID |
| Meta Pixel | ❌ Placeholder | `client/index.html` L95, L103 | Replace `XXXXXXXXXXXXXXXXX` with real ID |
| Vercel Analytics | ✅ Active | Package installed | None - working |
| Sentry Error Tracking | ✅ Active | `client/src/lib/sentry.ts` | None - working |
| Speed Insights | ✅ Active | Package installed | None - working |
| Conversion Goals | ❌ Not Set | GA4 dashboard | Configure 5+ goals |
| Event Tracking | ❌ Not Implemented | React components | Add fbq/gtag events |

**Priority:** 🔴 CRITICAL - Must fix before launch

---

## Visual Assets

| Asset | Status | Required Path | Specs |
|-------|--------|---------------|-------|
| OG Image | ❌ Missing | `/client/public/assets/og-image.png` | 1200x630px, <200KB |
| Favicon (ICO) | ❌ Missing | `/client/public/favicon.ico` | 16x16, 32x32, 48x48 |
| Favicon (PNG) | ❌ Missing | `/client/public/favicon.png` | 192x192px |
| Apple Touch Icon | ❌ Missing | `/client/public/apple-touch-icon.png` | 512x512px |
| Brand Logo | ❌ Missing | `/client/public/logo.svg` | SVG, scalable |
| Demo Video | ❌ Missing | Video hosting platform | 60s, 1080p |
| Demo Screenshots | ✅ Present | `/client/public/assets/demo/` | Needs optimization |

**Priority:** 🔴 CRITICAL - OG image & favicons blocking
**Priority:** 🟡 MEDIUM - Demo video, logo

---

## SEO & Metadata

| Component | Status | Quality | Notes |
|-----------|--------|---------|-------|
| Page Title | ✅ Excellent | A+ | "Bottleneck Bot - Buy Back Your Time..." |
| Meta Description | ✅ Excellent | A+ | 155 chars, includes social proof |
| Open Graph Tags | ✅ Complete | A | All required tags present |
| Twitter Cards | ✅ Complete | A | Summary large image configured |
| Schema.org | ✅ Implemented | B+ | SoftwareApplication type valid |
| Sitemap.xml | ✅ Present | B | Exists but limited pages |
| Robots.txt | ✅ Present | A | Proper API blocking |
| Canonical URL | ⚠️ Not Set | C | Should add canonical tags |

**Priority:** 🟢 LOW - Foundation is strong, minor improvements

---

## Privacy & Compliance

| Component | Status | Location | Action Required |
|-----------|--------|----------|-----------------|
| Cookie Consent | ⚠️ Component exists | `client/src/components/CookieConsent.tsx` | Activate on all pages |
| Privacy Policy | ❌ Missing | Need `/privacy-policy` route | Create comprehensive page |
| Terms of Service | ❌ Missing | Need `/terms` route | Create legal page |
| Cookie Declaration | ❌ Missing | Part of privacy policy | Document all cookies |
| GDPR Compliance | ❌ Not Complete | Multiple components | Full implementation needed |
| CCPA Compliance | ❌ Not Complete | Privacy policy | Add California disclosures |
| Data Export | ⚠️ Unknown | User settings | Verify functionality |
| Data Deletion | ⚠️ Unknown | User settings | Verify functionality |

**Priority:** 🔴 CRITICAL - Legal exposure without these

---

## Performance & Optimization

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Total Image Size | 2.23MB | <450KB | ❌ Needs 80% reduction |
| Image Format | PNG | WebP + PNG fallback | ❌ Not optimized |
| Lazy Loading | No | Yes | ❌ Not implemented |
| Responsive Images | No | srcset + sizes | ❌ Not implemented |
| Core Web Vitals | Unknown | All green | ⚠️ Monitor after optimization |
| Lighthouse Score | 75-85 | 90+ | ⚠️ Will improve with images |
| Page Load Time | ~4-5s | <2s | ❌ Too slow |

**Priority:** 🟡 MEDIUM - Post-launch optimization

---

## Content Marketing

| Component | Status | Priority | Timeline |
|-----------|--------|----------|----------|
| Blog Infrastructure | ❌ Not Set Up | P2 | Week 2 |
| Launch Posts (3) | ❌ Not Written | P2 | Week 2-3 |
| Case Studies | ❌ None | P2 | Month 1 |
| Demo Video | ❌ Not Produced | P1 | Week 1 |
| Email Templates | ❌ Not Created | P1 | Week 1 |
| Welcome Sequence | ❌ Not Set Up | P1 | Week 2 |
| Social Templates | ❌ Not Designed | P2 | Week 2 |
| Newsletter Signup | ❌ Not Implemented | P2 | Month 1 |

**Priority:** 🟡 MEDIUM - Launch week and month 1

---

## Marketing Automation

| Component | Status | Tool | Action Required |
|-----------|--------|------|-----------------|
| Email Platform | ❌ Not Set Up | TBD (Mailchimp/SendGrid) | Choose and configure |
| Welcome Emails | ❌ Not Created | Email platform | Write 5-email sequence |
| Abandoned Cart | ❌ Not Set Up | Email platform | Configure trigger |
| Re-engagement | ❌ Not Set Up | Email platform | Create campaign |
| Lead Scoring | ❌ Not Implemented | CRM/Analytics | Define scoring model |
| Segmentation | ❌ Not Set Up | Email platform | Create user segments |
| A/B Testing | ❌ Not Set Up | Google Optimize/Vercel | Choose tool and configure |

**Priority:** 🟡 MEDIUM - Week 1-2 post-launch

---

## Social Media

| Platform | Status | Assets Needed | Priority |
|----------|--------|---------------|----------|
| LinkedIn | ⚠️ OG tags ready | OG image, banner, posts | P1 |
| Twitter/X | ⚠️ Cards ready | OG image, header, posts | P1 |
| Facebook | ⚠️ OG tags ready | OG image, cover, posts | P1 |
| Instagram | ❌ Not Set Up | Profile pic, posts, reels | P2 |
| YouTube | ❌ Not Set Up | Demo video, banner, about | P2 |
| TikTok | ❌ Not Set Up | Short videos, profile | P3 |

**Priority:** 🟡 MEDIUM - Start with LinkedIn, Twitter, Facebook

---

## Conversion Funnel Tracking

| Stage | Events Configured | Status | Priority |
|-------|-------------------|--------|----------|
| Awareness | PageView | ✅ Auto-tracked | None |
| Interest | Section views | ❌ Not tracked | P1 |
| Consideration | Pricing page visit | ❌ Not tracked | P1 |
| Conversion | Sign-up completion | ❌ Not tracked | P0 |
| Activation | Agent creation | ❌ Not tracked | P1 |
| Monetization | Credit purchase | ❌ Not tracked | P0 |
| Retention | Weekly active usage | ❌ Not tracked | P2 |

**Priority:** 🔴 CRITICAL - Core conversion events
**Priority:** 🟡 MEDIUM - Engagement events

---

## Quick Status Overview

### ✅ What's Working (9 items)
- SEO meta tags and descriptions
- Schema.org structured data
- Sitemap and robots.txt
- Open Graph configuration
- Twitter Cards setup
- PWA manifest
- Vercel Analytics
- Sentry error tracking
- Speed Insights

### ❌ Critical Blockers (8 items)
- Google Analytics placeholder
- Meta Pixel placeholder
- OG image missing
- Favicon set missing
- Privacy policy missing
- Terms of service missing
- Conversion tracking not set up
- Cookie consent not active

### ⚠️ Needs Attention (15 items)
- Image optimization needed
- Demo video not created
- Blog not set up
- Email sequences not created
- A/B testing not configured
- Social media assets incomplete
- Marketing automation not set up
- Event tracking not implemented
- Content marketing plan incomplete
- Performance optimization needed
- Email platform not chosen
- Analytics dashboards not created
- User segmentation not set up
- Retargeting audiences not created
- Case studies not written

---

## Pre-Launch Sprint (This Week)

### Must Complete Before Launch
1. [ ] Configure Google Analytics 4 (2 hours)
2. [ ] Configure Meta Pixel (2 hours)
3. [ ] Create OG image (3 hours)
4. [ ] Create favicon set (2 hours)
5. [ ] Write privacy policy (6 hours)
6. [ ] Write terms of service (6 hours)
7. [ ] Activate cookie consent (3 hours)
8. [ ] Test social sharing (1 hour)

**Total Effort:** ~25 hours
**Team Size:** 3-4 people
**Timeline:** 3-5 days

---

## Week 1 Post-Launch

### High Priority Tasks
1. [ ] Set up GA4 conversion goals (3 hours)
2. [ ] Implement Meta Pixel events (4 hours)
3. [ ] Optimize images to WebP (4 hours)
4. [ ] Produce demo video (8 hours)
5. [ ] Set up email platform (2 hours)
6. [ ] Write welcome email sequence (6 hours)

**Total Effort:** ~27 hours
**Focus:** Conversion tracking and core assets

---

## Month 1 Goals

### Marketing Infrastructure
1. [ ] Launch blog (3 posts minimum)
2. [ ] Set up A/B testing framework
3. [ ] Create 3 case studies
4. [ ] Build email automation workflows
5. [ ] Optimize performance (images, lazy loading)
6. [ ] Set up analytics dashboards
7. [ ] Create social media content calendar

**Focus:** Content creation and optimization

---

## Key Metrics to Track

### Week 1 Targets
- Unique visitors: 1,000+
- Sign-up rate: 2%+
- Demo requests: 10+
- Free trials: 20+

### Month 1 Targets
- Unique visitors: 5,000+
- Sign-up rate: 3%+
- Demo requests: 50+
- Free trials: 150+
- Paid conversions: 15+
- MRR: $7,500+

### Quarter 1 Goals
- Monthly visitors: 10,000+
- Active customers: 50+
- MRR: $25,000+
- CAC: <$300
- LTV: $3,000+

---

## Resources & Links

**Tools Needed:**
- Google Analytics: https://analytics.google.com
- Meta Events Manager: https://business.facebook.com/events_manager
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- Google Rich Results Test: https://search.google.com/test/rich-results
- Favicon Generator: https://realfavicongenerator.net
- Image Optimizer: https://tinypng.com
- Privacy Policy Generator: https://www.termsfeed.com

**Documentation:**
- Full Audit Report: `/docs/MARKETING_AUDIT_REPORT.md`
- Executive Summary: `/docs/MARKETING_AUDIT_SUMMARY.md`
- Action Items: `/docs/MARKETING_ACTION_ITEMS.md`
- Future Tasks: `/docs/TODO_FUTURE.md`

---

**Last Updated:** December 20, 2025
**Next Review:** Pre-launch sprint planning meeting
**Maintained by:** Morgan-Marketing (T9)
