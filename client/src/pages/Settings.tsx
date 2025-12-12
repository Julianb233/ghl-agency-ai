import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOAuthPopup } from '@/components/OAuthPopup';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Key,
  Link2,
  Webhook,
  Settings as SettingsIcon,
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCw,
  Globe,
  Mail,
  Clock,
  Moon,
  Sun,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { FeatureTip } from '@/components/tour/FeatureTip';
import { TourPrompt } from '@/components/tour';

// Types
type ApiKeyService = 'OpenAI' | 'Browserbase' | 'GoHighLevel' | 'Custom';
type ApiKeyStatus = 'valid' | 'invalid' | 'untested';

interface ApiKey {
  id: string;
  service: ApiKeyService;
  name: string;
  key: string;
  status: ApiKeyStatus;
  createdAt: Date;
  lastTested?: Date;
}

type IntegrationProvider = 'Google' | 'Gmail' | 'Outlook' | 'Facebook' | 'Instagram' | 'LinkedIn';

interface OAuthIntegration {
  id: string;
  provider: IntegrationProvider;
  connected: boolean;
  lastSynced?: Date;
  scopes: string[];
  email?: string;
}

type WebhookEventType = 'form_submission' | 'support_request' | 'task_completed';

interface Webhook {
  id: string;
  name: string;
  url: string;
  eventTypes: WebhookEventType[];
  active: boolean;
  signingSecret: string;
  description?: string;
  recentDeliveries: {
    success: number;
    failure: number;
  };
  createdAt: Date;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  status: 'success' | 'failure';
  statusCode?: number;
  timestamp: Date;
  eventType: WebhookEventType;
  error?: string;
}

interface Preferences {
  defaultBrowser: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

// Integration Icons & Colors
const integrationConfig: Record<IntegrationProvider, { icon: string; color: string }> = {
  Google: { icon: '🔍', color: 'bg-blue-500' },
  Gmail: { icon: '📧', color: 'bg-red-500' },
  Outlook: { icon: '📨', color: 'bg-blue-600' },
  Facebook: { icon: '📘', color: 'bg-blue-700' },
  Instagram: { icon: '📷', color: 'bg-pink-500' },
  LinkedIn: { icon: '💼', color: 'bg-blue-800' },
};

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('api-keys');
  const { openPopup } = useOAuthPopup();

  // tRPC Queries
  const { data: apiKeysData, refetch: refetchApiKeys } = trpc.settings.listApiKeys.useQuery();
  const { data: integrationsData, refetch: refetchIntegrations } = trpc.settings.listIntegrations.useQuery();
  const { data: webhooksData, refetch: refetchWebhooks } = trpc.settings.listWebhooks.useQuery();
  const { data: preferencesData, refetch: refetchPreferences } = trpc.settings.getPreferences.useQuery();

  // Mutations
  const saveApiKeyMutation = trpc.settings.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key saved successfully');
      setIsApiKeyDialogOpen(false);
      refetchApiKeys();
    },
    onError: (error) => toast.error(`Failed to save API key: ${error.message}`),
  });

  const deleteApiKeyMutation = trpc.settings.deleteApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key deleted');
      setDeleteApiKeyId(null);
      refetchApiKeys();
    },
    onError: (error) => toast.error(`Failed to delete API key: ${error.message}`),
  });

  const testApiKeyMutation = trpc.settings.testApiKey.useMutation({
    onSuccess: (data) => {
      if (data.isValid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      refetchApiKeys();
    },
    onError: (error) => toast.error(`Test failed: ${error.message}`),
  });

  const initiateOAuthMutation = trpc.settings.initiateOAuth.useMutation({
    onSuccess: (data) => {
      // Use popup instead of redirect
      openPopup({
        url: data.authorizationUrl,
        onSuccess: (oauthData) => {
          toast.success('Successfully connected!');
          refetchIntegrations();
        },
        onError: (error) => {
          toast.error(`OAuth failed: ${error}`);
        },
        onClose: () => {
          // User closed the popup
          setConnectingProvider(null);
        },
      });
    },
    onError: (error) => toast.error(`Failed to initiate OAuth: ${error.message}`),
  });

  const disconnectIntegrationMutation = trpc.settings.disconnectIntegration.useMutation({
    onSuccess: () => {
      toast.success('Integration disconnected');
      refetchIntegrations();
    },
    onError: (error) => toast.error(`Failed to disconnect: ${error.message}`),
  });

  const createWebhookMutation = trpc.settings.createWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook created');
      setIsWebhookDialogOpen(false);
      refetchWebhooks();
    },
    onError: (error) => toast.error(`Failed to create webhook: ${error.message}`),
  });

  const deleteWebhookMutation = trpc.settings.deleteWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook deleted');
      setDeleteWebhookId(null);
      refetchWebhooks();
    },
    onError: (error) => toast.error(`Failed to delete webhook: ${error.message}`),
  });

  const testWebhookMutation = trpc.settings.testWebhook.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => toast.error(`Test failed: ${error.message}`),
  });

  const updatePreferencesMutation = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success('Preferences updated');
      refetchPreferences();
    },
    onError: (error) => toast.error(`Failed to update preferences: ${error.message}`),
  });

  // API Keys State
  const apiKeys = apiKeysData?.apiKeys || [];
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [newApiKey, setNewApiKey] = useState({
    service: 'OpenAI' as ApiKeyService,
    name: '',
    key: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [deleteApiKeyId, setDeleteApiKeyId] = useState<string | null>(null);

  // OAuth Integrations State
  const integrations = integrationsData?.integrations || [];
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<IntegrationProvider | null>(null);

  // Webhooks State
  const webhooks = webhooksData?.webhooks || [];
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    eventTypes: [] as WebhookEventType[],
    description: '',
  });
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [showWebhookLogs, setShowWebhookLogs] = useState(false);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([
    {
      id: '1',
      webhookId: '1',
      status: 'success',
      statusCode: 200,
      timestamp: new Date(),
      eventType: 'form_submission',
    },
    {
      id: '2',
      webhookId: '1',
      status: 'failure',
      statusCode: 500,
      timestamp: new Date(Date.now() - 3600000),
      eventType: 'form_submission',
      error: 'Connection timeout',
    },
  ]);

  // Preferences State
  const [preferences, setPreferences] = useState<Preferences>({
    defaultBrowser: 'chromium',
    emailNotifications: true,
    inAppNotifications: true,
    timezone: 'America/New_York',
    theme: 'dark',
  });

  // Plan limits from API response
  const webhookLimit = webhooksData?.planLimits?.maxWebhooks || 10;
  const canCreateWebhook = webhooksData?.canCreateMore ?? (webhooks.length < webhookLimit);

  // API Key Handlers
  const handleAddApiKey = () => {
    setEditingApiKey(null);
    setNewApiKey({ service: 'OpenAI', name: '', key: '' });
    setIsApiKeyDialogOpen(true);
  };

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey);
    setNewApiKey({
      service: apiKey.service,
      name: apiKey.name,
      key: apiKey.key,
    });
    setIsApiKeyDialogOpen(true);
  };

  const handleSaveApiKey = async () => {
    await saveApiKeyMutation.mutateAsync({
      service: newApiKey.service.toLowerCase() as any,
      apiKey: newApiKey.key,
      label: newApiKey.name,
    });
  };

  const handleTestApiKey = async (service: string) => {
    setTestingApiKey(true);
    await testApiKeyMutation.mutateAsync({ service: service.toLowerCase() as any });
    setTestingApiKey(false);
  };

  const handleDeleteApiKey = async (service: string) => {
    await deleteApiKeyMutation.mutateAsync({ service: service.toLowerCase() as any });
    setDeleteApiKeyId(null);
  };

  // OAuth Handlers
  const handleConnectOAuth = async (provider: IntegrationProvider) => {
    setConnectingProvider(provider);
    await initiateOAuthMutation.mutateAsync({ provider: provider.toLowerCase() as any });
  };

  const handleDisconnectOAuth = async (provider: IntegrationProvider) => {
    const integration = integrations.find((i: any) => i.service === provider.toLowerCase());
    if (integration) {
      await disconnectIntegrationMutation.mutateAsync({ integrationId: integration.id });
    }
    setDisconnectProvider(null);
  };

  // Webhook Handlers
  const handleAddWebhook = () => {
    if (!canCreateWebhook) {
      toast.error('Webhook limit reached. Upgrade your plan to add more webhooks.');
      return;
    }
    setEditingWebhook(null);
    setNewWebhook({ name: '', url: '', eventTypes: [], description: '' });
    setIsWebhookDialogOpen(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setNewWebhook({
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      description: webhook.description || '',
    });
    setIsWebhookDialogOpen(true);
  };

  const handleSaveWebhook = async () => {
    await createWebhookMutation.mutateAsync({
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.eventTypes as any[],
      description: newWebhook.description,
    });
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    // Note: The API doesn't have a toggle endpoint, so we'd use update
    toast.info('Webhook toggle feature will be added soon');
  };

  const handleTestWebhook = async (id: string) => {
    setTestingWebhook(id);
    await testWebhookMutation.mutateAsync({ id });
    setTestingWebhook(null);
  };

  const handleDeleteWebhook = async (id: string) => {
    await deleteWebhookMutation.mutateAsync({ id });
  };

  const handleCopySigningSecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Signing secret copied to clipboard');
  };

  // Preferences Handlers
  const handleSavePreferences = async () => {
    await updatePreferencesMutation.mutateAsync({
      theme: preferences.theme,
      notifications: {
        email: preferences.emailNotifications,
        inApp: preferences.inAppNotifications,
      },
      defaultBrowserConfig: {
        browser: preferences.defaultBrowser,
        timezone: preferences.timezone,
      },
    });
  };

  const handleResetPreferences = () => {
    setPreferences({
      defaultBrowser: 'chromium',
      emailNotifications: true,
      inAppNotifications: true,
      timezone: 'America/New_York',
      theme: 'dark',
    });
    toast.success('Preferences reset to defaults');
  };

  const getStatusBadge = (status: ApiKeyStatus) => {
    switch (status) {
      case 'valid':
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Valid
          </Badge>
        );
      case 'invalid':
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Invalid
          </Badge>
        );
      case 'untested':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Untested
          </Badge>
        );
    }
  };

  const maskApiKey = (key: string) => {
    const prefix = key.substring(0, key.indexOf('-') + 1);
    const suffix = key.substring(key.length - 6);
    return `${prefix}...${suffix}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-6 px-6 py-4 mb-4" data-tour="settings-header">
          <Breadcrumb
            items={[
              { label: 'Settings' },
            ]}
          />
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-blue-400" />
                Settings
              </h1>
              <p className="text-slate-400 mt-1">Manage your API keys, integrations, and preferences</p>
            </div>
          </div>
        </header>

        <TourPrompt tourId="settings" featureName="Settings" />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800" data-tour="settings-tabs">
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="oauth" className="gap-2">
              <Link2 className="w-4 h-4" />
              OAuth Integrations
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <Card className="bg-slate-900/50 border-slate-800" data-tour="settings-api-keys">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-white">API Keys</CardTitle>
                      <FeatureTip
                        tipId="settings-api-keys"
                        title="API Keys"
                        content="API keys are required to connect third-party services like OpenAI for AI features, Browserbase for automation, and GoHighLevel for CRM integration."
                        dismissible={true}
                      />
                    </div>
                    <CardDescription>Manage your service API keys for OpenAI, Browserbase, and more</CardDescription>
                  </div>
                  <Button onClick={handleAddApiKey} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Service</TableHead>
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Key</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                      <TableHead className="text-slate-400">Last Tested</TableHead>
                      <TableHead className="text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey: any) => (
                      <TableRow key={apiKey.service} className="border-slate-800">
                        <TableCell className="font-medium text-white">{apiKey.service}</TableCell>
                        <TableCell className="text-slate-300">{apiKey.service}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-400">
                          {apiKey.maskedKey}
                        </TableCell>
                        <TableCell>{apiKey.isConfigured ? <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Configured</Badge> : <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><AlertCircle className="w-3 h-3 mr-1" />Not Set</Badge>}</TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(apiKey.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          Never
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestApiKey(apiKey.service)}
                              className="text-slate-400 hover:text-white"
                            >
                              Test
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteApiKeyId(apiKey.service)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OAuth Integrations Tab */}
          <TabsContent value="oauth">
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
                              <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center text-2xl`}>
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
                              onClick={() => setDisconnectProvider(providerName)}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleConnectOAuth(providerName)}
                              disabled={connectingProvider === providerName}
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
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Webhooks</CardTitle>
                    <CardDescription>
                      Configure webhooks to receive real-time event notifications
                    </CardDescription>
                    <div className="mt-2">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {webhooks.length} of {webhookLimit} webhooks used
                      </Badge>
                      {!canCreateWebhook && (
                        <p className="text-xs text-yellow-500 mt-2">
                          You've reached your webhook limit. Upgrade to add more.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowWebhookLogs(true)}
                      className="border-slate-700"
                    >
                      View Logs
                    </Button>
                    <Button
                      onClick={handleAddWebhook}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!canCreateWebhook}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Webhook
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">URL</TableHead>
                      <TableHead className="text-slate-400">Event Types</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Deliveries</TableHead>
                      <TableHead className="text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">
                          <div>
                            {webhook.name}
                            {webhook.description && (
                              <p className="text-xs text-slate-400 mt-1">{webhook.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-400 max-w-xs truncate">
                          {webhook.url}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(webhook.eventTypes || webhook.events || []).map((event: any) => (
                              <Badge
                                key={event}
                                variant="outline"
                                className="text-xs bg-slate-700/50 border-slate-600"
                              >
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.active}
                              onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                            />
                            <span className="text-sm text-slate-400">
                              {webhook.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-green-400">
                              ✓ {webhook.recentDeliveries.success} success
                            </div>
                            {webhook.recentDeliveries.failure > 0 && (
                              <div className="text-sm text-red-400">
                                ✗ {webhook.recentDeliveries.failure} failed
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestWebhook(webhook.id)}
                              disabled={testingWebhook === webhook.id}
                              className="text-slate-400 hover:text-white"
                            >
                              {testingWebhook === webhook.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                'Test'
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWebhook(webhook)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteWebhookId(webhook.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Browser Configuration */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Default Browser
                  </Label>
                  <Select
                    value={preferences.defaultBrowser}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, defaultBrowser: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chromium">Chromium</SelectItem>
                      <SelectItem value="firefox">Firefox</SelectItem>
                      <SelectItem value="webkit">WebKit (Safari)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timezone
                  </Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    {preferences.theme === 'dark' ? (
                      <Moon className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                    Theme
                  </Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') =>
                      setPreferences({ ...preferences, theme: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notifications */}
                <div className="space-y-4">
                  <Label className="text-white flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </Label>
                  <div className="space-y-3 pl-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">Email Notifications</p>
                        <p className="text-xs text-slate-400">Receive updates via email</p>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, emailNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">In-App Notifications</p>
                        <p className="text-xs text-slate-400">Show notifications in the app</p>
                      </div>
                      <Switch
                        checked={preferences.inAppNotifications}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, inAppNotifications: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Save Preferences
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetPreferences}
                    className="border-slate-700"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingApiKey ? 'Edit API Key' : 'Add API Key'}</DialogTitle>
            <DialogDescription>
              {editingApiKey
                ? 'Update your API key configuration'
                : 'Add a new API key for third-party services'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={newApiKey.service}
                onValueChange={(value: ApiKeyService) =>
                  setNewApiKey({ ...newApiKey, service: value })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Browserbase">Browserbase</SelectItem>
                  <SelectItem value="GoHighLevel">GoHighLevel (Agency API)</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Production OpenAI"
                value={newApiKey.name}
                onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-proj-..."
                  value={newApiKey.key}
                  onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
                  className="bg-slate-800 border-slate-700 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApiKeyDialogOpen(false)}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTestApiKey(newApiKey.service)}
              disabled={testingApiKey || !newApiKey.key}
              className="border-blue-600 text-blue-400"
            >
              {testingApiKey ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test'
              )}
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={!newApiKey.name || !newApiKey.key}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingApiKey ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
            <DialogDescription>
              {editingWebhook
                ? 'Update webhook configuration'
                : 'Configure a new webhook endpoint'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Form Submissions"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://api.example.com/webhooks"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
              <p className="text-xs text-slate-400">Must be a valid HTTPS URL</p>
            </div>
            <div className="space-y-2">
              <Label>Event Types</Label>
              <div className="space-y-2">
                {['form_submission', 'support_request', 'task_completed'].map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={event}
                      checked={newWebhook.eventTypes.includes(event as WebhookEventType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewWebhook({
                            ...newWebhook,
                            eventTypes: [...newWebhook.eventTypes, event as WebhookEventType],
                          });
                        } else {
                          setNewWebhook({
                            ...newWebhook,
                            eventTypes: newWebhook.eventTypes.filter((t) => t !== event),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800"
                    />
                    <label htmlFor={event} className="text-sm text-slate-300">
                      {event.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe what this webhook is used for..."
                value={newWebhook.description}
                onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                className="bg-slate-800 border-slate-700"
                rows={3}
              />
            </div>
            {editingWebhook && (
              <div className="space-y-2">
                <Label>Signing Secret</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingWebhook.signingSecret}
                    readOnly
                    className="bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleCopySigningSecret(editingWebhook.signingSecret)}
                    className="border-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Use this secret to verify webhook signatures
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWebhookDialogOpen(false)}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWebhook}
              disabled={
                !newWebhook.name ||
                !newWebhook.url ||
                newWebhook.eventTypes.length === 0 ||
                !newWebhook.url.startsWith('https://')
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingWebhook ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Logs Dialog */}
      <Dialog open={showWebhookLogs} onOpenChange={setShowWebhookLogs}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Webhook Delivery Logs</DialogTitle>
            <DialogDescription>Recent webhook delivery attempts and their status</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Timestamp</TableHead>
                  <TableHead className="text-slate-400">Webhook</TableHead>
                  <TableHead className="text-slate-400">Event Type</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookDeliveries.map((delivery) => {
                  const webhook = webhooks.find((w) => w.id === delivery.webhookId);
                  return (
                    <TableRow key={delivery.id} className="border-slate-800">
                      <TableCell className="text-slate-400 text-sm">
                        {delivery.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white">{webhook?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-700/50 border-slate-600">
                          {delivery.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {delivery.status === 'success' ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {delivery.statusCode}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            {delivery.statusCode || 'Failed'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {delivery.error || 'Delivered successfully'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Confirmation */}
      <AlertDialog
        open={deleteApiKeyId !== null}
        onOpenChange={() => setDeleteApiKeyId(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone and may
              break integrations using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteApiKeyId && handleDeleteApiKey(deleteApiKeyId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Webhook Confirmation */}
      <AlertDialog
        open={deleteWebhookId !== null}
        onOpenChange={() => setDeleteWebhookId(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? You will stop receiving events at this
              endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWebhookId && handleDeleteWebhook(deleteWebhookId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnect OAuth Confirmation */}
      <AlertDialog
        open={disconnectProvider !== null}
        onOpenChange={() => setDisconnectProvider(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectProvider}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your {disconnectProvider} account? This will
              disable any automations using this integration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectProvider && handleDisconnectOAuth(disconnectProvider)}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
