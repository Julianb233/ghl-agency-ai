import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Settings,
  Flag,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Code,
  Sliders,
  Power,
  Save,
  X,
  Copy,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environment: 'development' | 'staging' | 'production' | 'all';
  createdAt: Date;
  updatedAt: Date;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  isEditable: boolean;
  updatedAt: Date;
}

// Mock Data
const mockFeatureFlags: FeatureFlag[] = [
  {
    id: '1',
    name: 'AI Assistant',
    key: 'ai_assistant_enabled',
    description: 'Enable AI-powered assistant for client interactions',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'production',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Advanced Analytics',
    key: 'advanced_analytics',
    description: 'Enable advanced analytics dashboard and reporting features',
    enabled: true,
    rolloutPercentage: 75,
    environment: 'production',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Webhook Integration',
    key: 'webhook_integration',
    description: 'Allow users to configure custom webhooks for events',
    enabled: false,
    rolloutPercentage: 0,
    environment: 'staging',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '4',
    name: 'Multi-language Support',
    key: 'multi_language',
    description: 'Enable multi-language support for the application',
    enabled: false,
    rolloutPercentage: 10,
    environment: 'development',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-05'),
  },
];

const mockSystemConfigs: SystemConfig[] = [
  {
    id: '1',
    key: 'max_upload_size',
    value: '10485760',
    description: 'Maximum file upload size in bytes (10MB)',
    type: 'number',
    isEditable: true,
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    key: 'session_timeout',
    value: '3600',
    description: 'Session timeout in seconds (1 hour)',
    type: 'number',
    isEditable: true,
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    key: 'api_rate_limit',
    value: '{"requests": 100, "window": "1m"}',
    description: 'API rate limiting configuration',
    type: 'json',
    isEditable: true,
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    key: 'smtp_settings',
    value: '{"host": "smtp.example.com", "port": 587, "secure": true}',
    description: 'SMTP server configuration for email',
    type: 'json',
    isEditable: true,
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '5',
    key: 'enable_debug_mode',
    value: 'false',
    description: 'Enable debug logging and error details',
    type: 'boolean',
    isEditable: true,
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '6',
    key: 'application_version',
    value: '1.2.3',
    description: 'Current application version',
    type: 'string',
    isEditable: false,
    updatedAt: new Date('2024-03-01'),
  },
];

export const ConfigCenter: React.FC = () => {
  // State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>(mockSystemConfigs);

  // Feature Flag Dialog State
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [newFlag, setNewFlag] = useState({
    name: '',
    key: '',
    description: '',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'production' as const,
  });

  // System Config Dialog State
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    description: '',
    type: 'string' as const,
  });

  // Delete Confirmation State
  const [deleteFlagId, setDeleteFlagId] = useState<string | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

  // Handlers - Maintenance Mode
  const handleMaintenanceModeToggle = (checked: boolean) => {
    setMaintenanceMode(checked);
    if (checked) {
      toast.warning('Maintenance mode enabled. Users will see a maintenance page.');
    } else {
      toast.success('Maintenance mode disabled. System is back online.');
    }
  };

  // Handlers - Feature Flags
  const handleAddFlag = () => {
    setEditingFlag(null);
    setNewFlag({
      name: '',
      key: '',
      description: '',
      enabled: true,
      rolloutPercentage: 100,
      environment: 'production',
    });
    setIsFlagDialogOpen(true);
  };

  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setNewFlag({
      name: flag.name,
      key: flag.key,
      description: flag.description,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      environment: flag.environment,
    });
    setIsFlagDialogOpen(true);
  };

  const handleSaveFlag = () => {
    if (editingFlag) {
      setFeatureFlags(
        featureFlags.map((flag) =>
          flag.id === editingFlag.id
            ? { ...flag, ...newFlag, updatedAt: new Date() }
            : flag
        )
      );
      toast.success('Feature flag updated successfully');
    } else {
      const newFlagObj: FeatureFlag = {
        id: String(featureFlags.length + 1),
        ...newFlag,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setFeatureFlags([...featureFlags, newFlagObj]);
      toast.success('Feature flag created successfully');
    }
    setIsFlagDialogOpen(false);
  };

  const handleToggleFlag = (id: string, enabled: boolean) => {
    setFeatureFlags(
      featureFlags.map((flag) =>
        flag.id === id ? { ...flag, enabled, updatedAt: new Date() } : flag
      )
    );
    toast.success(`Feature flag ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleDeleteFlag = (id: string) => {
    setFeatureFlags(featureFlags.filter((flag) => flag.id !== id));
    setDeleteFlagId(null);
    toast.success('Feature flag deleted');
  };

  const handleCopyFlagKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Flag key copied to clipboard');
  };

  // Handlers - System Config
  const handleAddConfig = () => {
    setEditingConfig(null);
    setNewConfig({
      key: '',
      value: '',
      description: '',
      type: 'string',
    });
    setIsConfigDialogOpen(true);
  };

  const handleEditConfig = (config: SystemConfig) => {
    if (!config.isEditable) {
      toast.error('This configuration is read-only');
      return;
    }
    setEditingConfig(config);
    setNewConfig({
      key: config.key,
      value: config.value,
      description: config.description,
      type: config.type,
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    // Validate JSON if type is json
    if (newConfig.type === 'json') {
      try {
        JSON.parse(newConfig.value);
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }
    }

    if (editingConfig) {
      setSystemConfigs(
        systemConfigs.map((config) =>
          config.id === editingConfig.id
            ? { ...config, ...newConfig, updatedAt: new Date() }
            : config
        )
      );
      toast.success('Configuration updated successfully');
    } else {
      const newConfigObj: SystemConfig = {
        id: String(systemConfigs.length + 1),
        ...newConfig,
        isEditable: true,
        updatedAt: new Date(),
      };
      setSystemConfigs([...systemConfigs, newConfigObj]);
      toast.success('Configuration created successfully');
    }
    setIsConfigDialogOpen(false);
  };

  const handleDeleteConfig = (id: string) => {
    setSystemConfigs(systemConfigs.filter((config) => config.id !== id));
    setDeleteConfigId(null);
    toast.success('Configuration deleted');
  };

  const getEnvironmentBadge = (environment: FeatureFlag['environment']) => {
    const colors = {
      development: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      staging: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      production: 'bg-green-500/20 text-green-500 border-green-500/30',
      all: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    };
    return <Badge className={colors[environment]}>{environment}</Badge>;
  };

  const getTypeBadge = (type: SystemConfig['type']) => {
    const colors = {
      string: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      number: 'bg-green-500/20 text-green-500 border-green-500/30',
      boolean: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      json: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  const formatValue = (value: string, type: SystemConfig['type']) => {
    if (type === 'json') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-indigo-400" />
            Configuration Center
          </h2>
          <p className="text-slate-400 mt-1">
            Manage feature flags, system configuration, and maintenance mode
          </p>
        </div>

        {/* Maintenance Mode Card - Prominent at Top */}
        <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-orange-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-600/20">
                  <Power className="h-7 w-7 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Maintenance Mode</h3>
                  <p className="text-slate-300 text-sm mt-1">
                    {maintenanceMode
                      ? 'System is currently under maintenance. Users will see a maintenance page.'
                      : 'System is operational. Toggle to enable maintenance mode.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {maintenanceMode && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-lg px-4 py-2">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Active
                  </Badge>
                )}
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={handleMaintenanceModeToggle}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Flag className="h-5 w-5 text-indigo-400" />
                  Feature Flags
                </CardTitle>
                <CardDescription>
                  Control feature availability and gradual rollout across environments
                </CardDescription>
              </div>
              <Button onClick={handleAddFlag} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Flag
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Key</TableHead>
                  <TableHead className="text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-400">Environment</TableHead>
                  <TableHead className="text-slate-400">Rollout</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Updated</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureFlags.map((flag) => (
                  <TableRow key={flag.id} className="border-slate-800">
                    <TableCell className="font-medium text-white">{flag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                          {flag.key}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyFlagKey(flag.key)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 max-w-xs truncate">
                      {flag.description}
                    </TableCell>
                    <TableCell>{getEnvironmentBadge(flag.environment)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Percent className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-300">{flag.rolloutPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) => handleToggleFlag(flag.id, checked)}
                        />
                        {flag.enabled ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {flag.updatedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFlag(flag)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteFlagId(flag.id)}
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

        {/* System Configuration Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-400" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Manage key-value configuration settings for the system
                </CardDescription>
              </div>
              <Button onClick={handleAddConfig} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Config
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Key</TableHead>
                  <TableHead className="text-slate-400">Value</TableHead>
                  <TableHead className="text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Updated</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemConfigs.map((config) => (
                  <TableRow key={config.id} className="border-slate-800">
                    <TableCell className="font-medium text-white">
                      <code className="px-2 py-1 rounded bg-slate-800 text-xs font-mono">
                        {config.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      {config.type === 'json' ? (
                        <div className="max-w-md">
                          <code className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono block overflow-x-auto whitespace-pre">
                            {formatValue(config.value, config.type)}
                          </code>
                        </div>
                      ) : (
                        <code className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                          {config.value}
                        </code>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300 max-w-xs">
                      {config.description}
                    </TableCell>
                    <TableCell>{getTypeBadge(config.type)}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {config.updatedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {config.isEditable ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditConfig(config)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfigId(config.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
                            Read-only
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flag Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-indigo-400" />
              {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </DialogTitle>
            <DialogDescription>
              {editingFlag
                ? 'Update the feature flag configuration'
                : 'Create a new feature flag to control feature availability'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Name</Label>
                <Input
                  placeholder="AI Assistant"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Key (slug)</Label>
                <Input
                  placeholder="ai_assistant_enabled"
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Textarea
                placeholder="Describe what this feature flag controls..."
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Environment</Label>
                <Select
                  value={newFlag.environment}
                  onValueChange={(value: any) => setNewFlag({ ...newFlag, environment: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="all">All Environments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Rollout Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newFlag.rolloutPercentage}
                    onChange={(e) =>
                      setNewFlag({
                        ...newFlag,
                        rolloutPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                      })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Percent className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div>
                <p className="text-sm font-medium text-white">Enable Flag</p>
                <p className="text-xs text-slate-400">
                  Controls whether this feature is active
                </p>
              </div>
              <Switch
                checked={newFlag.enabled}
                onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFlagDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveFlag}
              disabled={!newFlag.name || !newFlag.key}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingFlag ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Config Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-indigo-400" />
              {editingConfig ? 'Edit Configuration' : 'Create Configuration'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Update the system configuration value'
                : 'Add a new system configuration key-value pair'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Key</Label>
                <Input
                  placeholder="max_upload_size"
                  value={newConfig.key}
                  onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                  disabled={!!editingConfig}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Type</Label>
                <Select
                  value={newConfig.type}
                  onValueChange={(value: any) => setNewConfig({ ...newConfig, type: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Value</Label>
              {newConfig.type === 'json' ? (
                <Textarea
                  placeholder='{"key": "value"}'
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                  rows={6}
                />
              ) : (
                <Input
                  placeholder={
                    newConfig.type === 'number'
                      ? '100'
                      : newConfig.type === 'boolean'
                      ? 'true or false'
                      : 'value'
                  }
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              )}
              {newConfig.type === 'json' && (
                <p className="text-xs text-slate-400">Enter valid JSON format</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Textarea
                placeholder="Describe what this configuration controls..."
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!newConfig.key || !newConfig.value}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingConfig ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Flag Confirmation */}
      <AlertDialog open={deleteFlagId !== null} onOpenChange={() => setDeleteFlagId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature flag? This action cannot be undone and
              may affect application behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFlagId && handleDeleteFlag(deleteFlagId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete System Config Confirmation */}
      <AlertDialog open={deleteConfigId !== null} onOpenChange={() => setDeleteConfigId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this system configuration? This may cause system
              instability or unexpected behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfigId && handleDeleteConfig(deleteConfigId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};
