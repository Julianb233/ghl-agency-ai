import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NODE_TEMPLATES, NODE_CATEGORIES, getNodesByCategory } from '@/config/nodeTemplates';
import type { NodeTemplate } from '@/types/workflow';

interface NodePaletteProps {
  onNodeSelect: (template: NodeTemplate) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onNodeSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredNodes = NODE_TEMPLATES.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="h-full flex flex-col border-r rounded-none">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Node Palette</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-3 gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="navigation" className="text-xs">Nav</TabsTrigger>
          <TabsTrigger value="interaction" className="text-xs">Action</TabsTrigger>
        </TabsList>
        <TabsList className="mx-4 mb-2 grid grid-cols-3 gap-1">
          <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
          <TabsTrigger value="control" className="text-xs">Control</TabsTrigger>
          <TabsTrigger value="utility" className="text-xs">Utility</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value={selectedCategory} className="m-0 p-4 pt-2 space-y-2">
            {filteredNodes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No nodes found
              </div>
            ) : (
              filteredNodes.map((template) => {
                const IconComponent = (Icons as any)[template.icon] || Icons.Box;
                return (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => onNodeSelect(template)}
                    className="group cursor-move rounded-lg border bg-card p-3 hover:bg-accent hover:border-primary transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{template.label}</span>
                          <Badge variant="outline" className="text-xs px-1">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="p-4 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          Drag nodes onto the canvas or click to add at center
        </p>
      </div>
    </Card>
  );
};
