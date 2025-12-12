/**
 * Knowledge Dashboard Component
 *
 * Main dashboard for the Knowledge & Training System.
 * Displays system statistics, patterns, feedback, and provides
 * access to knowledge management tools.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import {
  Brain,
  Target,
  AlertTriangle,
  MessageSquare,
  Mic2,
  Building2,
  TrendingUp,
  Database,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PatternList } from './PatternList';
import { FeedbackPanel } from './FeedbackPanel';
import { BrandVoiceEditor } from './BrandVoiceEditor';
import { SelectorManager } from './SelectorManager';

export function KnowledgeDashboard() {
  const { data: statsData, isLoading: statsLoading } = trpc.knowledge.getSystemStats.useQuery();
  const { data: errorStatsData } = trpc.knowledge.getErrorStats.useQuery();
  const { data: feedbackStatsData } = trpc.knowledge.getFeedbackStats.useQuery();

  const stats = statsData?.stats;
  const errorStats = errorStatsData?.stats;
  const feedbackStats = feedbackStatsData?.stats;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge & Training</h1>
        <p className="text-muted-foreground">
          Agent learning system - patterns, selectors, feedback, and context management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Action Patterns"
          value={stats?.totalPatterns || 0}
          description={`${((stats?.avgPatternSuccessRate || 0) * 100).toFixed(1)}% success rate`}
          icon={Brain}
          trend={stats?.avgPatternSuccessRate || 0 > 0.7 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Element Selectors"
          value={stats?.totalSelectors || 0}
          description={`${((stats?.avgSelectorSuccessRate || 0) * 100).toFixed(1)}% success rate`}
          icon={Target}
          trend={stats?.avgSelectorSuccessRate || 0 > 0.8 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Error Patterns"
          value={errorStats?.totalErrors || 0}
          description={`${((errorStats?.resolutionRate || 0) * 100).toFixed(1)}% resolved`}
          icon={AlertTriangle}
          trend={errorStats?.resolutionRate || 0 > 0.6 ? 'up' : 'down'}
        />
        <StatsCard
          title="Feedback"
          value={feedbackStats?.total || 0}
          description={`${(feedbackStats?.averageRating || 0).toFixed(1)}/5 avg rating`}
          icon={MessageSquare}
          trend={feedbackStats?.averageRating || 0 >= 4 ? 'up' : 'neutral'}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="selectors" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Selectors
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="brand-voice" className="flex items-center gap-2">
            <Mic2 className="h-4 w-4" />
            Brand Voice
          </TabsTrigger>
          <TabsTrigger value="context" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Context
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns">
          <PatternList />
        </TabsContent>

        <TabsContent value="selectors">
          <SelectorManager />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackPanel />
        </TabsContent>

        <TabsContent value="brand-voice">
          <BrandVoiceEditor />
        </TabsContent>

        <TabsContent value="context">
          <ClientContextPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

// Client Context Panel Component
function ClientContextPanel() {
  const { data: contextsData, isLoading } = trpc.knowledge.listClientContexts.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const contexts = contextsData?.contexts || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Contexts</CardTitle>
        <CardDescription>
          Business and industry context for personalized agent behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contexts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No client contexts configured yet</p>
            <p className="text-sm">Add client context to improve agent responses</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {contexts.map((ctx) => (
                <Card key={ctx.clientId} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Client #{ctx.clientId}</CardTitle>
                      <Badge variant="outline">{ctx.industry}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Business Type</dt>
                        <dd>{ctx.businessType}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Target Market</dt>
                        <dd>{ctx.targetMarket}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Products/Services</dt>
                        <dd className="flex flex-wrap gap-1 mt-1">
                          {ctx.products.slice(0, 3).map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                          {ctx.products.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{ctx.products.length - 3}
                            </Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
