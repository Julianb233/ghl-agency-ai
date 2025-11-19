
import React, { useState, useCallback, useEffect } from 'react';
// Gemini service removed - will be implemented server-side via tRPC
import { executeStep } from '../services/mockAutomation';
import { sendSlackAlert } from '../services/slackService';
import { AgentStatus, AgentTask, AgentStep, LogEntry, IntegrationStatus, SlackConfig, ClientContext, User, TeamActivity, Asset, SeoConfig, SupportTicket, AgentInstance, SettingsTab, DriveFile } from '../types';
import { GlassPane } from './GlassPane';
import { TerminalLog } from './TerminalLog';
import { BrowserPreview } from './BrowserPreview';
import { CommandBar } from './CommandBar';
import { SettingsModal } from './SettingsModal';
import { SystemStatus } from './SystemStatus';
import { TeamPanel } from './TeamPanel';
import { AssetManager } from './AssetManager';
import { TicketQueue } from './TicketQueue';
import { GlobalOps } from './GlobalOps';

// Mock Data for Notion Integration
const MOCK_CLIENTS: ClientContext[] = [
  {
    id: 'c1',
    source: 'NOTION',
    name: 'Solar Solutions Inc.',
    subaccountName: 'Solar Solutions - Denver',
    subaccountId: 'loc_denver_001',
    brandVoice: 'Professional, Eco-friendly, Urgent but reassuring',
    primaryGoal: 'Book appointments for roof inspections',
    website: 'solarsolutions.demo',
    seo: { siteTitle: 'Solar Denver', metaDescription: 'Best solar', keywords: ['solar', 'denver'], robotsTxt: 'User-agent: * Allow: /' },
    assets: []
  },
  {
    id: 'c2',
    source: 'NOTION',
    name: 'Prestige Dental',
    subaccountName: 'Prestige Dental - Main',
    subaccountId: 'loc_dental_992',
    brandVoice: 'Warm, Caring, Clinical Authority',
    primaryGoal: 'Reactivate dormant patients for cleaning',
    website: 'prestigedental.demo',
    seo: { siteTitle: 'Prestige Dental', metaDescription: 'Gentle care', keywords: ['dentist', 'implants'], robotsTxt: 'User-agent: * Allow: /' },
    assets: []
  }
];

const MOCK_DRIVE_FILES: DriveFile[] = [
  { id: 'd1', name: 'SOP_Onboarding_V2.gdoc', mimeType: 'application/vnd.google-apps.document', content: 'SOP FOR NEW CLIENTS:\n1. Create Subaccount\n2. Install Snapshot "Agency_Standard"\n3. Connect Twilio & Stripe\n4. Create "Welcome" Email Campaign.', selected: true, icon: '📝' },
  { id: 'd2', name: 'Brand_Assets_Kit.pdf', mimeType: 'application/pdf', content: 'BRAND GUIDELINES:\nPrimary Color: #4F46E5\nSecondary: #9333EA\nFont: Inter\nTone: Innovative, Bold, Futuristic.', selected: true, icon: '🎨' },
  { id: 'd3', name: 'Funnel_Copy_Draft.gdoc', mimeType: 'application/vnd.google-apps.document', content: 'HEADLINE: "Automate Your Agency in Minutes"\nSUBHEAD: "The first AI workforce for GHL"\nCTA: "Get Started Now"', selected: true, icon: '📄' },
  { id: 'd4', name: 'Client_Logo_Pack.zip', mimeType: 'application/zip', content: '[Binary Data] - Contains logo files.', selected: false, icon: '📦' }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Sarah Admin', role: 'OWNER', avatarInitials: 'SA', isOnline: true },
  { id: 'u2', name: 'John Manager', role: 'MANAGER', avatarInitials: 'JM', isOnline: true },
  { id: 'u3', name: 'Mike VA', role: 'VA', avatarInitials: 'MV', isOnline: false },
];

const MOCK_ACTIVITIES: TeamActivity[] = [
  { id: 'a1', userId: 'u1', userName: 'Sarah Admin', action: 'increased budget', target: 'Solar Ads', timestamp: '10m ago', type: 'modification' },
  { id: 'a2', userId: 'u2', userName: 'John Manager', action: 'approved workflow', target: 'Dental Nurture', timestamp: '45m ago', type: 'execution' },
  { id: 'a3', userId: 'u3', userName: 'Mike VA', action: 'fixed typo', target: 'Gym LP', timestamp: '2h ago', type: 'modification' },
];

const MOCK_AGENTS: AgentInstance[] = [
  { id: 'ag1', clientId: 'c1', status: AgentStatus.IDLE, currentTask: 'Monitoring Lead Forms', progress: 0, lastActive: '10m ago' },
  { id: 'ag2', clientId: 'c2', status: AgentStatus.EXECUTING, currentTask: 'Rebuilding Landing Page', progress: 45, lastActive: 'Just now' },
];

// Mock Tickets for the Queue
const MOCK_TICKETS: SupportTicket[] = [
  { 
    id: 't1', 
    source: 'VOICE', 
    subject: 'Angry Call re: Workflow Failure', 
    description: 'Client called (Twilio Rec #9928) stating that the "Birthday Offer" workflow is not triggering sms. She sounded very frustrated.', 
    priority: 'HIGH', 
    status: 'OPEN', 
    timestamp: '2m ago' 
  },
  { 
    id: 't2', 
    source: 'EMAIL', 
    subject: 'Logo Update Request', 
    description: 'Please update the header logo on the main landing page to the new PNG attached. - Sent via HelpDesk', 
    priority: 'LOW', 
    status: 'OPEN', 
    timestamp: '15m ago' 
  },
  { 
    id: 't3', 
    source: 'WHATSAPP', 
    subject: 'Login Issues', 
    description: 'User @doctor_smith cannot login to the membership portal. Says password reset email never arrived.', 
    priority: 'MEDIUM', 
    status: 'IN_PROGRESS', 
    timestamp: '1h ago' 
  }
];

interface DashboardProps {
  userTier: string; // 'STARTER' | 'GROWTH' | 'WHITELABEL'
  credits: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ userTier, credits: initialCredits }) => {
  const [viewMode, setViewMode] = useState<'GLOBAL' | 'TERMINAL'>('GLOBAL');
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [task, setTask] = useState<AgentTask | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [availableCredits, setAvailableCredits] = useState(initialCredits); 
  
  // Context & Resources State
  const [contextSource, setContextSource] = useState<'NOTION' | 'PDF' | 'G_DRIVE'>('NOTION');
  const [selectedClient, setSelectedClient] = useState<ClientContext | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // Drive State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>(MOCK_DRIVE_FILES);

  // User/Team State
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [activities] = useState<TeamActivity[]>(MOCK_ACTIVITIES);

  // Ticket State
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('GENERAL');
  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    enabled: false,
    webhookUrl: ''
  });

  // Right Sidebar Tab State
  const [rightPanelTab, setRightPanelTab] = useState<'logs' | 'team' | 'resources' | 'tickets'>('tickets');

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('ghl_agent_slack_config');
    if (saved) {
      try {
        setSlackConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings');
      }
    }
    // Default select first client for demo, but view is Global
    setSelectedClient(MOCK_CLIENTS[0]);
  }, []);

  const handleOpenSettings = (tab: SettingsTab = 'GENERAL') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (newConfig: SlackConfig) => {
    setSlackConfig(newConfig);
    localStorage.setItem('ghl_agent_slack_config', JSON.stringify(newConfig));
    addLog('system', 'Configuration Updated', newConfig.enabled ? 'Slack Enabled' : 'Slack Disabled');
  };

  const addLog = useCallback((level: LogEntry['level'], message: string, detail?: string) => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      detail
    }]);
  }, []);

  // Handler for PDF Upload Simulation
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      addLog('info', 'Analyzing Document', file.name);
      
      // Simulate PDF Parsing
      setTimeout(() => {
         const mockContext: ClientContext = {
           id: 'manual_1',
           source: 'PDF',
           name: file.name.replace('.pdf', ''),
           subaccountName: 'Extracted Subaccount',
           subaccountId: 'manual_001',
           brandVoice: 'Extracted: Authoritative & Scientific',
           primaryGoal: 'Extracted: Consultation Bookings',
           website: 'www.extracted-url.com',
           seo: { siteTitle: 'Extracted Title', metaDescription: 'Extracted Meta', keywords: ['extracted', 'keywords'], robotsTxt: '' },
           assets: []
         };
         setSelectedClient(mockContext);
         addLog('success', 'Context Extracted', 'Brand Voice, Goals, and SEO data populated from PDF');
      }, 1500);
    }
  };

  const handleConnectDrive = () => {
    addLog('system', 'Authenticating with Google...', 'OAuth 2.0');
    setTimeout(() => {
      setIsDriveConnected(true);
      addLog('success', 'Drive Connected', 'Access granted to "Client Assets" folder.');
    }, 1000);
  };

  const handleDriveFileToggle = (id: string) => {
    setDriveFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const handleUseDriveContext = () => {
     const selectedFiles = driveFiles.filter(f => f.selected);
     if (selectedFiles.length === 0) {
        addLog('warning', 'Selection Empty', 'Please select at least one file from Drive.');
        return;
     }

     addLog('info', 'Processing Drive Context', `Analyzing ${selectedFiles.length} documents...`);
     
     setTimeout(() => {
        if (selectedClient) {
            // Merge into existing client
            const updatedClient: ClientContext = {
                ...selectedClient,
                source: 'G_DRIVE', // Mark that Drive is now a source
                driveFiles: selectedFiles,
            };
            setSelectedClient(updatedClient);
            addLog('success', 'Context Enriched', `Attached ${selectedFiles.length} Drive files to client: ${selectedClient.name}`);
        } else {
            // Create new mock client if none selected
            const mockContext: ClientContext = {
               id: 'gdrive_1',
               source: 'G_DRIVE',
               name: 'TechStart Agency',
               subaccountName: 'TechStart - Main',
               subaccountId: 'gd_001',
               brandVoice: 'Innovative, Bold, Futuristic',
               primaryGoal: 'Automate Client Onboarding',
               website: 'techstart.demo',
               driveFiles: selectedFiles,
               seo: { siteTitle: 'TechStart', metaDescription: 'AI Automation', keywords: ['ai', 'automation'], robotsTxt: '' },
               assets: []
            };
            setSelectedClient(mockContext);
            addLog('success', 'Context Loaded', 'Created new client context from Drive files.');
        }
     }, 1500);
  };

  const handleResolveTicket = (ticket: SupportTicket, command: string) => {
    // 1. Update ticket status
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'IN_PROGRESS' } : t));
    addLog('info', 'Ticket Triage', `Starting resolution for Ticket #${ticket.id.slice(0,4)}`);
    
    // 2. Switch to Logs view to see progress
    setRightPanelTab('logs');

    // 3. Execute Command
    handleCommand(command);
  };

  const handleCommand = async (input: string) => {
    // Permission Guard
    if (currentUser.role === 'VA') {
       addLog('warning', 'Permissions Check', 'Running as VA: Some actions may be restricted by Admin policy.');
    }

    if (!selectedClient) {
      addLog('error', 'No Client Selected', 'Please select a Client Profile or Upload Context.');
      return;
    }

    // Pre-flight check for funds
    if (availableCredits < 0.50) {
      addLog('error', 'Insufficient Balance', 'Please top up credits in settings to continue.');
      handleOpenSettings('BILLING');
      return;
    }

    setStatus(AgentStatus.PLANNING);
    setLogs([]);
    setScreenshot(undefined);
    
    try {
      addLog('info', 'Agent is thinking...', 'Generating execution plan based on context and request.');
      
      // Mock plan generation - will be replaced with tRPC call
      const plan: AgentTask = {
        id: crypto.randomUUID(),
        description: input,
        subaccount: selectedClient.subaccountName,
        clientName: selectedClient.name,
        status: 'in-progress',
        steps: [
          { id: '1', action: 'Navigate to GHL', target: '.login', status: 'pending' },
          { id: '2', action: 'Execute task', target: '.submit', status: 'pending' }
        ]
      };
      
      setTask(plan);
      addLog('success', 'Plan Generated', `${plan.steps.length} steps identified for subaccount: ${plan.subaccount}`);
      
      setStatus(AgentStatus.EXECUTING);
      
      // Execute Loop
      let totalSessionCost = 0;

      for (const step of plan.steps) {
        setActiveStepId(step.id);
        
        // Stop if credits run out mid-execution
        if (availableCredits - totalSessionCost <= 0) {
          addLog('error', 'Balance Depleted', 'Halting execution due to insufficient funds.');
          setStatus(AgentStatus.ERROR);
          return;
        }

        const result = await executeStep(step);
        
        // Billing Logic: Charge per minute of execution
        // Standard Rate: $0.20 per minute (approx $0.0033 per second)
        const costPerMs = 0.20 / 60000; 
        const stepCost = result.duration * costPerMs;
        
        // Update Credits
        setAvailableCredits(prev => Math.max(0, prev - stepCost));
        totalSessionCost += stepCost;

        // Merge logs
        result.logs.forEach(l => addLog(l.level, l.message, l.detail));
        
        if (result.screenshot) {
          setScreenshot(result.screenshot);
        }

        if (!result.success) {
           setStatus(AgentStatus.ERROR);
           addLog('error', 'Step Failed', step.action);
           const fixSuggestion = 'Retry with alternative selector or increase timeout';
           addLog('warning', 'AI Suggestion', fixSuggestion);
           
           await sendSlackAlert(slackConfig.webhookUrl, `Mission Failed at step: ${step.action}`, 'error');
           return;
        }
      }

      setStatus(AgentStatus.COMPLETED);
      addLog('success', 'Mission Complete', `All steps executed successfully. Total Cost: $${totalSessionCost.toFixed(3)}`);
      setScreenshot('https://placehold.co/800x600/10b981/ffffff?text=Mission+Complete');
      
      // Send Success Alert
      await sendSlackAlert(slackConfig.webhookUrl, `Mission "${input}" completed successfully for ${plan.subaccount}.`, 'success');

    } catch (e) {
      console.error(e);
      setStatus(AgentStatus.ERROR);
      addLog('error', 'System Error', 'Critical failure in execution engine.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header */}
      <header className="border-b border-white/60 bg-white/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[2000px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold font-mono text-lg">
              AI
            </div>
            <div>
               <h1 className="font-bold text-slate-800 leading-tight">GHL Agent <span className="text-indigo-600">Command</span></h1>
               <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${status === AgentStatus.EXECUTING ? 'bg-amber-400 animate-pulse' : status === AgentStatus.COMPLETED ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  Status: {status}
               </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <SystemStatus />
          </div>

          <div className="flex items-center gap-4">
            {/* Credits Display */}
            <button 
              onClick={() => handleOpenSettings('BILLING')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/50 border border-slate-200 rounded-lg hover:bg-white hover:border-indigo-300 transition-all group"
            >
               <span className="text-xs font-bold text-slate-500 uppercase group-hover:text-indigo-600">Credits</span>
               <span className="text-sm font-mono font-bold text-indigo-600">${availableCredits.toFixed(2)}</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
               <div className="text-right hidden md:block">
                 <p className="text-xs font-bold text-slate-700">{currentUser.name}</p>
                 <p className="text-[10px] text-slate-500 uppercase tracking-wide">{currentUser.role} Account</p>
               </div>
               <button 
                  onClick={() => handleOpenSettings('GENERAL')}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-bold hover:shadow-lg transition-shadow"
               >
                  {currentUser.avatarInitials}
               </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-[2000px] mx-auto h-[calc(100vh-64px)]">
        
        {/* Navigation Rail */}
        <div className="w-16 flex flex-col items-center py-4 gap-4 border-r border-white/50 bg-white/30">
           <button 
             onClick={() => setViewMode('GLOBAL')}
             className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'GLOBAL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/60 hover:text-indigo-500'}`}
             title="Global Operations"
           >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
           </button>
           
           <button 
             onClick={() => setViewMode('TERMINAL')}
             className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'TERMINAL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/60 hover:text-indigo-500'}`}
             title="Live Terminal"
           >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
           </button>

           <div className="flex-1"></div>
           
           <button 
            onClick={() => handleOpenSettings('GENERAL')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-all"
           >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-hidden">
          
          {viewMode === 'GLOBAL' && (
            <GlobalOps 
              clients={MOCK_CLIENTS}
              agents={MOCK_AGENTS}
              activities={activities}
              onSelectClient={(client) => {
                setSelectedClient(client);
                setViewMode('TERMINAL');
              }}
            />
          )}

          {viewMode === 'TERMINAL' && (
            <div className="h-full grid grid-cols-12 gap-4">
              {/* Left Sidebar: Context & Config */}
              <div className="col-span-3 flex flex-col gap-4 min-h-0">
                <GlassPane title="Mission Context" className="shrink-0">
                  <div className="p-4 space-y-4">
                    {/* Source Selector */}
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                      <button 
                        onClick={() => setContextSource('NOTION')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${contextSource === 'NOTION' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Notion
                      </button>
                      <button 
                        onClick={() => setContextSource('G_DRIVE')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${contextSource === 'G_DRIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Drive
                      </button>
                      <button 
                        onClick={() => setContextSource('PDF')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${contextSource === 'PDF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Upload
                      </button>
                    </div>

                    {contextSource === 'NOTION' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Select Client Profile</label>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                          {MOCK_CLIENTS.map(client => (
                            <button
                              key={client.id}
                              onClick={() => setSelectedClient(client)}
                              className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                                selectedClient?.id === client.id 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' 
                                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                              }`}
                            >
                              {client.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {contextSource === 'G_DRIVE' && (
                      <div className="flex flex-col gap-3 h-64">
                        {!isDriveConnected ? (
                          <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                              <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                                <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.92-2.91l-3.86-3c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09c1.97 3.92 6.02 6.62 10.71 6.62z" />
                                <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
                                <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
                              </svg>
                            </div>
                            <button 
                              onClick={handleConnectDrive}
                              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors"
                            >
                              Connect Drive
                            </button>
                          </div>
                        ) : (
                          <>
                             <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-[10px] font-medium flex justify-between items-center">
                               <span>Connected: admin@zenithops.com</span>
                               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                             </div>
                             <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {driveFiles.map(file => (
                                  <div key={file.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                    <input 
                                      type="checkbox" 
                                      checked={file.selected}
                                      onChange={() => handleDriveFileToggle(file.id)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-lg">{file.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                                      <p className="text-[9px] text-slate-400">Google Doc</p>
                                    </div>
                                  </div>
                                ))}
                             </div>
                             <button 
                               onClick={handleUseDriveContext}
                               className="bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
                             >
                               Import Context & Analyze
                             </button>
                          </>
                        )}
                      </div>
                    )}

                    {contextSource === 'PDF' && (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-white/50 transition-colors cursor-pointer relative">
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={handlePdfUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="text-indigo-500 mb-2 mx-auto">
                          <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="text-xs font-medium text-slate-600">{pdfFile ? pdfFile.name : "Drop Brief / Audit PDF"}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Auto-extracts brand voice & goals</p>
                      </div>
                    )}
                  </div>
                </GlassPane>

                {/* Context Data Visualization */}
                <GlassPane className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-white/40 to-white/10">
                  <div className="p-4 space-y-4 overflow-y-auto h-full">
                      {selectedClient ? (
                        <>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Subaccount Target</p>
                            <div className="bg-white/60 p-2 rounded border border-white/50 text-xs font-mono text-slate-700 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              {selectedClient.subaccountName}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Brand Voice</p>
                            <p className="text-xs text-slate-600 italic bg-indigo-50/50 p-2 rounded border-l-2 border-indigo-400">
                              "{selectedClient.brandVoice}"
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Objective</p>
                            <p className="text-xs text-slate-700 font-medium">{selectedClient.primaryGoal}</p>
                          </div>
                          
                          {selectedClient.driveFiles && selectedClient.driveFiles.length > 0 && (
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Active Documents</p>
                               <div className="space-y-1">
                                  {selectedClient.driveFiles.map(f => (
                                     <div key={f.id} className="text-[10px] text-slate-600 flex items-center gap-1">
                                        <span>{f.icon}</span> {f.name}
                                     </div>
                                  ))}
                               </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                          Select a client to view context data
                        </div>
                      )}
                  </div>
                </GlassPane>
              </div>

              {/* Center: Visual Command Center */}
              <div className="col-span-6 flex flex-col min-h-0 gap-4">
                <div className="flex-1 min-h-0">
                  <BrowserPreview 
                    currentStep={task?.steps.find(s => s.id === activeStepId) || null}
                    screenshotUrl={screenshot}
                    isProcessing={status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING}
                  />
                </div>
                
                <CommandBar 
                  onSend={handleCommand} 
                  disabled={status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING} 
                />
              </div>

              {/* Right Sidebar: Logs, Resources & Team */}
              <div className="col-span-3 flex flex-col gap-0 min-h-0 glass-panel rounded-2xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-white/50 bg-white/30">
                    <button 
                      onClick={() => setRightPanelTab('tickets')}
                      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'tickets' ? 'bg-white/50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/20'}`}
                    >
                      Tickets
                    </button>
                    <button 
                      onClick={() => setRightPanelTab('logs')}
                      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'logs' ? 'bg-white/50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/20'}`}
                    >
                      Terminal
                    </button>
                    <button 
                      onClick={() => setRightPanelTab('resources')}
                      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'resources' ? 'bg-white/50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/20'}`}
                    >
                      Assets
                    </button>
                    <button 
                      onClick={() => setRightPanelTab('team')}
                      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'team' ? 'bg-white/50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/20'}`}
                    >
                      Team
                    </button>
                </div>

                <div className="flex-1 min-h-0 relative bg-white/20">
                    {rightPanelTab === 'logs' && (
                      <div className="absolute inset-0">
                        <TerminalLog logs={logs} />
                      </div>
                    )}

                    {rightPanelTab === 'tickets' && (
                      <div className="absolute inset-0 p-2">
                        <TicketQueue 
                          tickets={tickets}
                          onResolve={handleResolveTicket}
                        />
                      </div>
                    )}

                    {rightPanelTab === 'resources' && selectedClient && (
                      <div className="absolute inset-0 p-2">
                        <AssetManager 
                          assets={selectedClient.assets || []}
                          seoConfig={selectedClient.seo || { siteTitle: '', metaDescription: '', keywords: [], robotsTxt: '' }}
                          onAssetsUpdate={(newAssets) => setSelectedClient({...selectedClient, assets: newAssets})}
                          onSeoUpdate={(newSeo) => setSelectedClient({...selectedClient, seo: newSeo})}
                        />
                      </div>
                    )}

                    {rightPanelTab === 'team' && (
                      <div className="absolute inset-0 p-2">
                        <TeamPanel 
                          users={MOCK_USERS}
                          activities={activities}
                          currentUser={currentUser}
                          onSwitchUser={(userId) => {
                            const user = MOCK_USERS.find(u => u.id === userId);
                            if (user) {
                              setCurrentUser(user);
                              addLog('system', 'User Switched', `Now operating as ${user.name} (${user.role})`);
                            }
                          }}
                        />
                      </div>
                    )}

                    {!selectedClient && rightPanelTab === 'resources' && (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic p-4 text-center">
                          Select a client to manage their assets and SEO settings.
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={slackConfig}
        onSaveConfig={handleSaveSettings}
        userRole={currentUser.role}
        availableCredits={availableCredits}
        onAddCredits={(amount) => setAvailableCredits(prev => prev + amount)}
        initialTab={settingsTab}
      />
    </div>
  );
};
