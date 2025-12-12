import React, { useState, useEffect } from 'react';
import { X, Rocket, Clock, Gift } from 'lucide-react';
import { Button } from './ui/button';

interface ExitIntentPopupProps {
  onSignUp: () => void;
}

export const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({ onSignUp }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if popup was already shown this session
    const alreadyShown = sessionStorage.getItem('exitIntentShown');
    if (alreadyShown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves through the top of the page
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    // Add slight delay before enabling exit intent
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000); // Wait 5 seconds before enabling

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSignUp = () => {
    setIsVisible(false);
    onSignUp();
    // Track conversion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exit_intent_conversion', {
        event_category: 'engagement',
        event_label: 'exit_intent_signup'
      });
    }
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead', { content_name: 'exit_intent' });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 text-white text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-bold">WAIT! Special Offer</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            Before You Go...
          </h2>
          <p className="text-purple-100 text-sm sm:text-base">
            Get our exclusive founder pricing before it's gone
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Save $500/month</p>
                <p className="text-sm text-slate-600">Lock in $497/mo before it goes to $997</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Get Started in 24 Hours</p>
                <p className="text-sm text-slate-600">Full onboarding support included</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleSignUp}
            className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white rounded-full h-14 text-lg font-bold shadow-lg shadow-purple-500/30"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Claim My Founder Pricing
          </Button>

          <p className="text-center text-xs text-slate-500 mt-4">
            30-day money-back guarantee. No credit card required.
          </p>

          <button
            onClick={handleClose}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-3 py-2"
          >
            No thanks, I'll pay full price later
          </button>
        </div>
      </div>
    </div>
  );
};
