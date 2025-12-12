import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, Settings, Users, Plus, Zap, FileText } from 'lucide-react';

export default function DashboardHome() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div data-tour="dashboard-header">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your GHL Agency AI Dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No scheduled tasks yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No active workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Just you for now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No integrations configured</p>
          </CardContent>
        </Card>
      </div>

      <Card data-tour="quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with your AI-powered agency automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              onClick={() => setLocation('/ai-campaigns')}
              className="h-auto flex-col gap-2 py-4"
              variant="outline"
            >
              <Plus className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Create Campaign</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Start a new AI calling campaign
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setLocation('/lead-lists')}
              className="h-auto flex-col gap-2 py-4"
              variant="outline"
            >
              <FileText className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Manage Leads</div>
                <div className="text-xs text-muted-foreground font-normal">
                  View and organize your lead lists
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setLocation('/settings')}
              className="h-auto flex-col gap-2 py-4"
              variant="outline"
            >
              <Settings className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Configure Settings</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Set up API keys and integrations
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="quick-start-guide">
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>Get started with your AI-powered agency automation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Configure API Keys</h3>
            <p className="text-sm text-muted-foreground">
              Head to Settings to add your OpenAI and Browserbase API keys
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">2. Create Lead Lists</h3>
            <p className="text-sm text-muted-foreground">
              Import or manually add leads to organize your outreach
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">3. Launch AI Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage AI calling campaigns to automate outreach
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
