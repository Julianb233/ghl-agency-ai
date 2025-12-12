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
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  eventTypes?: string[];
  events?: string[];
  active: boolean;
  description?: string;
  recentDeliveries: {
    success: number;
    failure: number;
  };
}

interface WebhooksTabProps {
  webhooks: Webhook[];
  webhookLimit: number;
  canCreateWebhook: boolean;
  testingWebhook: string | null;
  onAddWebhook: () => void;
  onEditWebhook: (webhook: Webhook) => void;
  onToggleWebhook: (id: string, active: boolean) => void;
  onTestWebhook: (id: string) => void;
  onDeleteWebhook: (id: string) => void;
  onViewLogs: () => void;
}

export const WebhooksTab = React.memo<WebhooksTabProps>(({
  webhooks,
  webhookLimit,
  canCreateWebhook,
  testingWebhook,
  onAddWebhook,
  onEditWebhook,
  onToggleWebhook,
  onTestWebhook,
  onDeleteWebhook,
  onViewLogs,
}) => {
  return (
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
              onClick={onViewLogs}
              className="border-slate-700"
            >
              View Logs
            </Button>
            <Button
              onClick={onAddWebhook}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!canCreateWebhook}
              aria-label="Add new webhook"
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
                      onCheckedChange={(checked) => onToggleWebhook(webhook.id, checked)}
                      aria-label={`Toggle ${webhook.name} webhook`}
                    />
                    <span className="text-sm text-slate-400">
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1" role="status" aria-label={`${webhook.name} delivery statistics`}>
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
                      onClick={() => onTestWebhook(webhook.id)}
                      disabled={testingWebhook === webhook.id}
                      className="text-slate-400 hover:text-white"
                      aria-label={`Test ${webhook.name} webhook`}
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
                      onClick={() => onEditWebhook(webhook)}
                      className="text-slate-400 hover:text-white"
                      aria-label={`Edit ${webhook.name} webhook`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteWebhook(webhook.id)}
                      className="text-red-400 hover:text-red-300"
                      aria-label={`Delete ${webhook.name} webhook`}
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

WebhooksTab.displayName = 'WebhooksTab';
