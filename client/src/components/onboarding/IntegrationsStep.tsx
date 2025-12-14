import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Link2, CheckCircle2, ExternalLink, Database, Mail, FileText, Cloud, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from './OnboardingWizard';
import { cn } from '@/lib/utils';

interface IntegrationsStepProps {
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSkip: () => void;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  comingSoon?: boolean;
  color: string;
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your knowledge base and documentation',
    icon: <Database className="w-6 h-6" />,
    connected: false,
    color: 'from-slate-600 to-slate-700',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Access and manage your files',
    icon: <Cloud className="w-6 h-6" />,
    connected: false,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect your email for automated campaigns',
    icon: <Mail className="w-6 h-6" />,
    connected: false,
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and schedule meetings',
    icon: <Calendar className="w-6 h-6" />,
    connected: false,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates in Slack',
    icon: <MessageSquare className="w-6 h-6" />,
    connected: false,
    comingSoon: true,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Store and share files with your team',
    icon: <FileText className="w-6 h-6" />,
    connected: false,
    comingSoon: true,
    color: 'from-cyan-500 to-cyan-600',
  },
];

export function IntegrationsStep({ data, onNext, onBack, onSkip }: IntegrationsStepProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(
    AVAILABLE_INTEGRATIONS.map(integration => ({
      ...integration,
      connected: data.integrations.includes(integration.id),
    }))
  );

  const handleConnect = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration || integration.comingSoon) return;

    // TODO: Implement actual OAuth flow
    // For now, simulate connection

    // Open OAuth popup (placeholder)
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // In a real implementation, this would open the OAuth flow
    // For demo purposes, we'll just mark it as connected after a delay
    console.log(`Initiating OAuth for ${integration.name}...`);

    // Simulate OAuth success after a short delay
    setTimeout(() => {
      setIntegrations(prev =>
        prev.map(i =>
          i.id === integrationId ? { ...i, connected: true } : i
        )
      );
    }, 1000);

    // In production, use something like:
    // window.open(
    //   `/api/oauth/${integrationId}/authorize`,
    //   'OAuth',
    //   `width=${width},height=${height},left=${left},top=${top}`
    // );
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(i =>
        i.id === integrationId ? { ...i, connected: false } : i
      )
    );
  };

  const handleContinue = () => {
    const connectedIntegrations = integrations
      .filter(i => i.connected)
      .map(i => i.id);

    onNext({ integrations: connectedIntegrations });
  };

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Connect Your Tools</h2>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Integrate your favorite tools to supercharge your workflow
        </p>
        {connectedCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {connectedCount} integration{connectedCount !== 1 ? 's' : ''} connected
            </span>
          </div>
        )}
      </div>

      {/* Integration Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={cn(
              "relative border-2 rounded-xl p-6 transition-all",
              integration.connected
                ? "border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            {integration.comingSoon && (
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  Coming Soon
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0",
                `bg-gradient-to-br ${integration.color}`
              )}>
                {integration.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 mb-1">
                  {integration.name}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {integration.description}
                </p>

                {integration.connected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleDisconnect(integration.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleConnect(integration.id)}
                    disabled={integration.comingSoon}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {integration.comingSoon ? 'Coming Soon' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          What happens when you connect?
        </h3>
        <div className="space-y-2 text-sm text-slate-700">
          <p>• Secure OAuth authentication - we never see your passwords</p>
          <p>• Automatic data syncing to keep everything up-to-date</p>
          <p>• Enhanced AI capabilities with access to your data</p>
          <p>• You can disconnect anytime from Settings</p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Privacy & Security:</span> All integrations use industry-standard OAuth 2.0. We only request the minimum permissions needed and your data is encrypted in transit and at rest.
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
            onClick={onSkip}
            variant="ghost"
            className="min-w-32"
          >
            Skip for now
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="min-w-32 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
