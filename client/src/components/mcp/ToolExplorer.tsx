/**
 * Tool Explorer Component
 *
 * Browse and explore available MCP tools organized by category.
 * Shows tool details, parameters, and usage examples.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { trpc } from '@/lib/trpc';
import {
  Search,
  FileText,
  Terminal,
  Globe,
  Database,
  Code,
  Settings,
  Loader2,
  ChevronRight,
  Copy,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

// Tool categories with icons
const TOOL_CATEGORIES = {
  file: { name: 'File Operations', icon: FileText, description: 'Read, write, and manage files' },
  shell: { name: 'Shell Commands', icon: Terminal, description: 'Execute system commands' },
  web: { name: 'Web Operations', icon: Globe, description: 'HTTP requests and web scraping' },
  database: { name: 'Database', icon: Database, description: 'Query and manage databases' },
  code: { name: 'Code Tools', icon: Code, description: 'Code analysis and generation' },
  system: { name: 'System', icon: Settings, description: 'System management tools' },
};

// Mock tools data (would come from API in production)
const MOCK_TOOLS = [
  {
    name: 'file/read',
    category: 'file',
    description: 'Read contents of a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path to read' },
      { name: 'encoding', type: 'string', required: false, description: 'File encoding (utf-8, base64, hex)' },
    ],
  },
  {
    name: 'file/write',
    category: 'file',
    description: 'Write content to a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'File path to write' },
      { name: 'content', type: 'string', required: true, description: 'Content to write' },
      { name: 'createDirectories', type: 'boolean', required: false, description: 'Create parent directories' },
    ],
  },
  {
    name: 'file/list',
    category: 'file',
    description: 'List directory contents',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Directory path' },
      { name: 'recursive', type: 'boolean', required: false, description: 'List recursively' },
    ],
  },
  {
    name: 'shell/execute',
    category: 'shell',
    description: 'Execute a shell command',
    parameters: [
      { name: 'command', type: 'string', required: true, description: 'Command to execute' },
      { name: 'cwd', type: 'string', required: false, description: 'Working directory' },
      { name: 'timeout', type: 'number', required: false, description: 'Timeout in ms' },
    ],
  },
  {
    name: 'web/request',
    category: 'web',
    description: 'Make HTTP request',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'Request URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP method (GET, POST, etc.)' },
      { name: 'headers', type: 'object', required: false, description: 'Request headers' },
      { name: 'body', type: 'any', required: false, description: 'Request body' },
    ],
  },
  {
    name: 'web/fetch',
    category: 'web',
    description: 'Fetch and extract webpage content',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'URL to fetch' },
      { name: 'extractText', type: 'boolean', required: false, description: 'Extract text only' },
    ],
  },
  {
    name: 'database/query',
    category: 'database',
    description: 'Execute database query',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'SQL query' },
      { name: 'params', type: 'array', required: false, description: 'Query parameters' },
      { name: 'limit', type: 'number', required: false, description: 'Result limit' },
    ],
  },
  {
    name: 'database/tables',
    category: 'database',
    description: 'List database tables',
    parameters: [
      { name: 'schema', type: 'string', required: false, description: 'Schema name' },
    ],
  },
  {
    name: 'database/schema',
    category: 'database',
    description: 'Get table schema',
    parameters: [
      { name: 'table', type: 'string', required: true, description: 'Table name' },
      { name: 'schema', type: 'string', required: false, description: 'Schema name' },
    ],
  },
];

export function ToolExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // In production, use: trpc.mcp.listTools.useQuery()
  const tools = MOCK_TOOLS;

  // Filter tools by search query
  const filteredTools = useMemo(() => {
    if (!searchQuery) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
    );
  }, [tools, searchQuery]);

  // Group tools by category
  const groupedTools = useMemo(() => {
    return filteredTools.reduce((acc: Record<string, typeof tools>, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {});
  }, [filteredTools]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Tool List */}
      <div className="md:col-span-2 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Accordion */}
        <Accordion type="multiple" defaultValue={Object.keys(TOOL_CATEGORIES)} className="space-y-2">
          {Object.entries(TOOL_CATEGORIES).map(([categoryKey, category]) => {
            const categoryTools = groupedTools[categoryKey] || [];
            if (categoryTools.length === 0) return null;

            const CategoryIcon = category.icon;

            return (
              <AccordionItem key={categoryKey} value={categoryKey} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.description}</div>
                    </div>
                    <Badge variant="outline" className="ml-auto mr-2">
                      {categoryTools.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {categoryTools.map((tool) => (
                      <div
                        key={tool.name}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTool === tool.name
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTool(tool.name)}
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{tool.name}</code>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Empty state */}
        {filteredTools.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tools found matching "{searchQuery}"</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tool Detail Panel */}
      <div>
        <ToolDetailPanel
          tool={tools.find((t) => t.name === selectedTool)}
        />
      </div>
    </div>
  );
}

// Tool Detail Panel
function ToolDetailPanel({
  tool,
}: {
  tool?: typeof MOCK_TOOLS[0];
}) {
  if (!tool) {
    return (
      <Card className="sticky top-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a tool to view details</p>
        </CardContent>
      </Card>
    );
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(tool.name);
    toast.success('Tool name copied');
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-mono text-lg">{tool.name}</CardTitle>
            <CardDescription>{tool.description}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopyName}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Badge */}
        <div>
          <Badge variant="secondary">
            {TOOL_CATEGORIES[tool.category as keyof typeof TOOL_CATEGORIES]?.name || tool.category}
          </Badge>
        </div>

        {/* Parameters */}
        <div>
          <h4 className="text-sm font-medium mb-2">Parameters</h4>
          <div className="space-y-2">
            {tool.parameters.map((param) => (
              <div key={param.name} className="border rounded p-2">
                <div className="flex items-center gap-2">
                  <code className="text-sm">{param.name}</code>
                  <Badge variant="outline" className="text-xs">
                    {param.type}
                  </Badge>
                  {param.required && (
                    <Badge variant="destructive" className="text-xs">
                      required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {param.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Example Usage */}
        <div>
          <h4 className="text-sm font-medium mb-2">Example</h4>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`{
  "name": "${tool.name}",
  "arguments": {
${tool.parameters
  .filter((p) => p.required)
  .map((p) => `    "${p.name}": ${p.type === 'string' ? '"..."' : p.type === 'number' ? '0' : '...'}`)
  .join(',\n')}
  }
}`}
          </pre>
        </div>

        {/* Actions */}
        <Button className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Execute Tool
        </Button>
      </CardContent>
    </Card>
  );
}
