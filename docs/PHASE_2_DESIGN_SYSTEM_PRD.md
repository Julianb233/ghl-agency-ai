# Phase 2 Design System PRD - Mobile & Accessibility

**Version:** 1.0
**Created:** January 2026
**Status:** ✅ COMPLETE
**Owner:** Development Team
**Completed:** January 2026

---

## Executive Summary

Phase 2 of the Design System focuses on **mobile responsiveness** and **WCAG accessibility compliance**. These are the P0 (Critical) and P1 (High Priority) issues identified in the December 2024 UI/UX Audit that directly impact conversion rates and legal compliance.

### Phase 1 Recap (COMPLETE ✅)
- US-001 to US-007: Core UI components (Button, Input, Select, Modal, Toast, Skeleton, DataTable)
- 242 UI component tests passing
- Enhanced Client Intelligence integration

### Phase 2 Goals
1. Fix mobile conversion blockers (CTAs, navigation)
2. Achieve WCAG 2.1 AA compliance
3. Improve form UX with real-time validation
4. Add navigation context (breadcrumbs, sticky headers)

---

## User Stories

### P0: Critical Fixes (Week 1) - Conversion & Compliance

#### US-008: Fix Mobile CTA Visibility ✅ COMPLETE
**Priority:** P0 - Critical
**Effort:** 1 hour
**File:** `client/src/components/LandingPage.tsx`

**Problem:** CTA buttons are hidden on mobile with `hidden sm:flex`, causing major conversion loss.

**Acceptance Criteria:**
- [x] CTAs visible on all screen sizes
- [x] Buttons stack vertically on mobile (< 640px)
- [x] Proper spacing between stacked buttons
- [x] No horizontal scroll on mobile

**Implementation:**
```tsx
// BEFORE
<div className="hidden sm:flex items-center space-x-4">

// AFTER
<div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
```

---

#### US-009: Increase Touch Targets to 44px ✅ COMPLETE
**Priority:** P0 - Critical (WCAG 2.5.5)
**Effort:** 2 hours
**Files:** `input.tsx`, `select.tsx`, `button.tsx`

**Problem:** Touch targets are 36px (h-9), below WCAG minimum of 44px.

**Acceptance Criteria:**
- [ ] All interactive elements have min-height 44px
- [ ] Input fields use h-11 instead of h-9
- [ ] Small buttons have min-h-[44px]
- [ ] Select triggers have adequate tap area

**Implementation:**
```tsx
// input.tsx
className="flex h-11 w-full rounded-md..." // was h-9

// button.tsx
sm: "h-8 min-h-[44px] rounded-md px-3 text-xs",
```

---

#### US-010: Fix WCAG Text Size Violations ✅ COMPLETE
**Priority:** P0 - Critical (WCAG 1.4.4)
**Effort:** 1 hour
**File:** `client/src/components/LandingPage.tsx`

**Problem:** Text at `text-[10px]` is below WCAG minimum (12px).

**Acceptance Criteria:**
- [ ] No text smaller than 12px (text-xs)
- [ ] Body text minimum 14px on mobile
- [ ] Proper text scaling with rem units

**Implementation:**
```tsx
// BEFORE
<p className="text-[10px]">

// AFTER
<p className="text-xs sm:text-sm">
```

---

#### US-011: Add Mobile Bottom Navigation ✅ COMPLETE
**Priority:** P0 - Critical
**Effort:** 4 hours
**Files:** `Dashboard.tsx`, new `MobileNav.tsx`

**Problem:** Sidebar navigation is unusable on mobile, content gets squeezed.

**Acceptance Criteria:**
- [ ] Bottom tab navigation on mobile (< 768px)
- [ ] Top 5 navigation items as icons
- [ ] Active state indicator
- [ ] Sidebar hidden on mobile
- [ ] Smooth transition when switching views

**Implementation:**
```tsx
// New component: client/src/components/navigation/MobileNav.tsx
<nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t z-50">
  <div className="flex justify-around py-2">
    {/* Top 5 navigation items as icons */}
  </div>
</nav>

// Dashboard.tsx - hide sidebar on mobile
<aside className="hidden md:flex w-16 flex-col...">
```

---

#### US-012: Add File Upload Progress Indicator ✅ COMPLETE
**Priority:** P0 - Critical
**Effort:** 2 hours
**File:** `client/src/components/FileUploader.tsx`

**Problem:** No feedback during file uploads, users abandon thinking app is frozen.

**Acceptance Criteria:**
- [ ] Progress bar shows during upload
- [ ] Percentage text updates in real-time
- [ ] Cancel button available during upload
- [ ] Success/error states displayed

**Implementation:**
```tsx
const [uploadProgress, setUploadProgress] = useState(0);

{isUploading && (
  <div className="w-full">
    <Progress value={uploadProgress} className="h-2" />
    <p className="text-sm text-muted-foreground mt-1">
      Uploading... {uploadProgress}%
    </p>
  </div>
)}
```

---

### P1: High Priority UX (Week 2)

#### US-013: Add Breadcrumb Navigation ✅ COMPLETE
**Priority:** P1 - High
**Effort:** 3 hours
**Files:** New `breadcrumb.tsx`, 11 page updates

**Problem:** Users get lost, no context of location in app.

**Acceptance Criteria:**
- [ ] Reusable Breadcrumb component created
- [ ] Shows current location hierarchy
- [ ] Links to parent pages
- [ ] Accessible with proper aria labels
- [ ] Added to all dashboard pages

---

#### US-014: Implement Page Transitions ✅ COMPLETE
**Priority:** P1 - High
**Effort:** 3 hours
**Files:** New `PageTransition.tsx`, layout updates

**Problem:** App feels static, lacks premium feel.

**Acceptance Criteria:**
- [ ] Fade-in animation on page mount
- [ ] Subtle slide-up effect
- [ ] Respects reduced-motion preference
- [ ] Duration < 300ms for perceived speed

---

#### US-015: Add Password Visibility Toggle ✅ COMPLETE
**Priority:** P1 - High
**Effort:** 1 hour
**File:** `client/src/components/LoginScreen.tsx`

**Problem:** Users can't verify password entry.

**Acceptance Criteria:**
- [ ] Eye icon toggle in password fields
- [ ] Accessible button with aria-label
- [ ] Works on all password inputs (login, signup, reset)

---

#### US-016: Real-Time Form Validation ✅ COMPLETE
**Priority:** P1 - High
**Effort:** 4 hours
**Files:** All form components

**Problem:** Users only see errors on submit.

**Acceptance Criteria:**
- [ ] Validation triggers on field blur
- [ ] Inline error messages below fields
- [ ] Error state styling (red border, icon)
- [ ] Success state for valid fields
- [ ] Uses react-hook-form mode: 'onChange'

---

#### US-017: Add Sticky Headers on Scroll ✅ COMPLETE
**Priority:** P1 - High
**Effort:** 2 hours
**Files:** LeadDetails, CampaignDetails, Settings pages

**Problem:** Users lose context when scrolling long pages.

**Acceptance Criteria:**
- [ ] Page header sticks to top on scroll
- [ ] Actions remain accessible
- [ ] Blur/transparency effect for modern look
- [ ] Header collapses slightly on scroll (optional)

---

### P2: Polish & Consistency (Week 3)

#### US-018: Animation Utility Library ✅ COMPLETE
Create reusable animation classes in index.css.

#### US-019: Standardize Empty States ✅ COMPLETE
Consistent empty state components across all list views.

#### US-020: Semantic Color Tokens ✅ COMPLETE
Add success, warning, info color variables with dark mode support.

#### US-021: Mobile-Responsive Tables ✅ COMPLETE
Card view for tables on mobile devices.

#### US-022: Skeleton Shimmer Effects ✅ COMPLETE
Animated loading placeholders for all async content.

---

## Technical Requirements

### Dependencies
- `framer-motion` (already installed) - Page transitions
- `react-hook-form` (already installed) - Form validation
- `@radix-ui/react-visually-hidden` - Accessibility helpers

### Testing Requirements
- Mobile viewport tests (375px, 428px)
- Touch target size validation (44px minimum)
- Keyboard navigation tests
- Screen reader compatibility
- WCAG 2.1 AA color contrast

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome for Android

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Mobile Lighthouse Score | ~65 | 90+ |
| Accessibility Score | ~75 | 95+ |
| Touch Target Compliance | 60% | 100% |
| WCAG Text Size Compliance | 80% | 100% |
| Mobile Bounce Rate | High | -30% |

---

## Timeline

| Week | Focus | User Stories |
|------|-------|--------------|
| Week 1 | Critical Fixes | US-008 to US-012 |
| Week 2 | High Priority UX | US-013 to US-017 |
| Week 3 | Polish & Consistency | US-018 to US-022 |
| Week 4 | Testing & QA | Full regression testing |

---

## Related Documents

- [UI/UX Improvement Plan](./UI_UX_IMPROVEMENT_PLAN.md) - Full audit results
- [Phase 1 Design System](./PHASE5_README.md) - Core components
- [Accessibility Audit Report](./ACCESSIBILITY_AUDIT_REPORT.md)
- [Responsive Design Audit](./RESPONSIVE_DESIGN_AUDIT.md)

---

*Last Updated: January 2026*
