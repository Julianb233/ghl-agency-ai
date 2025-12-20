/**
 * Custom hook for conversion tracking
 */

import { useCallback } from 'react';
import { trackConversion, ConversionEvent } from '@/lib/analytics';

interface TrackingParams {
  source?: string;
  button_location?: string;
  [key: string]: any;
}

export function useConversionTracking() {
  /**
   * Track a CTA click with conversion data
   */
  const trackCTAClick = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.CTA_CLICK, {
      event_category: 'cta_interaction',
      ...params,
    });
  }, []);

  /**
   * Track email signup
   */
  const trackEmailSignup = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.EMAIL_SIGNUP, {
      event_category: 'lead_generation',
      ...params,
    });
  }, []);

  /**
   * Track trial start
   */
  const trackTrialStart = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.TRIAL_START, {
      event_category: 'conversion',
      value: 497, // Monthly plan value
      currency: 'USD',
      ...params,
    });
  }, []);

  /**
   * Track pricing section view
   */
  const trackPricingView = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.PRICING_VIEW, {
      event_category: 'engagement',
      ...params,
    });
  }, []);

  /**
   * Track form submission
   */
  const trackFormSubmit = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.FORM_SUBMIT, {
      event_category: 'lead_generation',
      ...params,
    });
  }, []);

  /**
   * Track demo request
   */
  const trackDemoRequest = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.DEMO_REQUEST, {
      event_category: 'lead_generation',
      ...params,
    });
  }, []);

  /**
   * Track registration completion
   */
  const trackRegistrationComplete = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.REGISTRATION_COMPLETE, {
      event_category: 'conversion',
      value: 497,
      currency: 'USD',
      ...params,
    });
  }, []);

  /**
   * Track onboarding completion
   */
  const trackOnboardingComplete = useCallback((params: TrackingParams = {}) => {
    trackConversion(ConversionEvent.ONBOARDING_COMPLETE, {
      event_category: 'conversion',
      ...params,
    });
  }, []);

  return {
    trackCTAClick,
    trackEmailSignup,
    trackTrialStart,
    trackPricingView,
    trackFormSubmit,
    trackDemoRequest,
    trackRegistrationComplete,
    trackOnboardingComplete,
  };
}
