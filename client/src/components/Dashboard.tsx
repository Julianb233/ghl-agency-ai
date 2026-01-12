import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { useTourStore } from '@/stores/tourStore';
import { CommandCenter } from './dashboard/CommandCenter';
import { SetupChecklist } from './dashboard/SetupChecklist';
// Gemini service removed - will be implemented server-side via tRPC
import { MissionStatus } from './MissionStatus';
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
import { EmailAgentPanel } from './EmailAgentPanel';
import { VoiceAgentPanel } from './VoiceAgentPanel';
import { SettingsView } from './SettingsView';
import { SEOManager } from './SEOManager';
import { AdManagerPanel } from './AdManagerPanel';
import { MarketplacePanel } from './MarketplacePanel';
import { AIBrowserPanel } from './AIBrowserPanel';
import { SkipLink } from './SkipLink';
import { ClientProfileModal } from './ClientProfileModal';
import { AgentDashboard } from './agent/AgentDashboard';
import { SubscriptionUsageCard, UpgradeModal, ExecutionPacksModal } from './subscription';
import { SwarmView } from './swarm/SwarmView';
import { MobileBottomNav } from './navigation/MobileBottomNav';
import { Home, Terminal, Mail, Globe, Settings, Bot, Zap, Network } from 'lucide-react';

// Demo data only loaded when VITE_DEMO_MODE=1 (disabled by default in production)

const DEFAULT_USER: User = {
  id: "current-user",
  name: "You",
  role: "OWNER",
  avatarInitials: "YOU",
  isOnline: true,
};

interface DashboardProps {
  userTier: string; // 'STARTER' | 'GROWTH' | 'WHITELABEL'
  credits: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ userTier, credits: initialCredits }) => {
  // Demo mode disabled by default for production (set VITE_DEMO_MODE=1 to enable)
  const isDemo = import.meta.env.VITE_DEMO_MODE === '1';

  // URL-based routing (wouter)
  const [location, setLocation] = useLocation();

  // Welcome tour - only show once after user reaches dashboard (post-onboarding)
  const { hasSeenWelcome, autoStartTours, startTour, setHasSeenWelcome } = useTourStore();

  useEffect(() => {
    if (autoStartTours && !hasSeenWelcome) {
      // Delay slightly to let dashboard render first
      const timer = setTimeout(() => {
        startTour('welcome');
        setHasSeenWelcome(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoStartTours, hasSeenWelcome, startTour, setHasSeenWelcome]);

  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [task, setTask] = useState<AgentTask | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [availableCredits, setAvailableCredits] = useState(initialCredits);

  // Subscription State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);

  // Fetch subscription data
  const subscriptionQuery = trpc.subscription.getMySubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Context & Resources State
  const [contextSource, setContextSource] = useState<'NOTION' | 'PDF' | 'G_DRIVE'>('NOTION');
  const [selectedClient, setSelectedClient] = useState<ClientContext | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Drive State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  // Client list state - fetched from backend
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientContext | null>(null);

  // Fetch client profiles from backend
  const clientProfilesQuery = trpc.clientProfiles.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const clients: ClientContext[] = (clientProfilesQuery.data?.data || []).map((profile: any) => ({
    id: `client_${profile.id}`,
    source: 'MANUAL' as const,
    name: profile.name,
    subaccountName: profile.subaccountName || '',
    subaccountId: profile.subaccountId || '',
    brandVoice: profile.brandVoice || '',
    primaryGoal: profile.primaryGoal || '',
    website: profile.website || '',
    seo: typeof profile.seoConfig === 'string' ? JSON.parse(profile.seoConfig) : (profile.seoConfig || { siteTitle: '', metaDescription: '', keywords: [], robotsTxt: '' }),
    assets: typeof profile.assets === 'string' ? JSON.parse(profile.assets) : (profile.assets || []),
    _dbId: profile.id, // Store the DB ID for updates
  }));

  // Create client profile mutation
  const createClientMutation = trpc.clientProfiles.create.useMutation({
    onSuccess: () => {
      clientProfilesQuery.refetch();
      addLog('success', 'Client Profile Created', 'New client profile added successfully');
    },
    onError: (error) => {
      console.error('Failed to create client profile:', error);
      addLog('error', 'Failed to Create Profile', error.message);
    },
  });

  // Update client profile mutation
  const updateClientMutation = trpc.clientProfiles.update.useMutation({
    onSuccess: () => {
      clientProfilesQuery.refetch();
      addLog('success', 'Client Profile Updated', 'Client profile updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update client profile:', error);
      addLog('error', 'Failed to Update Profile', error.message);
    },
  });

  const handleSaveClientProfile = async (profileData: Omit<ClientContext, 'id' | 'source'>) => {
    if (editingClient && (editingClient as any)._dbId) {
      // Update existing profile
      await updateClientMutation.mutateAsync({
        id: (editingClient as any)._dbId,
        name: profileData.name,
        subaccountName: profileData.subaccountName,
        subaccountId: profileData.subaccountId,
        brandVoice: profileData.brandVoice,
        primaryGoal: profileData.primaryGoal,
        website: profileData.website,
        seoConfig: profileData.seo,
        assets: profileData.assets,
      });
    } else {
      // Create new profile
      await createClientMutation.mutateAsync({
        name: profileData.name,
        subaccountName: profileData.subaccountName,
        subaccountId: profileData.subaccountId,
        brandVoice: profileData.brandVoice,
        primaryGoal: profileData.primaryGoal,
        website: profileData.website,
        seoConfig: profileData.seo,
        assets: profileData.assets,
      });
    }
    setEditingClient(null);
  };

  // User/Team State
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [users] = useState<User[]>([DEFAULT_USER]); // Team users list
  const [activities] = useState<TeamActivity[]>([]);

  // Ticket State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('GENERAL');
  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    enabled: false,
    webhookUrl: ''
  });

  // Right Sidebar Tab State
  const [rightPanelTab, setRightPanelTab] = useState<'logs' | 'team' | 'resources' | 'tickets'>('tickets');

  // Mobile Terminal Tab State
  const [mobileTerminalTab, setMobileTerminalTab] = useState<'CONTEXT' | 'BROWSER' | 'LOGS'>('BROWSER');

  // Load settings on mount
  // Logout Mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Force reload to clear state and redirect to landing
      window.location.href = '/';
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const saved = localStorage.getItem('ghl_agent_slack_config');
    if (saved) {
      try {
        setSlackConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings');
      }
    }
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
    addLog('info', 'Ticket Triage', `Starting resolution for Ticket #${ticket.id.slice(0, 4)}`);

    // 2. Switch to Logs view to see progress
    setRightPanelTab('logs');

    // 3. Execute Command
    handleCommand(command);
  };

  // AI Session Start Mutation
  const startSessionMutation = trpc.ai.startSession.useMutation({
    onSuccess: (response) => {
      if (response.liveViewUrl) {
        setLiveViewUrl(response.liveViewUrl);
        addLog('info', 'Live View Available', 'Browser session started');
      }
      if (response.sessionId) {
        addLog('info', 'Session ID', response.sessionId);
      }
    },
    onError: (error) => {
      console.error("Failed to start session:", error);
      addLog('error', 'Session Error', 'Failed to initialize browser session');
    }
  });

  // AI Chat Mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      // Update logs with AI response
      addLog('success', 'AI Response', 'Received response from AI agent');

      // If backend returned a live view URL or session info, reflect it in the UI
      if (response.liveViewUrl) {
        setLiveViewUrl(response.liveViewUrl);
        addLog('info', 'Live View Available', response.liveViewUrl);
      }

      if (response.sessionId) {
        addLog('info', 'Session ID', response.sessionId);
      }

      // Add assistant message to logs
      if (response.message) {
        addLog('info', 'AI', response.message);
      }

      setStatus(AgentStatus.COMPLETED);
    },
    onError: (error) => {
      console.error(error);
      setStatus(AgentStatus.ERROR);
      addLog('error', 'AI Error', error.message);
    }
  });

  const [liveViewUrl, setLiveViewUrl] = useState<string | undefined>(undefined);
  const [currentGoal, setCurrentGoal] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [sseEventSource, setSseEventSource] = useState<EventSource | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (sseEventSource) {
        sseEventSource.close();
      }
    };
  }, [sseEventSource]);

  // Connect to SSE stream for real-time updates
  const connectToSSE = (sessionId: string) => {
    // Close existing connection if any
    if (sseEventSource) {
      sseEventSource.close();
    }

    addLog('info', 'Connecting to live stream...', `Session: ${sessionId}`);

    const eventSource = new EventSource(`/api/ai/stream/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        console.log('[SSE] Received update:', update);

        switch (update.type) {
          case 'connected':
            addLog('info', 'Live Stream Connected', 'Receiving real-time updates');
            break;
          case 'session_created':
            addLog('info', 'Browser Session Created', update.message || 'Starting browser...');
            break;
          case 'live_view_ready':
            if (update.data?.liveViewUrl) {
              setLiveViewUrl(update.data.liveViewUrl);
              addLog('success', 'Live View Ready!', 'Browser is now visible');
            }
            break;
          case 'navigation':
            if (update.data?.url) {
              addLog('info', 'Navigating', `Going to: ${update.data.url}`);
            }
            break;
          case 'action_start':
            if (update.data?.action) {
              addLog('info', 'Executing Action', update.data.action);
              setStatus(AgentStatus.EXECUTING);
            }
            break;
          case 'action_complete':
            addLog('success', 'Action Complete', update.message || 'Action finished successfully');
            break;
          case 'error':
            addLog('error', 'Error', update.message || 'An error occurred');
            setStatus(AgentStatus.ERROR);
            break;
          case 'complete':
            addLog('success', 'Task Complete', update.message || 'All actions completed');
            setStatus(AgentStatus.COMPLETED);
            break;
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      eventSource.close();
      setSseEventSource(null);
    };

    setSseEventSource(eventSource);
  };

  const handleNewSession = () => {
    // Close SSE connection
    if (sseEventSource) {
      sseEventSource.close();
      setSseEventSource(null);
    }

    // Reset session state
    setCurrentSessionId(undefined);
    setLiveViewUrl(undefined);
    setLogs([]);
    setScreenshot(undefined);
    setStatus(AgentStatus.IDLE);
    setCurrentGoal('');

    addLog('info', 'New Session Started', 'Previous session closed, ready for new tasks');
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

    // Only clear logs and reset state if starting a NEW session
    if (!currentSessionId) {
      setLogs([]);
      setScreenshot(undefined);
      setLiveViewUrl(undefined);
    }

    setCurrentGoal(input);

    try {
      setStatus(AgentStatus.PLANNING);

      // Only create a new session if we don't have one
      let sessionIdToUse = currentSessionId;

      if (!sessionIdToUse) {
        addLog('info', 'Creating browser session...', 'Initializing Browserbase');
        const sessionResult = await startSessionMutation.mutateAsync({});

        if (!sessionResult.sessionId) {
          throw new Error('Failed to create browser session');
        }

        sessionIdToUse = sessionResult.sessionId;
        setCurrentSessionId(sessionIdToUse);
        setLiveViewUrl(sessionResult.liveViewUrl);

        addLog('info', 'Session Created', `ID: ${sessionIdToUse.slice(0, 8)}`);
        addLog('info', 'Connecting to live stream...', 'Setting up real-time updates');

        // Connect to SSE BEFORE executing the command
        connectToSSE(sessionIdToUse);

        // Give SSE connection time to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        addLog('info', 'Reusing session', `ID: ${sessionIdToUse.slice(0, 8)}`);
        // Ensure SSE is connected for existing session
        if (!sseEventSource) {
          addLog('info', 'Reconnecting to live stream...', 'Re-establishing updates');
          connectToSSE(sessionIdToUse);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setStatus(AgentStatus.EXECUTING);
      addLog('info', 'Executing command...', input);

      // Execute the command with the session
      const chatResult = await chatMutation.mutateAsync({
        messages: [
          { role: 'system', content: `You are an AI agent acting on behalf of ${selectedClient.name}. Subaccount: ${selectedClient.subaccountName}.` },
          { role: 'user', content: input }
        ],
        modelName: 'claude-3-7-sonnet-latest',
        sessionId: sessionIdToUse, // Use the session (new or existing)
        keepOpen: true, // Keep session open for follow-up commands
      });

      addLog('info', 'Browserbase Dashboard', `https://www.browserbase.com/sessions/${sessionIdToUse}`);
      addLog('success', 'Command Complete', chatResult.message || 'Task finished')

      // Show the live view URL
      if (chatResult.liveViewUrl) {
        setLiveViewUrl(chatResult.liveViewUrl);
        addLog('success', 'Live View Available', 'You can now watch the browser in real-time');
      }

      // Add success message
      if (chatResult.message) {
        addLog('success', 'AI Response', chatResult.message);
      }

      setStatus(AgentStatus.COMPLETED);

    } catch (e) {
      console.error(e);
      setStatus(AgentStatus.ERROR);
      addLog('error', 'System Error', 'Critical failure in execution engine.');
    }
  };

  return (
    <CommandCenter>
      {/* Skip Navigation Link for Accessibility */}
      <SkipLink href="#dashboard-main" />

      {/* Main Dashboard Home View - shown when location is exactly /dashboard */}
      {location === '/dashboard' && (
        <div className="space-y-6">
          {/* Setup Checklist Widget */}
          <SetupChecklist onNavigate={setLocation} />

          {/* Dashboard Overview Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats or Recent Activity */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <p className="text-slate-400 text-sm">Your recent agent executions and tasks will appear here.</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setLocation('/dashboard/agents')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                >
                  <div className="font-medium">Launch an Agent</div>
                  <div className="text-xs text-slate-400">Run browser automation tasks</div>
                </button>
                <button
                  onClick={() => setLocation('/dashboard/workflows')}
                  className="w-full text-left px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                >
                  <div className="font-medium">Create a Workflow</div>
                  <div className="text-xs text-slate-400">Automate repetitive processes</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Terminal View - Keep for now, will be migrated */}
      {location === '/dashboard/terminal' && (
            <div className="h-full flex flex-col md:grid md:grid-cols-12 gap-4 overflow-hidden">

              {/* Mobile Terminal Tabs */}
              <div className="md:hidden flex bg-gray-100 p-1 rounded-lg mb-2 shrink-0">
                <button
                  onClick={() => setMobileTerminalTab('CONTEXT')}
                  className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-md transition-all ${mobileTerminalTab === 'CONTEXT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Context
                </button>
                <button
                  onClick={() => setMobileTerminalTab('BROWSER')}
                  className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-md transition-all ${mobileTerminalTab === 'BROWSER' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Browser
                </button>
                <button
                  onClick={() => setMobileTerminalTab('LOGS')}
                  className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-md transition-all ${mobileTerminalTab === 'LOGS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Logs & Tools
                </button>
              </div>

              {/* Left Sidebar: Context & Config */}
              <div className={`${mobileTerminalTab === 'CONTEXT' ? 'flex' : 'hidden'} md:flex col-span-1 md:col-span-3 flex-col gap-4 h-full min-h-0 order-2 md:order-1 overflow-hidden`}>

                {/* Mission Context Panel */}
                <div className="flex-1 min-h-0">
                  {(status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING) ? (
                    <MissionStatus
                      goal={currentGoal}
                      status={status}
                      logs={logs}
                    />
                  ) : (
                    <GlassPane title="Mission Context" className="h-full">
                      <div className="p-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase">Select Client Profile</label>
                            <button
                              onClick={() => {
                                setEditingClient(null);
                                setIsClientModalOpen(true);
                              }}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                              title="Add New Client"
                              aria-label="Add New Client"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {clientProfilesQuery.isLoading && (
                              <p className="text-xs text-slate-500">
                                Loading client profiles...
                              </p>
                            )}
                            {!clientProfilesQuery.isLoading && clients.length === 0 && (
                              <p className="text-xs text-slate-500">
                                No client profiles yet. Click the + button above to add your first client.
                              </p>
                            )}
                            {clients.map(client => (
                              <button
                                key={client.id}
                                onClick={() => setSelectedClient(client)}
                                className={`w-full text-left p-3 min-h-[44px] rounded-lg border transition-all ${selectedClient?.id === client.id
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium shadow-sm'
                                  : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                                  }`}
                              >
                                <div className="font-bold text-sm">{client.name}</div>
                                <div className="text-xs text-slate-500 mt-1">{client.subaccountName}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedClient && (
                          <div className="pt-4 border-t border-slate-200">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <span className="text-xs font-bold text-emerald-700">Active Client</span>
                              </div>
                              <p className="text-sm font-bold text-emerald-900">{selectedClient.name}</p>
                              <p className="text-xs text-emerald-600 mt-1">{selectedClient.primaryGoal}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassPane>
                  )}
                </div>

                {/* Quick Actions / Tools */}
                <div className="shrink-0">
                  <GlassPane title="Quick Actions">
                    <div className="p-3 grid grid-cols-2 gap-2">
                      <button className="p-3 min-h-[44px] bg-slate-50 hover:bg-emerald-50 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-600 transition flex flex-col items-center justify-center gap-1 border border-slate-100 hover:border-emerald-200">
                        <span className="text-lg">🔍</span>
                        Audit Site
                      </button>
                      <button className="p-3 min-h-[44px] bg-slate-50 hover:bg-emerald-50 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-600 transition flex flex-col items-center justify-center gap-1 border border-slate-100 hover:border-emerald-200">
                        <span className="text-lg">⚡</span>
                        Speed Test
                      </button>
                      <button className="p-3 min-h-[44px] bg-slate-50 hover:bg-emerald-50 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-600 transition flex flex-col items-center justify-center gap-1 border border-slate-100 hover:border-emerald-200">
                        <span className="text-lg">📸</span>
                        Screenshot
                      </button>
                      <button className="p-3 min-h-[44px] bg-slate-50 hover:bg-emerald-50 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-600 transition flex flex-col items-center justify-center gap-1 border border-slate-100 hover:border-emerald-200">
                        <span className="text-lg">📝</span>
                        Summarize
                      </button>
                    </div>
                  </GlassPane>
                </div>
              </div>

              {/* Center: Visual Command Center */}
              <div className={`${mobileTerminalTab === 'BROWSER' ? 'flex' : 'hidden'} md:flex col-span-1 md:col-span-6 flex-col h-full min-h-0 gap-4 order-1 md:order-2 overflow-hidden`}>
                <div className="flex-1 min-h-0 relative">
                  <BrowserPreview
                    currentStep={task?.steps.find(s => s.id === activeStepId) || null}
                    screenshotUrl={screenshot}
                    liveViewUrl={liveViewUrl}
                    isProcessing={status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING}
                    sessionId={currentSessionId}
                    isStreaming={sseEventSource !== null}
                  />
                </div>

                <div className="shrink-0">
                  <CommandBar
                    onSend={handleCommand}
                    disabled={status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING}
                    hasActiveSession={currentSessionId !== undefined}
                    onNewSession={handleNewSession}
                  />
                </div>
              </div>

              {/* Right Sidebar: Logs, Resources & Team */}
              <div className={`${mobileTerminalTab === 'LOGS' ? 'flex' : 'hidden'} md:flex col-span-1 md:col-span-3 flex-col gap-0 h-full min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden order-3`}>
                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setRightPanelTab('tickets')}
                    className={`flex-1 py-3 min-h-[44px] text-xs font-bold transition-colors ${rightPanelTab === 'tickets' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Tickets
                  </button>
                  <button
                    onClick={() => setRightPanelTab('logs')}
                    className={`flex-1 py-3 min-h-[44px] text-xs font-bold transition-colors ${rightPanelTab === 'logs' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => setRightPanelTab('team')}
                    className={`flex-1 py-3 min-h-[44px] text-xs font-bold transition-colors ${rightPanelTab === 'team' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Team
                  </button>
                  <button
                    onClick={() => setRightPanelTab('resources')}
                    className={`flex-1 py-3 min-h-[44px] text-xs font-bold transition-colors ${rightPanelTab === 'resources' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Resources
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto bg-white p-0">
                  {rightPanelTab === 'logs' && (
                    <TerminalLog logs={logs} />
                  )}

                  {rightPanelTab === 'team' && (
                    <TeamPanel
                      users={users}
                      currentUser={currentUser}
                      activities={activities}
                      onInvite={() => { }}
                    />
                  )}

                  {rightPanelTab === 'tickets' && (
                    <TicketQueue
                      tickets={tickets}
                      onResolve={handleResolveTicket}
                    />
                  )}

                  {rightPanelTab === 'resources' && (
                    <AssetManager
                      assets={selectedClient?.assets || []}
                      seoConfig={selectedClient?.seo || { siteTitle: '', metaDescription: '', keywords: [], robotsTxt: '' }}
                      onAssetsUpdate={(assets) => {
                        if (selectedClient) {
                          setSelectedClient({ ...selectedClient, assets });
                        }
                      }}
                      onSeoUpdate={(seo) => {
                        if (selectedClient) {
                          setSelectedClient({ ...selectedClient, seo });
                        }
                      }}
                    />
                  )}
                </div>
              </div>

            </div>
      )}

      {/* Modals */}
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

      <ClientProfileModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClientProfile}
        existingProfile={editingClient}
      />

      {/* Subscription Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTierSlug={subscriptionQuery.data?.tier?.slug}
      />
      <ExecutionPacksModal
        isOpen={showPacksModal}
        onClose={() => setShowPacksModal(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </CommandCenter>
  );
};
