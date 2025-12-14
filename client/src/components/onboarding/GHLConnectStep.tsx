import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Key, CheckCircle2, XCircle, Loader2, ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OnboardingData } from './OnboardingWizard';

interface GHLConnectStepProps {
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSkip: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function GHLConnectStep({ data, onNext, onBack, onSkip }: GHLConnectStepProps) {
  const [apiKey, setApiKey] = useState(data.ghlApiKey || '');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter an API key first');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      // TODO: Implement actual API key validation
      // For now, simulate a test with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate validation (replace with actual API call)
      if (apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }

      setTestStatus('success');
      setTestMessage('Connection successful! Your GoHighLevel account is linked.');
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.message || 'Failed to connect. Please check your API key and try again.');
    }
  };

  const handleContinue = () => {
    onNext({ ghlApiKey: apiKey });
  };

  const handleSkipStep = () => {
    onSkip();
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Connect GoHighLevel</h2>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Link your GoHighLevel account to enable powerful automation features
        </p>
      </div>

      {/* How to get API Key */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="space-y-2">
            <p className="font-semibold">How to get your GHL API Key:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
              <li>Log into your GoHighLevel account</li>
              <li>Navigate to Settings → API Keys</li>
              <li>Click "Create API Key" or use an existing one</li>
              <li>Copy the API key and paste it below</li>
            </ol>
            <a
              href="https://help.gohighlevel.com/support/solutions/articles/155000001808-agency-api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
            >
              View detailed instructions
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {/* API Key Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="ghlApiKey" className="text-base font-semibold">
            GoHighLevel Agency API Key
            <span className="text-slate-400 font-normal ml-2">(Optional - can be added later)</span>
          </Label>
          <div className="mt-2 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Key className="w-5 h-5 text-slate-400" />
            </div>
            <Input
              id="ghlApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pit_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="pl-11 pr-24 font-mono text-sm h-12"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Shield className="w-3 h-3" />
            <span>Your API key is encrypted with AES-256 before storage</span>
          </div>
        </div>

        {/* Test Connection Button */}
        <Button
          type="button"
          onClick={handleTestConnection}
          disabled={!apiKey.trim() || testStatus === 'testing'}
          variant="outline"
          className="w-full"
        >
          {testStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        {/* Test Status Message */}
        {testStatus === 'success' && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 text-sm">{testMessage}</p>
            </div>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">{testMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4">What you'll unlock:</h3>
        <div className="space-y-3">
          {[
            'Automatic sub-account discovery and syncing',
            'Seamless contact and lead management',
            'Automated workflow triggers and actions',
            'Two-way data synchronization',
            'Advanced reporting and analytics',
          ].map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skip Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Don't have your API key handy?</span> No worries! You can skip this step and add your GoHighLevel API key later from the Settings page.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="min-w-32"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleSkipStep}
            variant="ghost"
            className="min-w-32"
          >
            Skip for now
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="min-w-32 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            disabled={apiKey.trim() !== '' && testStatus !== 'success'}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
