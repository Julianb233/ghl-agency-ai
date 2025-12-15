import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Cookie, Shield } from 'lucide-react';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay before showing
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    // Enable analytics
    if (typeof window !== 'undefined') {
      (window as any).gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
    // Disable analytics
    if (typeof window !== 'undefined') {
      (window as any).gtag?.('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0 hidden sm:block">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Cookie className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Cookie className="w-5 h-5 text-purple-600 sm:hidden" />
              We value your privacy
            </h3>
            <p className="text-sm text-slate-600">
              We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
              By clicking "Accept", you consent to our use of cookies.
              <a href="/privacy" className="text-purple-600 hover:underline ml-1">Privacy Policy</a>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex-1 sm:flex-none text-slate-600 border-slate-300"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
