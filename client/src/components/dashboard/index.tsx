/**
 * Dashboard Components Index
 * Exports all dashboard components wrapped with error boundaries for safe usage
 */

import React from 'react';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { AgentPerformance as AgentPerformanceBase } from './AgentPerformance';
import { QuickActions as QuickActionsBase } from './QuickActions';
import { TaskQueue as TaskQueueBase } from './TaskQueue';
import { DashboardMetrics as DashboardMetricsBase } from './DashboardMetrics';
import { UsageChart as UsageChartBase } from './UsageChart';
import { PerformanceSummary as PerformanceSummaryBase } from './PerformanceSummary';
import { PriorityWidget as PriorityWidgetBase } from './PriorityWidget';

// Export error boundary for direct use
export { DashboardErrorBoundary };

// Wrap components with error boundaries
export const AgentPerformance: typeof AgentPerformanceBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Agent Performance Error"
    fallbackDescription="Unable to load agent performance metrics."
  >
    <AgentPerformanceBase {...props} />
  </DashboardErrorBoundary>
);

export const QuickActions: typeof QuickActionsBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Quick Actions Error"
    fallbackDescription="Unable to load quick actions."
  >
    <QuickActionsBase {...props} />
  </DashboardErrorBoundary>
);

export const TaskQueue: typeof TaskQueueBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Task Queue Error"
    fallbackDescription="Unable to load task queue."
  >
    <TaskQueueBase {...props} />
  </DashboardErrorBoundary>
);

export const DashboardMetrics: typeof DashboardMetricsBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Dashboard Metrics Error"
    fallbackDescription="Unable to load dashboard metrics."
  >
    <DashboardMetricsBase {...props} />
  </DashboardErrorBoundary>
);

export const UsageChart: typeof UsageChartBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Usage Chart Error"
    fallbackDescription="Unable to load usage chart."
  >
    <UsageChartBase {...props} />
  </DashboardErrorBoundary>
);

export const PerformanceSummary: typeof PerformanceSummaryBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Performance Summary Error"
    fallbackDescription="Unable to load performance summary."
  >
    <PerformanceSummaryBase {...props} />
  </DashboardErrorBoundary>
);

export const PriorityWidget: typeof PriorityWidgetBase = (props) => (
  <DashboardErrorBoundary
    fallbackTitle="Priority Widget Error"
    fallbackDescription="Unable to load priority widget."
  >
    <PriorityWidgetBase {...props} />
  </DashboardErrorBoundary>
);
