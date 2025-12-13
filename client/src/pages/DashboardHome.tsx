import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Activity, Calendar, Settings, Users, Plus, Zap, FileText, ArrowUpRight, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SubscriptionUsageCard, UpgradeModal, ExecutionPacksModal } from '@/components/subscription';

export default function DashboardHome() {
  const [, setLocation] = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);

  // Fetch subscription data
  const subscriptionQuery = trpc.subscription.getMySubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6">
      <div data-tour="dashboard-header">
        <Breadcrumb
          items={[
            { label: 'Dashboard' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight mt-4">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your GHL Agency AI Dashboard
        </p>
      </div>

      {/* Subscription Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SubscriptionUsageCard
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onBuyPackClick={() => setShowPacksModal(true)}
          />
        </div>
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">AI Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">
                {subscriptionQuery.data?.limits?.maxAgents ?? 0}
              </span>
              <span className="text-sm text-purple-600">agent slots</span>
            </div>
            <Button
              onClick={() => setLocation('/agent')}
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Launch Agent
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionQuery.data?.usage?.executionsUsed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {subscriptionQuery.data?.usage?.executionLimit ?? 0} this month
            </p>
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

      {/* Subscription Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTierSlug={subscriptionQuery.data?.tier?.slug}
      />
      <ExecutionPacksModal
        isOpen={showPacksModal}
        onClose={() => setShowPacksModal(false)}
      />
    </div>
  );
}
