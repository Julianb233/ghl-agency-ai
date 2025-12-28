import React from 'react';
import { CommandCenter } from '@/components/dashboard/CommandCenter';
import { AgentHub } from '@/components/agents/AgentHub';
import { useLocation } from 'wouter';

/**
 * AgentsPage - Browser automation and task execution hub
 *
 * This page provides the main interface for:
 * - Launching pre-configured agent templates
 * - Monitoring live agent executions
 * - Viewing execution history
 *
 * Uses CommandCenter for consistent layout and navigation.
 */
export const AgentsPage: React.FC = () => {
  const [, setLocation] = useLocation();

  const handleLaunchTask = (templateId: string) => {
    console.log('Launching task template:', templateId);
    // TODO: Implement task launch logic
    // This will trigger agent execution with the selected template
  };

  const handleViewTask = (taskId: string) => {
    console.log('Viewing task:', taskId);
    // TODO: Navigate to task detail view
    // setLocation(`/dashboard/agents/tasks/${taskId}`);
  };

  return (
    <CommandCenter>
      <AgentHub
        onLaunchTask={handleLaunchTask}
        onViewTask={handleViewTask}
      />
    </CommandCenter>
  );
};

export default AgentsPage;
