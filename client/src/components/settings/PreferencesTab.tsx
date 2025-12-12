import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Clock, Moon, Sun, Bell } from 'lucide-react';

interface Preferences {
  defaultBrowser: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

interface PreferencesTabProps {
  preferences: Preferences;
  onPreferencesChange: (preferences: Preferences) => void;
  onSave: () => void;
  onReset: () => void;
}

export const PreferencesTab = React.memo<PreferencesTabProps>(({
  preferences,
  onPreferencesChange,
  onSave,
  onReset,
}) => {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Preferences</CardTitle>
        <CardDescription>Customize your experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Configuration */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2" htmlFor="default-browser">
            <Globe className="w-4 h-4" />
            Default Browser
          </Label>
          <Select
            value={preferences.defaultBrowser}
            onValueChange={(value) =>
              onPreferencesChange({ ...preferences, defaultBrowser: value })
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" id="default-browser">
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
          <Label className="text-white flex items-center gap-2" htmlFor="timezone">
            <Clock className="w-4 h-4" />
            Timezone
          </Label>
          <Select
            value={preferences.timezone}
            onValueChange={(value) => onPreferencesChange({ ...preferences, timezone: value })}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" id="timezone">
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
          <Label className="text-white flex items-center gap-2" htmlFor="theme">
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
              onPreferencesChange({ ...preferences, theme: value })
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" id="theme">
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
                <Label htmlFor="email-notifications" className="text-sm text-white">
                  Email Notifications
                </Label>
                <p className="text-xs text-slate-400">Receive updates via email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ ...preferences, emailNotifications: checked })
                }
                aria-label="Toggle email notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-app-notifications" className="text-sm text-white">
                  In-App Notifications
                </Label>
                <p className="text-xs text-slate-400">Show notifications in the app</p>
              </div>
              <Switch
                id="in-app-notifications"
                checked={preferences.inAppNotifications}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ ...preferences, inAppNotifications: checked })
                }
                aria-label="Toggle in-app notifications"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <Button
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Preferences
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

PreferencesTab.displayName = 'PreferencesTab';
