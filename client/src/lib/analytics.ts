/**
 * Google Ads and Analytics Conversion Tracking
 *
 * This module provides type-safe conversion tracking for Google Ads.
 * Replace placeholder IDs with actual values in index.html and .env
 */

// Extend Window interface for gtag and fbq
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
    fbq?: (
      command: string,
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

/**
 * Conversion event types for Google Ads
 */
export enum ConversionEvent {
  EMAIL_SIGNUP = 'email_signup',
  TRIAL_START = 'trial_start',
  CTA_CLICK = 'cta_click',
  PRICING_VIEW = 'pricing_view',
  FORM_SUBMIT = 'form_submit',
  EXIT_INTENT_CONVERSION = 'exit_intent_conversion',
  DEMO_REQUEST = 'demo_request',
  REGISTRATION_COMPLETE = 'registration_complete',
  ONBOARDING_COMPLETE = 'onboarding_complete',
}

/**
 * Conversion labels mapping
 * Replace these with actual conversion labels from Google Ads
 */
const CONVERSION_LABELS: Record<ConversionEvent, string> = {
  [ConversionEvent.EMAIL_SIGNUP]: 'LABEL_EMAIL_SIGNUP',
  [ConversionEvent.TRIAL_START]: 'LABEL_TRIAL_START',
  [ConversionEvent.CTA_CLICK]: 'LABEL_CTA_CLICK',
  [ConversionEvent.PRICING_VIEW]: 'LABEL_PRICING_VIEW',
  [ConversionEvent.FORM_SUBMIT]: 'LABEL_FORM_SUBMIT',
  [ConversionEvent.EXIT_INTENT_CONVERSION]: 'LABEL_EXIT_INTENT',
  [ConversionEvent.DEMO_REQUEST]: 'LABEL_DEMO_REQUEST',
  [ConversionEvent.REGISTRATION_COMPLETE]: 'LABEL_REGISTRATION',
  [ConversionEvent.ONBOARDING_COMPLETE]: 'LABEL_ONBOARDING',
};

interface ConversionParams {
  value?: number;
  currency?: string;
  transaction_id?: string;
  [key: string]: any;
}

/**
 * Track a Google Ads conversion event
 */
export function trackConversion(
  event: ConversionEvent,
  params: ConversionParams = {}
): void {
  if (typeof window === 'undefined') return;

  const label = CONVERSION_LABELS[event];

  // Google Ads gtag conversion tracking
  if (window.gtag) {
    try {
      window.gtag('event', 'conversion', {
        send_to: `AW-XXXXXXXXX/${label}`, // Replace AW-XXXXXXXXX with actual conversion ID
        value: params.value || 0,
        currency: params.currency || 'USD',
        transaction_id: params.transaction_id,
        ...params,
      });

      // Also send as standard GA4 event
      window.gtag('event', event, {
        event_category: 'conversion',
        event_label: label,
        ...params,
      });

      console.log(`[Analytics] Conversion tracked: ${event}`, params);
    } catch (error) {
      console.error('[Analytics] Error tracking conversion:', error);
    }
  }

  // Facebook Pixel tracking (if available)
  if (window.fbq) {
    try {
      const fbEventMap: Record<ConversionEvent, string> = {
        [ConversionEvent.EMAIL_SIGNUP]: 'Lead',
        [ConversionEvent.TRIAL_START]: 'StartTrial',
        [ConversionEvent.CTA_CLICK]: 'Lead',
        [ConversionEvent.PRICING_VIEW]: 'ViewContent',
        [ConversionEvent.FORM_SUBMIT]: 'SubmitApplication',
        [ConversionEvent.EXIT_INTENT_CONVERSION]: 'Lead',
        [ConversionEvent.DEMO_REQUEST]: 'Schedule',
        [ConversionEvent.REGISTRATION_COMPLETE]: 'CompleteRegistration',
        [ConversionEvent.ONBOARDING_COMPLETE]: 'CompleteRegistration',
      };

      const fbEvent = fbEventMap[event];
      if (fbEvent) {
        window.fbq('track', fbEvent, {
          content_name: event,
          ...params,
        });
      }
    } catch (error) {
      console.error('[Analytics] Error tracking Facebook event:', error);
    }
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath?: string): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('event', 'page_view', {
        page_path: pagePath || window.location.pathname,
      });
      console.log(`[Analytics] Page view tracked: ${pagePath || window.location.pathname}`);
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  }

  if (window.fbq) {
    try {
      window.fbq('track', 'PageView');
    } catch (error) {
      console.error('[Analytics] Error tracking Facebook page view:', error);
    }
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  params: Record<string, any> = {}
): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('event', eventName, params);
      console.log(`[Analytics] Event tracked: ${eventName}`, params);
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }
}

/**
 * Initialize analytics consent mode (for GDPR compliance)
 */
export function initAnalyticsConsent(): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        wait_for_update: 500,
      });
    } catch (error) {
      console.error('[Analytics] Error initializing consent:', error);
    }
  }
}

/**
 * Update analytics consent
 */
export function updateAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: granted ? 'granted' : 'denied',
      });
      console.log(`[Analytics] Consent updated: ${granted ? 'granted' : 'denied'}`);
    } catch (error) {
      console.error('[Analytics] Error updating consent:', error);
    }
  }
}

/**
 * Set user properties for enhanced conversion tracking
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('set', 'user_properties', properties);
      console.log('[Analytics] User properties set:', properties);
    } catch (error) {
      console.error('[Analytics] Error setting user properties:', error);
    }
  }
}

// Export default object with all tracking functions
export default {
  trackConversion,
  trackPageView,
  trackEvent,
  initAnalyticsConsent,
  updateAnalyticsConsent,
  setUserProperties,
  ConversionEvent,
};
