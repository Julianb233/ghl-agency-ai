
export enum AgentStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  ERROR = 'ERROR',
  COMPLETED = 'COMPLETED'
}

export interface AgentInstance {
  id: string;
  clientId: string;
  status: AgentStatus;
  currentTask?: string;
  progress: number; // 0-100
  lastActive: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success' | 'system';
  message: string;
  detail?: string;
}

export interface SeoConfig {
  siteTitle: string;
  metaDescription: string;
  keywords: string[]; // e.g. "Roofing Denver", "Solar Panels"
  robotsTxt: string;
}

export interface Asset {
  id: string;
  originalName: string;
  optimizedName: string; // SEO friendly filename
  url: string;
  altText: string;
  contextTag: 'HERO' | 'TEAM' | 'TESTIMONIAL' | 'PRODUCT' | 'LOGO' | 'UNKNOWN';
  status: 'uploading' | 'optimizing' | 'ready';
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  content: string; // Simulated text content for context
  selected: boolean;
  icon?: string;
}

export interface ClientContext {
  id: string;
  source: 'NOTION' | 'PDF' | 'MANUAL' | 'G_DRIVE';
  name: string;
  subaccountName: string;
  subaccountId: string;
  brandVoice: string; // e.g., "Professional, Empathetic"
  primaryGoal: string; // e.g., "Increase Lead Conversion"
  website: string;
  seo?: SeoConfig;
  assets?: Asset[];
  driveFiles?: DriveFile[];
}

export interface AgentTask {
  id: string;
  description: string;
  subaccount?: string;
  clientName?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  steps: AgentStep[];
}

export interface AgentStep {
  id: string;
  action: string; // e.g., "Navigate", "Click", "Type", "Check"
  target: string;
  details?: string; // Additional context for the step (e.g., what text to type)
  status: 'pending' | 'running' | 'done' | 'failed';
  screenshotUrl?: string;
}

export interface IntegrationStatus {
  notion: boolean;
  slack: boolean;
  neonDb: boolean;
  goHighLevel: boolean;
  twilio: boolean;
  whatsapp: boolean;
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- User & Permissions ---

export type UserRole = 'OWNER' | 'MANAGER' | 'VA';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarInitials: string;
  isOnline: boolean;
}

export interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  action: string; // e.g., "Updated Workflow"
  target: string; // e.g., "Client: Solar Inc"
  timestamp: string;
  type: 'modification' | 'execution' | 'system';
}

// --- Support & Tickets ---

export type TicketSource = 'EMAIL' | 'SLACK' | 'VOICE' | 'WEB_FORM' | 'WHATSAPP';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  source: TicketSource;
  subject: string; // Or summary of voice call
  description: string; // Full text or transcript
  priority: TicketPriority;
  status: TicketStatus;
  clientName?: string;
  timestamp: string;
  aiAnalysis?: string; // AI Generated "What to do"
  suggestedCommand?: string; // AI Generated command for the agent
}

// --- Billing & Settings ---

export interface AddOn {
  id: string;
  title: string;
  description: string;
  price: number; // Monthly price in credits/dollars
  type: 'MONTHLY' | 'ONE_TIME';
  active: boolean;
  icon: string;
}

export interface BillingHistory {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CHARGE' | 'CREDIT';
}

export type SettingsTab = 'GENERAL' | 'INTEGRATIONS' | 'BILLING' | 'ADDONS' | 'WHITELABEL' | 'TEAM';
