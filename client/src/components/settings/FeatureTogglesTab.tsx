import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Bot,
  Network,
  Database,
  Globe,
  Bell,
  BookOpen,
  Key,
} from 'lucide-react';

interface FeatureToggles {
  aiAgentAutomation: boolean;
  swarmMode: boolean;
  memorySystem: boolean;
  browserAutomation: boolean;
  realtimeNotifications: boolean;
  knowledgeBase: boolean;
  apiAccess: boolean;
}

interface FeatureTogglesTabProps {
  features: FeatureToggles;
  onFeaturesChange: (features: FeatureToggles) => void;
  onSave: () => void;
  onReset: () => void;
}

export const FeatureTogglesTab = React.memo<FeatureTogglesTabProps>(({
  features,
  onFeaturesChange,
  onSave,
  onReset,
}) => {
  const toggleFeature = (key: keyof FeatureToggles, value: boolean) => {
    onFeaturesChange({ ...features, [key]: value });
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Feature Toggles</CardTitle>
        <CardDescription>Enable or disable advanced features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Agent Automation */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="ai-agent-automation" className="text-white flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Agent Automation
            </Label>
            <p className="text-xs text-slate-400">Enable autonomous AI agents for task execution</p>
          </div>
          <Switch
            id="ai-agent-automation"
            checked={features.aiAgentAutomation}
            onCheckedChange={(checked) => toggleFeature('aiAgentAutomation', checked)}
            aria-label="Toggle AI agent automation"
          />
        </div>

        {/* Swarm Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="swarm-mode" className="text-white flex items-center gap-2">
              <Network className="w-4 h-4" />
              Swarm Mode
            </Label>
            <p className="text-xs text-slate-400">Enable multi-agent coordination for complex tasks</p>
          </div>
          <Switch
            id="swarm-mode"
            checked={features.swarmMode}
            onCheckedChange={(checked) => toggleFeature('swarmMode', checked)}
            aria-label="Toggle swarm mode"
          />
        </div>

        {/* Memory System */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="memory-system" className="text-white flex items-center gap-2">
              <Database className="w-4 h-4" />
              Memory System
            </Label>
            <p className="text-xs text-slate-400">Persistent memory across sessions for context retention</p>
          </div>
          <Switch
            id="memory-system"
            checked={features.memorySystem}
            onCheckedChange={(checked) => toggleFeature('memorySystem', checked)}
            aria-label="Toggle memory system"
          />
        </div>

        {/* Browser Automation */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="browser-automation" className="text-white flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Browser Automation
            </Label>
            <p className="text-xs text-slate-400">Automated GHL browser sessions with Playwright</p>
          </div>
          <Switch
            id="browser-automation"
            checked={features.browserAutomation}
            onCheckedChange={(checked) => toggleFeature('browserAutomation', checked)}
            aria-label="Toggle browser automation"
          />
        </div>

        {/* Real-time Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="realtime-notifications" className="text-white flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Real-time Notifications
            </Label>
            <p className="text-xs text-slate-400">Live task status updates and event notifications</p>
          </div>
          <Switch
            id="realtime-notifications"
            checked={features.realtimeNotifications}
            onCheckedChange={(checked) => toggleFeature('realtimeNotifications', checked)}
            aria-label="Toggle real-time notifications"
          />
        </div>

        {/* Knowledge Base */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="knowledge-base" className="text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Knowledge Base
            </Label>
            <p className="text-xs text-slate-400">Pattern learning and intelligent recommendations</p>
          </div>
          <Switch
            id="knowledge-base"
            checked={features.knowledgeBase}
            onCheckedChange={(checked) => toggleFeature('knowledgeBase', checked)}
            aria-label="Toggle knowledge base"
          />
        </div>

        {/* API Access */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="api-access" className="text-white flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Access
            </Label>
            <p className="text-xs text-slate-400">Public API for third-party integrations</p>
          </div>
          <Switch
            id="api-access"
            checked={features.apiAccess}
            onCheckedChange={(checked) => toggleFeature('apiAccess', checked)}
            aria-label="Toggle API access"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <Button
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="border-slate-700"
          >
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

FeatureTogglesTab.displayName = 'FeatureTogglesTab';
