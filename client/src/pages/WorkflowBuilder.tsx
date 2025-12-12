import React, { useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Save,
  Play,
  Download,
  Upload,
  Plus,
  Undo2,
  Redo2,
  Trash2,
  FileJson,
  Zap,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { CustomNode } from '@/components/workflow/CustomNode';
import { NodePalette } from '@/components/workflow/NodePalette';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
import { TemplateDialog } from '@/components/workflow/TemplateDialog';
import { TestRunDialog } from '@/components/workflow/TestRunDialog';
import type { NodeTemplate } from '@/types/workflow';
import { TourPrompt } from '@/components/tour';

const nodeTypes = {
  default: CustomNode,
};

const WorkflowCanvas: React.FC = () => {
  const [, setLocation] = useLocation();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    saveWorkflow,
    exportWorkflow,
    importWorkflow,
    undo,
    redo,
    canUndo,
    canRedo,
    clearWorkflow,
    workflow,
    isDirty,
    isSaving,
  } = useWorkflowStore();

  const [newWorkflowName, setNewWorkflowName] = React.useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = React.useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isTestRunDialogOpen, setIsTestRunDialogOpen] = React.useState(false);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData) return;

      const template: NodeTemplate = JSON.parse(templateData);
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();

      if (!reactFlowBounds || !reactFlowInstance) return;

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(template.type, position);
      toast.success(`Added ${template.label} node`);
    },
    [reactFlowInstance, addNode, project]
  );

  // Handle node selection from palette (click to add at center)
  const handleNodeSelect = useCallback(
    (template: NodeTemplate) => {
      const position = { x: 400, y: 200 };
      addNode(template.type, position);
      toast.success(`Added ${template.label} node`);
    },
    [addNode]
  );

  // Save workflow
  const handleSave = useCallback(async () => {
    try {
      await saveWorkflow();
      toast.success('Workflow saved successfully');
    } catch (error) {
      toast.error('Failed to save workflow');
      console.error(error);
    }
  }, [saveWorkflow]);

  // Export workflow
  const handleExport = useCallback(() => {
    const json = exportWorkflow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow?.name || 'workflow'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported');
  }, [exportWorkflow, workflow]);

  // Import workflow
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importWorkflow(json);
          toast.success('Workflow imported');
        } catch (error) {
          toast.error('Failed to import workflow');
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importWorkflow]);

  // Test run workflow
  const handleTestRun = useCallback(() => {
    if (nodes.length === 0) {
      toast.error('Add some nodes to test the workflow');
      return;
    }
    setIsTestRunDialogOpen(true);
  }, [nodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      // Cmd/Ctrl + Shift + Z to redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo()) redo();
      }
      // Delete to remove selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Handled by ReactFlow
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, undo, redo, canUndo, canRedo]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4" data-tour="workflow-header">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <Breadcrumb
              items={[
                { label: 'Dashboard', onClick: () => setLocation('/') },
                { label: 'Workflow Builder' },
              ]}
              className="mb-0"
            />
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {workflow?.name || 'Workflow Builder'}
              </h1>
              {isDirty && <span className="text-xs text-muted-foreground">• Unsaved changes</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* New Workflow */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Start building a new automation workflow
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="My Automation"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    placeholder="What does this workflow do?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newWorkflowName.trim()) {
                      clearWorkflow();
                      setIsCreateDialogOpen(false);
                      toast.success('New workflow created');
                    }
                  }}
                >
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Templates */}
          <TemplateDialog />

          {/* Import */}
          <Button size="sm" variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>

          {/* Export */}
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Test Run */}
          <Button size="sm" variant="outline" onClick={handleTestRun} data-tour="workflow-test">
            <Play className="h-4 w-4 mr-2" />
            Test Run
          </Button>

          {/* Test Run Dialog */}
          <TestRunDialog
            nodes={nodes}
            edges={edges}
            open={isTestRunDialogOpen}
            onOpenChange={setIsTestRunDialogOpen}
          />

          {/* Save */}
          <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving} data-tour="workflow-save">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Node Palette */}
        <div className="w-64 border-r flex flex-col" data-tour="workflow-node-palette">
          <div className="p-3 border-b">
            <TourPrompt tourId="workflows" featureName="Workflow Builder" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <NodePalette onNodeSelect={handleNodeSelect} />
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper} data-tour="workflow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-background !border !border-border"
            />
          </ReactFlow>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <FileJson className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">Start Building</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Drag nodes from the palette or click on them to add to the canvas.
                  Connect nodes to create your automation workflow.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Node Configuration */}
        <div className="w-80 border-l" data-tour="workflow-config-panel">
          <NodeConfigPanel />
        </div>
      </div>
    </div>
  );
};

export const WorkflowBuilder: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;
