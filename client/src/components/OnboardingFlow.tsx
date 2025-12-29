
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { GlassPane } from './GlassPane';
import { trpc } from '../lib/trpc';
import { cn } from '../lib/utils';
import { trackConversion, ConversionEvent } from '@/lib/analytics';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface OnboardingData {
  fullName: string;
  companyName: string;
  phoneNumber: string;
  industry: string;
  monthlyRevenue: string;
  employeeCount: string;
  websiteUrl: string;
  goals: string[];
  otherGoal: string;
  ghlApiKey: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step configuration
  const steps = [
    { number: 1, label: 'Account' },
    { number: 2, label: 'Business' },
    { number: 3, label: 'Goals' },
    { number: 4, label: 'Integration' },
    { number: 5, label: 'Complete' },
  ];

  // Step 1: About You
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2: About Your Business
  const [industry, setIndustry] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Validation functions
  const validateFullName = (name: string) => {
    if (!name.trim()) return 'Full name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    return '';
  };

  const validateCompanyName = (name: string) => {
    if (!name.trim()) return 'Company name is required';
    if (name.trim().length < 2) return 'Company name must be at least 2 characters';
    return '';
  };

  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) return 'Phone number is required';
    if (!/^[\d\s\-\(\)\+]+$/.test(phone)) return 'Invalid phone number format';
    if (phone.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits';
    return '';
  };

  const validateWebsiteUrl = (url: string) => {
    if (!url) return ''; // Optional field
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(url)) return 'Invalid website URL format';
    return '';
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFullName(value);
    const error = validateFullName(value);
    setErrors(prev => ({ ...prev, fullName: error }));
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyName(value);
    const error = validateCompanyName(value);
    setErrors(prev => ({ ...prev, companyName: error }));
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    const error = validatePhoneNumber(value);
    setErrors(prev => ({ ...prev, phoneNumber: error }));
  };

  // Auto-add https:// to website URL if missing
  const handleWebsiteUrlChange = (value: string) => {
    setWebsiteUrl(value);
    const error = validateWebsiteUrl(value);
    setErrors(prev => ({ ...prev, websiteUrl: error }));
  };

  const handleWebsiteUrlBlur = () => {
    if (websiteUrl && websiteUrl.trim()) {
      const trimmed = websiteUrl.trim();
      // Only add https:// if there's content and it doesn't already have a protocol
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        const newUrl = 'https://' + trimmed;
        setWebsiteUrl(newUrl);
        const error = validateWebsiteUrl(newUrl);
        setErrors(prev => ({ ...prev, websiteUrl: error }));
      }
    }
  };

  // Step 3: Your Goals
  const [goals, setGoals] = useState<string[]>([]);
  const [otherGoal, setOtherGoal] = useState('');

  // Step 4: Connect GoHighLevel
  const [ghlApiKey, setGhlApiKey] = useState('');

  // tRPC mutation for submitting onboarding data
  const submitOnboarding = trpc.onboarding.submit.useMutation();

  const handleGoalToggle = (goal: string) => {
    setGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return fullName.trim() && companyName.trim() && phoneNumber.trim() &&
               !errors.fullName && !errors.companyName && !errors.phoneNumber;
      case 2:
        return industry && monthlyRevenue && employeeCount && !errors.websiteUrl;
      case 3:
        return goals.length > 0;
      case 4:
        // GHL API key is optional - users can skip and add later
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
      setError(null);
    } else {
      setIsLoading(true);
      setError(null);

      try {
        // Submit onboarding data via tRPC
        await submitOnboarding.mutateAsync({
          fullName,
          companyName,
          phoneNumber,
          industry: industry as any,
          monthlyRevenue: monthlyRevenue as any,
          employeeCount: employeeCount as any,
          websiteUrl: websiteUrl || '',
          goals,
          otherGoal,
          ghlApiKey,
        });

        // Track onboarding completion
        trackConversion(ConversionEvent.ONBOARDING_COMPLETE, {
          company: companyName,
          industry: industry,
          revenue: monthlyRevenue,
        });

        // Simulate setup process for better UX
        setTimeout(() => {
          onComplete();
        }, 2000);
      } catch (error: any) {
        console.error('Onboarding error:', error);
        setError(error?.message || 'Failed to save onboarding data. Please try again.');
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < 5) {
      setStep(step + 1);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-slate-50 to-white p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 px-4">
          <div className="flex items-center gap-2 mb-6">
             <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">AI</div>
             <span className="font-bold text-slate-700 text-lg">Agency Setup</span>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between">
            {steps.map((stepItem, index) => (
              <div key={stepItem.number} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div className={cn("flex-1 h-0.5", step > index ? "bg-emerald-600" : "bg-slate-200")} />
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    step > stepItem.number ? "bg-emerald-600 text-white" :
                    step === stepItem.number ? "bg-emerald-600 text-white" :
                    "bg-slate-200 text-slate-400"
                  )}>
                    {step > stepItem.number ? <Check className="h-4 w-4" /> : stepItem.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn("flex-1 h-0.5", step > stepItem.number ? "bg-emerald-600" : "bg-slate-200")} />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2",
                  step >= stepItem.number ? "text-slate-700 font-medium" : "text-slate-400"
                )}>{stepItem.label}</span>
              </div>
            ))}
          </div>
        </div>

        <GlassPane className="p-12 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="relative z-10">
            {/* Step 1: About You */}
            {step === 1 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">About You</h2>
                <p className="text-slate-500 mb-8 text-lg">Let's start with some basic information about you and your agency.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={handleFullNameChange}
                      className={`w-full bg-white/50 border rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg transition-all ${
                        errors.fullName ? 'border-red-500' : 'border-slate-200'
                      }`}
                      placeholder="John Smith"
                      autoFocus
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    />
                    {errors.fullName && (
                      <p id="fullName-error" className="text-sm text-red-600 mt-1" role="alert">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Company/Agency Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      className={`w-full bg-white/50 border rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg transition-all ${
                        errors.companyName ? 'border-red-500' : 'border-slate-200'
                      }`}
                      placeholder="e.g. Zenith Growth Ops"
                      aria-invalid={!!errors.companyName}
                      aria-describedby={errors.companyName ? 'companyName-error' : undefined}
                    />
                    {errors.companyName && (
                      <p id="companyName-error" className="text-sm text-red-600 mt-1" role="alert">
                        {errors.companyName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className={`w-full bg-white/50 border rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg transition-all ${
                        errors.phoneNumber ? 'border-red-500' : 'border-slate-200'
                      }`}
                      placeholder="+1 (555) 123-4567"
                      aria-invalid={!!errors.phoneNumber}
                      aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
                    />
                    {errors.phoneNumber && (
                      <p id="phoneNumber-error" className="text-sm text-red-600 mt-1" role="alert">
                        {errors.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: About Your Business */}
            {step === 2 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">About Your Business</h2>
                <p className="text-slate-500 mb-8 text-lg">Help us understand your business to provide better insights.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg"
                    >
                      <option value="">Select your industry</option>
                      <option value="marketing-agency">Marketing Agency</option>
                      <option value="real-estate">Real Estate</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="saas">SaaS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Revenue Range</label>
                    <select
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg"
                    >
                      <option value="">Select revenue range</option>
                      <option value="0-10k">$0 - $10k</option>
                      <option value="10k-50k">$10k - $50k</option>
                      <option value="50k-100k">$50k - $100k</option>
                      <option value="100k-500k">$100k - $500k</option>
                      <option value="500k+">$500k+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee Count</label>
                    <select
                      value={employeeCount}
                      onChange={(e) => setEmployeeCount(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg"
                    >
                      <option value="">Select employee count</option>
                      <option value="just-me">Just me</option>
                      <option value="2-5">2-5</option>
                      <option value="6-20">6-20</option>
                      <option value="21-50">21-50</option>
                      <option value="50+">50+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Website URL (Optional)</label>
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => handleWebsiteUrlChange(e.target.value)}
                      onBlur={handleWebsiteUrlBlur}
                      className={`w-full bg-white/50 border rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none text-lg transition-all ${
                        errors.websiteUrl ? 'border-red-500' : 'border-slate-200'
                      }`}
                      placeholder="yourwebsite.com"
                      aria-invalid={!!errors.websiteUrl}
                      aria-describedby={errors.websiteUrl ? 'websiteUrl-error' : undefined}
                    />
                    {errors.websiteUrl ? (
                      <p id="websiteUrl-error" className="text-sm text-red-600 mt-1" role="alert">
                        {errors.websiteUrl}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">https:// will be added automatically</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Your Goals */}
            {step === 3 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Goals</h2>
                <p className="text-slate-500 mb-8 text-lg">What are you looking to achieve? Select all that apply.</p>

                <div className="space-y-4">
                  {[
                    { id: 'lead-generation', label: 'Lead Generation' },
                    { id: 'client-management', label: 'Client Management' },
                    { id: 'marketing-automation', label: 'Marketing Automation' },
                    { id: 'sales-automation', label: 'Sales Automation' },
                    { id: 'reporting-analytics', label: 'Reporting & Analytics' },
                  ].map((goal) => (
                    <label
                      key={goal.id}
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        goals.includes(goal.id)
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200 bg-white/30 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={goals.includes(goal.id)}
                        onChange={() => handleGoalToggle(goal.id)}
                        className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <span className="text-lg text-slate-800 font-medium">{goal.label}</span>
                    </label>
                  ))}

                  <label
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      goals.includes('other')
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 bg-white/30 hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={goals.includes('other')}
                      onChange={() => handleGoalToggle('other')}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="text-lg text-slate-800 font-medium">Other</span>
                  </label>

                  {goals.includes('other') && (
                    <div className="ml-9 mt-2">
                      <input
                        type="text"
                        value={otherGoal}
                        onChange={(e) => setOtherGoal(e.target.value)}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Please specify..."
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Connect GoHighLevel */}
            {step === 4 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Connect GoHighLevel</h2>
                <p className="text-slate-500 mb-8 text-lg">Enter your Agency API Key to enable automated sub-account discovery.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      GoHighLevel API Key <span className="text-slate-300 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={ghlApiKey}
                        onChange={(e) => setGhlApiKey(e.target.value)}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-lg shadow-inner"
                        placeholder="pit_xxxxxxxxxxxxxxxx"
                      />
                      <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-all duration-300 ${ghlApiKey.length > 10 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      Your key is encrypted with AES-256 before storage.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Don't have an API key yet?</span> No problem! You can skip this step and add your GoHighLevel API key later from the Settings page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Ready to Launch */}
            {step === 5 && (
              <div className="animate-slide-in-right duration-500 text-center">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Ready to Launch</h2>
                <p className="text-slate-500 mb-8 text-lg">Your AI-powered agency dashboard is ready to go!</p>

                <div className="bg-white/50 border border-slate-200 rounded-xl p-6 max-w-md mx-auto text-left mb-8 shadow-lg">
                  <h3 className="font-bold text-slate-800 mb-4 text-lg">Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agency:</span>
                      <span className="text-slate-800 font-medium">{companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Industry:</span>
                      <span className="text-slate-800 font-medium capitalize">{industry.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Revenue:</span>
                      <span className="text-slate-800 font-medium">{monthlyRevenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Team Size:</span>
                      <span className="text-slate-800 font-medium capitalize">{employeeCount.replace('-', ' ')}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-slate-500 block mb-2">Goals:</span>
                      <div className="flex flex-wrap gap-2">
                        {goals.map(goal => (
                          <span key={goal} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            {goal === 'other' ? otherGoal || 'Other' : goal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-200 rounded-xl p-6 max-w-md mx-auto text-left mb-8 shadow-2xl font-mono text-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-bold text-white">System Online</span>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between"><span>{'>'} Initializing Neural Core...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="flex justify-between"><span>{'>'} Syncing Notion DB...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="flex justify-between"><span>{'>'} Verifying Agency API...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="text-emerald-400 mt-2">{'>'} Awaiting First Command...</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-8 mt-4 gap-4">
              <button
                onClick={handleBack}
                disabled={step === 1 || isLoading}
                className="bg-white/50 border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div className="flex gap-2">
                {step > 1 && step < 5 && (
                  <button
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="bg-white/50 border border-slate-200 text-slate-500 px-6 py-4 rounded-xl font-medium hover:bg-white/80 hover:text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={isLoading || !canProceed()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Initializing...</>
                  ) : step === 5 ? 'Launch Dashboard' : 'Continue'}
                  {!isLoading && step < 5 && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
                </button>
              </div>
            </div>
          </div>
        </GlassPane>
      </div>
    </div>
  );
};
