import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Key, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { FeatureTip } from '@/components/tour/FeatureTip';

interface ApiKeysTabProps {
  apiKeys: any[];
  onAddApiKey: () => void;
  onTestApiKey: (service: string) => void;
  onDeleteApiKey: (service: string) => void;
}

export const ApiKeysTab = React.memo<ApiKeysTabProps>(({
  apiKeys,
  onAddApiKey,
  onTestApiKey,
  onDeleteApiKey,
}) => {
  return (
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
          <Button onClick={onAddApiKey} className="bg-blue-600 hover:bg-blue-700">
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
                <TableCell>
                  {apiKey.isConfigured ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Set
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-slate-400">
                  {new Date(apiKey.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-slate-400">Never</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTestApiKey(apiKey.service)}
                      className="text-slate-400 hover:text-white"
                      aria-label={`Test ${apiKey.service} API key`}
                    >
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteApiKey(apiKey.service)}
                      className="text-red-400 hover:text-red-300"
                      aria-label={`Delete ${apiKey.service} API key`}
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
  );
});

ApiKeysTab.displayName = 'ApiKeysTab';
