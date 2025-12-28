import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Lock,
  Trash2,
  Edit,
  Plus,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Globe,
  User,
  Key,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { FeatureTip } from '@/components/tour/FeatureTip';

// Types
type CredentialType = 'password' | 'api_key' | 'oauth_token' | 'ssh_key';

interface Credential {
  id: number;
  name: string;
  service: string;
  type: CredentialType;
  domain?: string | null;
  username?: string | null;
  lastUsedAt?: string | null;
  useCount: number;
  createdAt: string;
}

interface CredentialFormData {
  name: string;
  service: string;
  type: CredentialType;
  domain: string;
  username: string;
  password: string;
  apiKey: string;
}

const credentialTypeConfig: Record<CredentialType, { label: string; icon: React.ElementType; color: string }> = {
  password: { label: 'Password', icon: Lock, color: 'bg-blue-500' },
  api_key: { label: 'API Key', icon: Key, color: 'bg-green-500' },
  oauth_token: { label: 'OAuth Token', icon: Shield, color: 'bg-purple-500' },
  ssh_key: { label: 'SSH Key', icon: Key, color: 'bg-orange-500' },
};

export const CredentialsTab: React.FC = () => {
  // State (declared first to avoid reference errors in queries)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [formData, setFormData] = useState<CredentialFormData>({
    name: '',
    service: '',
    type: 'password',
    domain: '',
    username: '',
    password: '',
    apiKey: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<number | null>(null);
  const [revealCredentialId, setRevealCredentialId] = useState<number | null>(null);

  // tRPC Queries
  const { data: credentialsData, refetch: refetchCredentials, isLoading } = trpc.security.listCredentials.useQuery({});

  const getCredentialQuery = trpc.security.getCredential.useQuery(
    { credentialId: revealCredentialId ?? 0 },
    { enabled: revealCredentialId !== null }
  );

  // tRPC Mutations
  const storeCredentialMutation = trpc.security.storeCredential.useMutation({
    onSuccess: () => {
      toast.success('Credential saved securely');
      setIsDialogOpen(false);
      resetForm();
      refetchCredentials();
    },
    onError: (error) => toast.error(`Failed to save credential: ${error.message}`),
  });

  const updateCredentialMutation = trpc.security.updateCredential.useMutation({
    onSuccess: () => {
      toast.success('Credential updated');
      setIsDialogOpen(false);
      resetForm();
      refetchCredentials();
    },
    onError: (error) => toast.error(`Failed to update credential: ${error.message}`),
  });

  const deleteCredentialMutation = trpc.security.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success('Credential deleted');
      setDeleteCredentialId(null);
      refetchCredentials();
    },
    onError: (error) => toast.error(`Failed to delete credential: ${error.message}`),
  });

  // Derived state
  const credentials = credentialsData || [];

  const resetForm = () => {
    setFormData({
      name: '',
      service: '',
      type: 'password',
      domain: '',
      username: '',
      password: '',
      apiKey: '',
    });
    setEditingCredential(null);
    setShowPassword(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (credential: {
    id: number;
    name: string;
    service: string;
    type: string;
    domain?: string | null;
    username?: string | null;
  }) => {
    setEditingCredential(credential as Credential);
    setFormData({
      name: credential.name,
      service: credential.service,
      type: credential.type as CredentialType,
      domain: credential.domain || '',
      username: credential.username || '',
      password: '',
      apiKey: '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const data: Record<string, string> = {};

    if (formData.type === 'password') {
      data.username = formData.username;
      data.password = formData.password;
    } else if (formData.type === 'api_key') {
      data.apiKey = formData.apiKey;
    }

    if (editingCredential) {
      await updateCredentialMutation.mutateAsync({
        credentialId: editingCredential.id,
        name: formData.name,
        service: formData.service,
        type: formData.type,
        domain: formData.domain || undefined,
        username: formData.username || undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      });
    } else {
      await storeCredentialMutation.mutateAsync({
        name: formData.name,
        service: formData.service,
        type: formData.type,
        domain: formData.domain || undefined,
        username: formData.username || undefined,
        data,
      });
    }
  };

  const handleDelete = async (id: number) => {
    await deleteCredentialMutation.mutateAsync({ credentialId: id });
  };

  const handleReveal = async (id: number) => {
    setRevealCredentialId(id);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getTypeConfig = (type: CredentialType) => {
    return credentialTypeConfig[type] || credentialTypeConfig.password;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800" data-tour="settings-credentials">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  Credential Vault
                </CardTitle>
                <FeatureTip
                  tipId="settings-credentials"
                  title="Secure Credential Storage"
                  content="Store login credentials, API keys, and tokens securely with AES-256 encryption. Browser agents can use these for auto-fill during automation tasks."
                  dismissible={true}
                />
              </div>
              <CardDescription>
                Securely store passwords and API keys for browser automation auto-fill
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No credentials stored</h3>
              <p className="text-slate-400 mb-4">
                Add your first credential to enable auto-fill during browser automation
              </p>
              <Button onClick={handleAdd} variant="outline" className="border-slate-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Credential
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Service</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Domain</TableHead>
                  <TableHead className="text-slate-400">Username</TableHead>
                  <TableHead className="text-slate-400">Used</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => {
                  const typeConfig = getTypeConfig(credential.type as CredentialType);
                  const TypeIcon = typeConfig.icon;
                  return (
                    <TableRow key={credential.id} className="border-slate-800">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
                            <TypeIcon className="w-4 h-4 text-white" />
                          </div>
                          {credential.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {credential.service}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-700/50 border-slate-600">
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {credential.domain ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {credential.domain}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {credential.username ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {credential.username}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {credential.useCount} times
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReveal(credential.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(credential)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCredentialId(credential.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Credential Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              {editingCredential ? 'Edit Credential' : 'Add Credential'}
            </DialogTitle>
            <DialogDescription>
              {editingCredential
                ? 'Update your stored credential'
                : 'Store a new credential securely with AES-256 encryption'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="My Gmail Account"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input
                  placeholder="gmail, ghl, stripe..."
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Credential Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CredentialType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">Password (Login)</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth_token">OAuth Token</SelectItem>
                  <SelectItem value="ssh_key">SSH Key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Domain (for auto-fill)
              </Label>
              <Input
                placeholder="app.gohighlevel.com"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
              <p className="text-xs text-slate-400">
                Browser agents will auto-fill this credential on matching domains
              </p>
            </div>

            {formData.type === 'password' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username / Email
                  </Label>
                  <Input
                    placeholder="user@example.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingCredential ? '(unchanged)' : 'Enter password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-slate-800 border-slate-700 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {formData.type === 'api_key' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingCredential ? '(unchanged)' : 'sk-...'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="bg-slate-800 border-slate-700 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div className="text-sm">
                  <p className="text-emerald-400 font-medium">Encrypted Storage</p>
                  <p className="text-slate-400">
                    Your credentials are encrypted with AES-256-GCM before storage
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.name ||
                !formData.service ||
                (!editingCredential && formData.type === 'password' && !formData.password) ||
                (!editingCredential && formData.type === 'api_key' && !formData.apiKey)
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {storeCredentialMutation.isPending || updateCredentialMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingCredential ? 'Update' : 'Save Securely'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal Credential Dialog */}
      <Dialog open={revealCredentialId !== null} onOpenChange={() => setRevealCredentialId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              View Credential
            </DialogTitle>
            <DialogDescription>
              Credential data is decrypted for viewing only
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {getCredentialQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : getCredentialQuery.data ? (
              <>
                {getCredentialQuery.data.data?.username && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">Username</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={getCredentialQuery.data.data.username}
                        readOnly
                        className="bg-slate-800 border-slate-700 font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToClipboard(getCredentialQuery.data?.data?.username ?? '', 'Username')}
                        className="border-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {getCredentialQuery.data.data?.password && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">Password</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={getCredentialQuery.data.data.password}
                        readOnly
                        className="bg-slate-800 border-slate-700 font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="border-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToClipboard(getCredentialQuery.data?.data?.password ?? '', 'Password')}
                        className="border-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {getCredentialQuery.data.data?.apiKey && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={getCredentialQuery.data.data.apiKey}
                        readOnly
                        className="bg-slate-800 border-slate-700 font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="border-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyToClipboard(getCredentialQuery.data?.data?.apiKey ?? '', 'API Key')}
                        className="border-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400">Failed to retrieve credential data</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRevealCredentialId(null)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteCredentialId !== null}
        onOpenChange={() => setDeleteCredentialId(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credential? This action cannot be undone.
              Browser agents will no longer be able to use this credential for auto-fill.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCredentialId && handleDelete(deleteCredentialId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
