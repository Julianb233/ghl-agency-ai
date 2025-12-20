
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { GlassPane } from './GlassPane';
import { trackConversion, ConversionEvent } from '@/lib/analytics';

interface LoginScreenProps {
  onAuthenticated: (tier: 'STARTER' | 'GROWTH' | 'WHITELABEL', needsOnboarding?: boolean) => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (isSignUp && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must include uppercase, lowercase, and number';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    const error = validateEmail(value);
    setErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setErrors(prev => ({ ...prev, password: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name: email.split('@')[0] }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

// Success - determine tier and onboarding status
      const tier = 'WHITELABEL'; // Default tier, could be from response in the future
      const needsOnboarding = isSignUp || data.user?.onboardingCompleted === false;

      // Track conversion if this is a signup
      if (isSignUp) {
        trackConversion(ConversionEvent.REGISTRATION_COMPLETE, {
          method: 'email',
          tier: tier,
          value: 497,
          currency: 'USD',
        });
      }

      // Call onAuthenticated with tier and onboarding flag
      onAuthenticated(tier, needsOnboarding);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <button onClick={onBack} className="text-slate-500 hover:text-emerald-600 font-bold flex items-center gap-2 text-sm transition-colors p-2 min-h-[44px]" aria-label="Back to Home">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </button>
      </div>

      <div className="w-full max-w-md relative">
        {/* Decoration */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

        <GlassPane className="p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-slate-500 text-sm mt-2">
              {isSignUp ? 'Sign up to access the command center.' : 'Enter your agency credentials to access the command center.'}
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full bg-white/50 border rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                  errors.email ? 'border-red-500' : 'border-slate-200'
                }`}
                placeholder="agency@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full bg-white/50 border rounded-lg px-4 py-3 pr-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                    errors.password ? 'border-red-500' : 'border-slate-200'
                  }`}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !!errors.email || !!errors.password}
              className="w-full min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {isSignUp ? 'Creating Account...' : 'Authenticating...'}</>
              ) : (
                isSignUp ? 'Create Account' : 'Access Terminal'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setErrors({});
              }}
              className="text-sm text-emerald-600 hover:underline font-medium p-2 min-h-[44px] inline-flex items-center"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
            {!isSignUp && (
              <p className="text-xs text-slate-400 mt-3">
                Protected by Enterprise Encryption. <br />
                <a href="#" className="text-emerald-500 hover:underline p-2 min-h-[44px] inline-flex items-center">Forgot Password?</a>
              </p>
            )}
          </div>
        </GlassPane>
      </div>
    </div>
  );
};
