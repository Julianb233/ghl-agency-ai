import React, { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassPane } from '../GlassPane';
import { WelcomeStep } from './WelcomeStep';
import { QuickDemoStep } from './QuickDemoStep';
import { GHLConnectStep } from './GHLConnectStep';
import { BrandSetupStep } from './BrandSetupStep';
import { IntegrationsStep } from './IntegrationsStep';
import { CompletionStep } from './CompletionStep';
import { trpc } from '@/lib/trpc';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export interface OnboardingData {
  // Welcome step
  fullName: string;
  companyName: string;
  phoneNumber: string;
  industry: string;
  monthlyRevenue: string;
  employeeCount: string;
  websiteUrl: string;
  goals: string[];

  // GHL Connect step
  ghlApiKey: string;

  // Brand Setup step
  brandVoice: string;
  brandGuidelines: File[];
  logoFile: File | null;

  // Integrations step
  integrations: string[];
}

const STEPS = [
  { number: 1, label: 'Welcome', id: 'welcome' },
  { number: 2, label: 'Quick Demo', id: 'demo' },
  { number: 3, label: 'Connect GHL', id: 'ghl' },
  { number: 4, label: 'Brand Setup', id: 'brand' },
  { number: 5, label: 'Integrations', id: 'integrations' },
  { number: 6, label: 'Complete', id: 'complete' },
] as const;

const STORAGE_KEY = 'ghl_onboarding_progress';

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding data state
  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    companyName: '',
    phoneNumber: '',
    industry: '',
    monthlyRevenue: '',
    employeeCount: '',
    websiteUrl: '',
    goals: [],
    ghlApiKey: '',
    brandVoice: '',
    brandGuidelines: [],
    logoFile: null,
    integrations: [],
  });

  const submitOnboarding = trpc.onboarding.submit.useMutation();

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentStep(parsed.currentStep || 1);
        setData(prev => ({ ...prev, ...parsed.data }));
      } catch (e) {
        console.error('Failed to parse saved onboarding data:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (step: number, newData: Partial<OnboardingData>) => {
    const merged = { ...data, ...newData };
    setData(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep: step,
      data: merged,
    }));
  };

  const handleNext = (stepData: Partial<OnboardingData>) => {
    saveProgress(currentStep + 1, stepData);
    setCurrentStep(prev => prev + 1);
    setError(null);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Submit core onboarding data
      await submitOnboarding.mutateAsync({
        fullName: data.fullName,
        companyName: data.companyName,
        phoneNumber: data.phoneNumber,
        industry: data.industry as any,
        monthlyRevenue: data.monthlyRevenue as any,
        employeeCount: data.employeeCount as any,
        websiteUrl: data.websiteUrl || '',
        goals: data.goals,
        otherGoal: '',
        ghlApiKey: data.ghlApiKey,
      });

      // TODO: Upload brand assets (logo, guidelines) to S3
      // TODO: Save brand voice to user profile
      // TODO: Initialize selected integrations

      // Clear saved progress
      localStorage.removeItem(STORAGE_KEY);

      // Simulate setup process for better UX
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setError(error?.message || 'Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 p-4">
      <div className="w-full max-w-4xl">
        {/* Header with Progress */}
        <div className="mb-8 px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-xl">Welcome to GHL Agency AI</h1>
              <p className="text-sm text-slate-500">Let's get you set up in just a few steps</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div className={cn(
                      "flex-1 h-1 rounded-full transition-colors duration-300",
                      currentStep > index ? "bg-emerald-600" : "bg-slate-200"
                    )} />
                  )}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-300",
                    currentStep > step.number
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                      : currentStep === step.number
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110"
                      : "bg-slate-200 text-slate-400"
                  )}>
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-1 rounded-full transition-colors duration-300",
                      currentStep > step.number ? "bg-emerald-600" : "bg-slate-200"
                    )} />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium transition-colors duration-300",
                  currentStep >= step.number ? "text-slate-700" : "text-slate-400"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <GlassPane className="p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[600px]">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-20 pointer-events-none" />

          {/* Step Content */}
          <div className="relative z-10">
            {currentStep === 1 && (
              <WelcomeStep
                data={data}
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep
              />
            )}

            {currentStep === 2 && (
              <QuickDemoStep
                data={data}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 3 && (
              <GHLConnectStep
                data={data}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 4 && (
              <BrandSetupStep
                data={data}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 5 && (
              <IntegrationsStep
                data={data}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 6 && (
              <CompletionStep
                data={data}
                onComplete={handleComplete}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>
        </GlassPane>

        {/* Progress Bar */}
        <div className="mt-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
