import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { FeatureTip } from '@/components/tour/FeatureTip';

type IntegrationProvider = 'Google' | 'Gmail' | 'Outlook' | 'Facebook' | 'Instagram' | 'LinkedIn';

const integrationConfig: Record<IntegrationProvider, { icon: string; color: string }> = {
  Google: { icon: '🔍', color: 'bg-blue-500' },
  Gmail: { icon: '📧', color: 'bg-red-500' },
  Outlook: { icon: '📨', color: 'bg-blue-600' },
  Facebook: { icon: '📘', color: 'bg-blue-700' },
  Instagram: { icon: '📷', color: 'bg-pink-500' },
  LinkedIn: { icon: '💼', color: 'bg-blue-800' },
};

interface OAuthIntegrationsTabProps {
  integrations: any[];
  connectingProvider: IntegrationProvider | null;
  onConnect: (provider: IntegrationProvider) => void;
  onDisconnect: (provider: IntegrationProvider) => void;
}

export const OAuthIntegrationsTab = React.memo<OAuthIntegrationsTabProps>(({
  integrations,
  connectingProvider,
  onConnect,
  onDisconnect,
}) => {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-white">OAuth Integrations</CardTitle>
          <FeatureTip
            tipId="settings-oauth-integrations"
            title="OAuth Connections"
            content="Connecting integrations enables seamless data sync, automated workflows, and enhanced features across platforms like Google, Gmail, and social media."
            dismissible={true}
          />
        </div>
        <CardDescription>Connect your accounts to enable automation and data sync</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration: any) => {
            const providerName = integration.service as IntegrationProvider;
            const config = integrationConfig[providerName] || { icon: '🔗', color: 'bg-gray-500' };
            const isConnected = integration.isActive === 'true' || integration.isActive === true;
            return (
              <Card
                key={integration.id}
                className={`bg-slate-800/50 border-slate-700 ${
                  isConnected ? 'border-green-500/30' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center text-2xl`}
                        role="img"
                        aria-label={`${providerName} icon`}
                      >
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{providerName}</h3>
                        {integration.metadata && typeof integration.metadata === 'object' && (integration.metadata as any).email && (
                          <p className="text-xs text-slate-400">{(integration.metadata as any).email}</p>
                        )}
                      </div>
                    </div>
                    {isConnected && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                        Connected
                      </Badge>
                    )}
                  </div>

                  {isConnected && integration.updatedAt && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last updated: {new Date(integration.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {isConnected ? (
                    <Button
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => onDisconnect(providerName)}
                      aria-label={`Disconnect ${providerName}`}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => onConnect(providerName)}
                      disabled={connectingProvider === providerName}
                      aria-label={`Connect ${providerName}`}
                    >
                      {connectingProvider === providerName ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

OAuthIntegrationsTab.displayName = 'OAuthIntegrationsTab';
