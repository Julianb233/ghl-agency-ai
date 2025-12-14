import React, { useState } from 'react';
import { ArrowRight, Building2, User, Phone, Globe, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingData } from './OnboardingWizard';

interface WelcomeStepProps {
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  isFirstStep?: boolean;
}

const INDUSTRIES = [
  { value: 'marketing-agency', label: 'Marketing Agency' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'other', label: 'Other' },
];

const REVENUE_RANGES = [
  { value: '0-10k', label: '$0 - $10k' },
  { value: '10k-50k', label: '$10k - $50k' },
  { value: '50k-100k', label: '$50k - $100k' },
  { value: '100k-500k', label: '$100k - $500k' },
  { value: '500k+', label: '$500k+' },
];

const EMPLOYEE_COUNTS = [
  { value: 'just-me', label: 'Just me' },
  { value: '2-5', label: '2-5' },
  { value: '6-20', label: '6-20' },
  { value: '21-50', label: '21-50' },
  { value: '50+', label: '50+' },
];

const GOALS = [
  { id: 'lead-generation', label: 'Lead Generation' },
  { id: 'client-management', label: 'Client Management' },
  { id: 'marketing-automation', label: 'Marketing Automation' },
  { id: 'sales-automation', label: 'Sales Automation' },
  { id: 'reporting-analytics', label: 'Reporting & Analytics' },
];

export function WelcomeStep({ data, onNext, onBack, isFirstStep }: WelcomeStepProps) {
  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    companyName: data.companyName || '',
    phoneNumber: data.phoneNumber || '',
    industry: data.industry || '',
    monthlyRevenue: data.monthlyRevenue || '',
    employeeCount: data.employeeCount || '',
    websiteUrl: data.websiteUrl || '',
    goals: data.goals || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)\+]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    if (!formData.industry) {
      newErrors.industry = 'Please select your industry';
    }

    if (!formData.monthlyRevenue) {
      newErrors.monthlyRevenue = 'Please select your revenue range';
    }

    if (!formData.employeeCount) {
      newErrors.employeeCount = 'Please select employee count';
    }

    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL';
    }

    if (formData.goals.length === 0) {
      newErrors.goals = 'Please select at least one goal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  const handleGoalToggle = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const handleWebsiteBlur = () => {
    if (formData.websiteUrl && formData.websiteUrl.trim() && !formData.websiteUrl.startsWith('http')) {
      setFormData(prev => ({ ...prev, websiteUrl: 'https://' + prev.websiteUrl }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Welcome to GHL Agency AI</h2>
        <p className="text-slate-600 text-lg">
          Let's start by getting to know you and your business
        </p>
      </div>

      {/* Personal Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          Personal Information
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Smith"
              className={errors.fullName ? 'border-red-500' : ''}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className={`pl-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.phoneNumber}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.phoneNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Business Information
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyName">Company/Agency Name *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="e.g. Acme Marketing"
              className={errors.companyName ? 'border-red-500' : ''}
              aria-invalid={!!errors.companyName}
            />
            {errors.companyName && (
              <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                onBlur={handleWebsiteBlur}
                placeholder="yourwebsite.com"
                className={`pl-10 ${errors.websiteUrl ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.websiteUrl}
              />
            </div>
            {errors.websiteUrl && (
              <p className="text-sm text-red-600 mt-1">{errors.websiteUrl}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="industry">Industry *</Label>
            <select
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className={`flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                errors.industry ? 'border-red-500' : ''
              }`}
              aria-invalid={!!errors.industry}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(industry => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </select>
            {errors.industry && (
              <p className="text-sm text-red-600 mt-1">{errors.industry}</p>
            )}
          </div>

          <div>
            <Label htmlFor="monthlyRevenue">Monthly Revenue *</Label>
            <div className="relative">
              <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                id="monthlyRevenue"
                value={formData.monthlyRevenue}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyRevenue: e.target.value }))}
                className={`flex h-11 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                  errors.monthlyRevenue ? 'border-red-500' : ''
                }`}
                aria-invalid={!!errors.monthlyRevenue}
              >
                <option value="">Select range</option>
                {REVENUE_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.monthlyRevenue && (
              <p className="text-sm text-red-600 mt-1">{errors.monthlyRevenue}</p>
            )}
          </div>

          <div>
            <Label htmlFor="employeeCount">Team Size *</Label>
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                id="employeeCount"
                value={formData.employeeCount}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeCount: e.target.value }))}
                className={`flex h-11 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                  errors.employeeCount ? 'border-red-500' : ''
                }`}
                aria-invalid={!!errors.employeeCount}
              >
                <option value="">Select size</option>
                {EMPLOYEE_COUNTS.map(count => (
                  <option key={count.value} value={count.value}>
                    {count.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.employeeCount && (
              <p className="text-sm text-red-600 mt-1">{errors.employeeCount}</p>
            )}
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            What are your main goals?
          </h3>
          <p className="text-sm text-slate-500">Select all that apply *</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {GOALS.map((goal) => (
            <label
              key={goal.id}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.goals.includes(goal.id)
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.goals.includes(goal.id)}
                onChange={() => handleGoalToggle(goal.id)}
                className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-sm font-medium text-slate-700">{goal.label}</span>
            </label>
          ))}
        </div>
        {errors.goals && (
          <p className="text-sm text-red-600">{errors.goals}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          disabled={isFirstStep}
          className="min-w-32"
        >
          Back
        </Button>

        <Button
          type="submit"
          className="min-w-32 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
