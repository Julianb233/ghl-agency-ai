export type SOPStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED';
export type SOPPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SOPCategory = 'CLIENT_ONBOARDING' | 'SALES' | 'SUPPORT' | 'MARKETING' | 'OPERATIONS' | 'TECHNICAL' | 'OTHER';
export type AutomationLevel = 'MANUAL' | 'SEMI_AUTOMATED' | 'FULLY_AUTOMATED';
export type ActionType = 'MANUAL' | 'API_CALL' | 'WEBHOOK' | 'EMAIL' | 'NOTIFICATION' | 'DATA_TRANSFORM' | 'APPROVAL' | 'CONDITIONAL' | 'OTHER';
export type ExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'WAITING_APPROVAL';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface SOPTag {
  id: string;
  name: string;
  color?: string;
}

export interface SOPCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: string | number | boolean;
}

export interface SOPAlternative {
  id: string;
  title: string;
  instructions: string;
  conditions?: SOPCondition[];
}

export interface SOPResource {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'LINK' | 'VIDEO' | 'IMAGE' | 'FILE';
  url: string;
  description?: string;
}

export interface SOPStep {
  id: string;
  sopId: string;
  stepNumber: number;
  title: string;
  instructions: string;
  actionType: ActionType;
  conditions?: SOPCondition[];
  alternatives?: SOPAlternative[];
  resources?: SOPResource[];
  expectedOutcome?: string;
  validationCriteria?: string;
  estimatedDuration?: number; // in minutes
  isOptional?: boolean;
  requiresApproval?: boolean;
  assignedRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOP {
  id: string;
  title: string;
  description: string;
  objective?: string;
  category: SOPCategory;
  status: SOPStatus;
  priority: SOPPriority;
  tags?: SOPTag[];
  version: number;
  steps?: SOPStep[];
  aiEnabled: boolean;
  humanApprovalRequired: boolean;
  automationLevel: AutomationLevel;
  estimatedDuration?: number; // in minutes
  successRate?: number; // percentage
  usageCount?: number;
  ownerId?: string;
  ownerName?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface SOPVersion {
  id: string;
  sopId: string;
  version: number;
  title: string;
  description: string;
  changes: string;
  changedBy: string;
  changedByName?: string;
  createdAt: Date;
  snapshot: Partial<SOP>; // Full snapshot of the SOP at this version
}

export interface SOPExecutionStep {
  id: string;
  executionId: string;
  stepId: string;
  stepNumber: number;
  title: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
  notes?: string;
  executedBy?: string;
  executedByName?: string;
}

export interface SOPExecution {
  id: string;
  sopId: string;
  sopTitle: string;
  sopVersion: number;
  status: ExecutionStatus;
  steps?: SOPExecutionStep[];
  startedAt: Date;
  completedAt?: Date;
  executedBy?: string;
  executedByName?: string;
  clientId?: string;
  clientName?: string;
  result?: string;
  rating?: number; // 1-5
  feedback?: string;
  metadata?: Record<string, any>;
}

export interface SOPFilters {
  search?: string;
  category?: SOPCategory;
  status?: SOPStatus;
  priority?: SOPPriority;
  tags?: string[];
  aiEnabled?: boolean;
  automationLevel?: AutomationLevel;
  ownerId?: string;
}

export interface SOPListProps {
  filters?: SOPFilters;
  onSelectSOP?: (sop: SOP) => void;
  onEditSOP?: (sop: SOP) => void;
  onDuplicateSOP?: (sop: SOP) => void;
  onArchiveSOP?: (sop: SOP) => void;
  onCreateNew?: () => void;
}

export interface SOPEditorProps {
  sop?: SOP;
  onSave?: (sop: Partial<SOP>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface SOPStepEditorProps {
  steps: SOPStep[];
  onStepsChange?: (steps: SOPStep[]) => void;
  onAddStep?: () => void;
  onRemoveStep?: (stepId: string) => void;
  onReorderSteps?: (fromIndex: number, toIndex: number) => void;
}

export interface SOPVersionHistoryProps {
  sopId: string;
  versions?: SOPVersion[];
  onRestore?: (version: SOPVersion) => void;
  onCompare?: (versionA: SOPVersion, versionB: SOPVersion) => void;
}

export interface SOPExecutionProps {
  execution?: SOPExecution;
  onStepComplete?: (stepId: string, result: string) => void;
  onStepFail?: (stepId: string, error: string) => void;
  onExecutionComplete?: (rating: number, feedback: string) => void;
  onCancel?: () => void;
}
