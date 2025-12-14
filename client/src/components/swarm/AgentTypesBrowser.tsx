/**
 * Agent Types Browser Component
 *
 * Browse and explore the 64+ available agent types with their capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import {
  Bot,
  Search,
  Code,
  FileText,
  Database,
  Shield,
  Globe,
  Cpu,
  Loader2,
  Sparkles,
  CheckCircle2,
  Zap,
  Users,
  RefreshCw,
} from 'lucide-react';

// Category icon mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  development: Code,
  documentation: FileText,
  data: Database,
  security: Shield,
  web: Globe,
  infrastructure: Cpu,
  research: Search,
  coordination: Users,
  default: Bot,
};

// Category colors
const categoryColors: Record<string, string> = {
  development: 'bg-blue-100 text-blue-700 border-blue-200',
  documentation: 'bg-green-100 text-green-700 border-green-200',
  data: 'bg-purple-100 text-purple-700 border-purple-200',
  security: 'bg-red-100 text-red-700 border-red-200',
  web: 'bg-amber-100 text-amber-700 border-amber-200',
  infrastructure: 'bg-gray-100 text-gray-700 border-gray-200',
  research: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  coordination: 'bg-pink-100 text-pink-700 border-pink-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function AgentTypesBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.swarm.getAgentTypes.useQuery();

  const agentTypes = data?.agentTypes || [];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(agentTypes.map((a) => a.category || 'default'));
    return ['all', ...Array.from(cats)];
  }, [agentTypes]);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agentTypes.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || agent.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [agentTypes, searchQuery, selectedCategory]);

  // Group by category for display
  const groupedAgents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredAgents.forEach((agent) => {
      const cat = agent.category || 'default';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(agent);
    });
    return groups;
  }, [filteredAgents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Types ({agentTypes.length})</h2>
          <p className="text-sm text-muted-foreground">
            Specialized agents available for swarm coordination
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, type, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {category === 'all' ? 'All Types' : category}
              <Badge variant="secondary" className="ml-2 text-xs">
                {category === 'all'
                  ? agentTypes.length
                  : agentTypes.filter((a) => (a.category || 'default') === category).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Agent Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Agent List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-3">
                {Object.entries(groupedAgents).map(([category, agents]) => (
                  <div key={category} className="mb-4">
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1">
                      {React.createElement(categoryIcons[category] || categoryIcons.default, {
                        className: 'h-4 w-4 text-muted-foreground',
                      })}
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {category}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {agents.length}
                      </Badge>
                    </div>
                    {agents.map((agent) => (
                      <AgentTypeCard
                        key={agent.type}
                        agent={agent}
                        isSelected={selectedAgent?.type === agent.type}
                        onClick={() => setSelectedAgent(agent)}
                      />
                    ))}
                  </div>
                ))}
                {filteredAgents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No agents match your search</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Agent Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAgent ? (
              <AgentDetailView agent={selectedAgent} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select an agent to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Agent Type Card Component
function AgentTypeCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = categoryIcons[agent.category] || categoryIcons.default;
  const colorClass = categoryColors[agent.category] || categoryColors.default;

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-primary/10 border-2 border-primary'
          : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
        </div>
      </div>
    </div>
  );
}

// Agent Detail View Component
function AgentDetailView({ agent }: { agent: any }) {
  const Icon = categoryIcons[agent.category] || categoryIcons.default;
  const colorClass = categoryColors[agent.category] || categoryColors.default;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <Badge variant="outline" className="mt-1">
            {agent.type}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium mb-1">Description</h4>
        <p className="text-sm text-muted-foreground">{agent.description}</p>
      </div>

      {/* Category */}
      <div>
        <h4 className="text-sm font-medium mb-1">Category</h4>
        <Badge className={colorClass}>{agent.category || 'General'}</Badge>
      </div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {cap}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Use Cases */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Best Used For
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {getUseCasesForAgent(agent.type).map((useCase, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              {useCase}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Helper to generate use cases based on agent type
function getUseCasesForAgent(type: string): string[] {
  const useCases: Record<string, string[]> = {
    researcher: ['Deep web research', 'Information gathering', 'Fact verification'],
    coder: ['Code generation', 'Bug fixing', 'Code review'],
    tester: ['Unit testing', 'Integration testing', 'Test automation'],
    reviewer: ['Code review', 'Quality assurance', 'Documentation review'],
    documenter: ['API documentation', 'User guides', 'Technical writing'],
    analyst: ['Data analysis', 'Pattern recognition', 'Report generation'],
    optimizer: ['Performance tuning', 'Resource optimization', 'Cost reduction'],
    coordinator: ['Task orchestration', 'Team coordination', 'Workflow management'],
    architect: ['System design', 'Architecture review', 'Technical planning'],
    monitor: ['System monitoring', 'Alert management', 'Health checks'],
  };

  // Find matching use cases or return default
  for (const [key, cases] of Object.entries(useCases)) {
    if (type.toLowerCase().includes(key)) {
      return cases;
    }
  }

  return ['General purpose tasks', 'Custom workflows', 'Specialized operations'];
}
