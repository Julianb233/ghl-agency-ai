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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Types based on database schema
interface FeatureFlag {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  userWhitelist: number[] | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemConfig {
  id: number;
  key: string;
  value: any;
  description: string | null;
  updatedBy: number | null;
  updatedAt: Date;
}

export const ConfigCenter: React.FC = () => {
  const utils = trpc.useUtils();

  // Feature Flags Query
  const { data: flagsData, isLoading: flagsLoading } = trpc.admin.config.flags.list.useQuery();
  const featureFlags = flagsData?.flags || [];

  // System Configs Query
  const { data: configsData, isLoading: configsLoading } = trpc.admin.config.config.list.useQuery();
  const systemConfigs = configsData?.configs || [];

  // Maintenance Mode Query
  const { data: maintenanceData, isLoading: maintenanceLoading } = trpc.admin.config.maintenance.get.useQuery();
  const maintenanceMode = maintenanceData?.enabled || false;

  // Feature Flag Mutations
  const createFlagMutation = trpc.admin.config.flags.create.useMutation({
    onSuccess: () => {
      utils.admin.config.flags.list.invalidate();
      toast.success('Feature flag created successfully');
      setIsFlagDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create feature flag');
    },
  });

  const updateFlagMutation = trpc.admin.config.flags.update.useMutation({
    onSuccess: () => {
      utils.admin.config.flags.list.invalidate();
      toast.success('Feature flag updated successfully');
      setIsFlagDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update feature flag');
    },
  });

  const deleteFlagMutation = trpc.admin.config.flags.delete.useMutation({
    onSuccess: () => {
      utils.admin.config.flags.list.invalidate();
      toast.success('Feature flag deleted');
      setDeleteFlagId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete feature flag');
    },
  });

  const toggleFlagMutation = trpc.admin.config.flags.toggle.useMutation({
    onSuccess: (data) => {
      utils.admin.config.flags.list.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to toggle feature flag');
      // Revert optimistic update on error
      utils.admin.config.flags.list.invalidate();
    },
  });

  // System Config Mutations
  const upsertConfigMutation = trpc.admin.config.config.upsert.useMutation({
    onSuccess: () => {
      utils.admin.config.config.list.invalidate();
      toast.success('Configuration saved successfully');
      setIsConfigDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save configuration');
    },
  });

  const deleteConfigMutation = trpc.admin.config.config.delete.useMutation({
    onSuccess: () => {
      utils.admin.config.config.list.invalidate();
      toast.success('Configuration deleted');
      setDeleteConfigKey(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete configuration');
    },
  });

  // Maintenance Mode Mutation
  const setMaintenanceMutation = trpc.admin.config.maintenance.set.useMutation({
    onSuccess: (data) => {
      utils.admin.config.maintenance.get.invalidate();
      if (data.enabled) {
        toast.warning('Maintenance mode enabled. Users will see a maintenance page.');
      } else {
        toast.success('Maintenance mode disabled. System is back online.');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update maintenance mode');
      // Revert optimistic update on error
      utils.admin.config.maintenance.get.invalidate();
    },
  });

  // Feature Flag Dialog State
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [newFlag, setNewFlag] = useState({
    name: '',
    description: '',
    enabled: true,
    rolloutPercentage: 100,
  });

  // System Config Dialog State
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    description: '',
    type: 'string' as 'string' | 'number' | 'boolean' | 'json',
  });

  // Delete Confirmation State
  const [deleteFlagId, setDeleteFlagId] = useState<number | null>(null);
  const [deleteConfigKey, setDeleteConfigKey] = useState<string | null>(null);

  // Handlers - Maintenance Mode
  const handleMaintenanceModeToggle = (checked: boolean) => {
    // Optimistic update
    utils.admin.config.maintenance.get.setData(undefined, (old) => ({
      enabled: checked,
      message: old?.message || null,
    }));

    setMaintenanceMutation.mutate({ enabled: checked });
  };

  // Handlers - Feature Flags
  const handleAddFlag = () => {
    setEditingFlag(null);
    setNewFlag({
      name: '',
      description: '',
      enabled: true,
      rolloutPercentage: 100,
    });
    setIsFlagDialogOpen(true);
  };

  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setNewFlag({
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
    });
    setIsFlagDialogOpen(true);
  };

  const handleSaveFlag = () => {
    if (editingFlag) {
      updateFlagMutation.mutate({
        id: editingFlag.id,
        name: newFlag.name,
        description: newFlag.description || undefined,
        enabled: newFlag.enabled,
        rolloutPercentage: newFlag.rolloutPercentage,
      });
    } else {
      createFlagMutation.mutate({
        name: newFlag.name,
        description: newFlag.description || undefined,
        enabled: newFlag.enabled,
        rolloutPercentage: newFlag.rolloutPercentage,
      });
    }
  };

  const handleToggleFlag = (id: number, enabled: boolean) => {
    // Optimistic update
    utils.admin.config.flags.list.setData(undefined, (old) => {
      if (!old) return old;
      return {
        ...old,
        flags: old.flags.map((flag) =>
          flag.id === id ? { ...flag, enabled, updatedAt: new Date() } : flag
        ),
      };
    });

    toggleFlagMutation.mutate({ id, enabled });
  };

  const handleDeleteFlag = (id: number) => {
    deleteFlagMutation.mutate({ id });
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
    setEditingConfig(config);

    // Determine type from value
    let type: 'string' | 'number' | 'boolean' | 'json' = 'string';
    let displayValue = '';

    if (typeof config.value === 'object' && config.value !== null) {
      type = 'json';
      displayValue = JSON.stringify(config.value, null, 2);
    } else if (typeof config.value === 'boolean') {
      type = 'boolean';
      displayValue = String(config.value);
    } else if (typeof config.value === 'number') {
      type = 'number';
      displayValue = String(config.value);
    } else {
      displayValue = String(config.value);
    }

    setNewConfig({
      key: config.key,
      value: displayValue,
      description: config.description || '',
      type,
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    // Parse value based on type
    let parsedValue: any = newConfig.value;

    try {
      if (newConfig.type === 'json') {
        parsedValue = JSON.parse(newConfig.value);
      } else if (newConfig.type === 'number') {
        parsedValue = Number(newConfig.value);
        if (isNaN(parsedValue)) {
          toast.error('Invalid number format');
          return;
        }
      } else if (newConfig.type === 'boolean') {
        parsedValue = newConfig.value === 'true';
      }
    } catch (e) {
      toast.error('Invalid value format');
      return;
    }

    upsertConfigMutation.mutate({
      key: newConfig.key,
      value: parsedValue,
      description: newConfig.description || undefined,
    });
  };

  const handleDeleteConfig = (key: string) => {
    deleteConfigMutation.mutate({ key });
  };

  const getTypeBadge = (value: any) => {
    let type = 'string';
    if (typeof value === 'object' && value !== null) type = 'json';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (typeof value === 'number') type = 'number';

    const colors: Record<string, string> = {
      string: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      number: 'bg-green-500/20 text-green-500 border-green-500/30',
      boolean: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      json: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const isLoading = flagsLoading || configsLoading || maintenanceLoading;

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
                  disabled={setMaintenanceMutation.isPending}
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
            {flagsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : featureFlags.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No feature flags yet. Create your first one!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Description</TableHead>
                    <TableHead className="text-slate-400">Rollout</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Updated</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureFlags.map((flag) => (
                    <TableRow key={flag.id} className="border-slate-800">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{flag.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyFlagKey(flag.name)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-xs truncate">
                        {flag.description || '-'}
                      </TableCell>
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
                            disabled={toggleFlagMutation.isPending}
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
                        {new Date(flag.updatedAt).toLocaleDateString()}
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
            )}
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
            {configsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : systemConfigs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No system configurations yet. Create your first one!
              </div>
            ) : (
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
                        {typeof config.value === 'object' && config.value !== null ? (
                          <div className="max-w-md">
                            <code className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono block overflow-x-auto whitespace-pre">
                              {formatValue(config.value)}
                            </code>
                          </div>
                        ) : (
                          <code className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                            {String(config.value)}
                          </code>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-xs">
                        {config.description || '-'}
                      </TableCell>
                      <TableCell>{getTypeBadge(config.value)}</TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(config.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
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
                            onClick={() => setDeleteConfigKey(config.key)}
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
            )}
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
              <Label className="text-white">Description</Label>
              <Textarea
                placeholder="Describe what this feature flag controls..."
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
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
              disabled={!newFlag.name || createFlagMutation.isPending || updateFlagMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {(createFlagMutation.isPending || updateFlagMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
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
              disabled={!newConfig.key || !newConfig.value || upsertConfigMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {upsertConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
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
              disabled={deleteFlagMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFlagMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete System Config Confirmation */}
      <AlertDialog open={deleteConfigKey !== null} onOpenChange={() => setDeleteConfigKey(null)}>
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
              onClick={() => deleteConfigKey && handleDeleteConfig(deleteConfigKey)}
              disabled={deleteConfigMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};
