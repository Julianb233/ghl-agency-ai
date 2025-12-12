
import React, { useState, useEffect } from 'react';
import { SlackConfig, UserRole, SettingsTab, AddOn, BillingHistory } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SlackConfig;
  onSaveConfig: (config: SlackConfig) => void;
  userRole: UserRole;
  availableCredits: number;
  onAddCredits: (amount: number) => void;
  initialTab?: SettingsTab;
}

const MOCK_ADDONS: AddOn[] = [
  {
    id: 'stealth-ip',
    title: 'Stealth Residential IP',
    description: 'Route all agent traffic through premium residential proxies to avoid bot detection on complex sites.',
    price: 15.00,
    type: 'MONTHLY',
    active: false,
    icon: '🕵️'
  },
  {
    id: 'neural-mem',
    title: 'Neural Long-Term Memory',
    description: 'Vector database storage allowing the agent to remember context across different sessions and days.',
    price: 29.00,
    type: 'MONTHLY',
    active: true,
    icon: '🧠'
  },
  {
    id: 'priority-q',
    title: 'Priority Execution Queue',
    description: 'Skip the line during peak hours. Your tasks are processed on dedicated high-availability GPU clusters.',
    price: 49.00,
    type: 'MONTHLY',
    active: false,
    icon: '⚡'
  },
  {
    id: 'whitelabel-reports',
    title: 'White-label PDF Reports',
    description: 'Remove all GHL Agent branding from generated audit reports and client emails.',
    price: 99.00,
    type: 'ONE_TIME',
    active: false,
    icon: '📄'
  }
];

const MOCK_HISTORY: BillingHistory[] = [
  { id: '1', date: 'Oct 24, 10:42 AM', description: 'Task: Funnel Clone', amount: -0.45, type: 'CHARGE' },
  { id: '2', date: 'Oct 23, 09:15 AM', description: 'Credit Top-up', amount: 50.00, type: 'CREDIT' },
  { id: '3', date: 'Oct 22, 04:20 PM', description: 'Task: Workflow Fix', amount: -1.20, type: 'CHARGE' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onSaveConfig, 
  userRole,
  availableCredits,
  onAddCredits,
  initialTab = 'GENERAL'
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [localSlackConfig, setLocalSlackConfig] = useState<SlackConfig>(config);
  const [addOns, setAddOns] = useState<AddOn[]>(MOCK_ADDONS);

  useEffect(() => {
    if (isOpen) {
      setLocalSlackConfig(config);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, config, initialTab]);

  if (!isOpen) return null;

  const handleTopUp = (amount: number) => {
    // In a real app, this would trigger Stripe
    onAddCredits(amount);
  };

  const toggleAddOn = (id: string) => {
    setAddOns(prev => prev.map(addon => 
      addon.id === id ? { ...addon, active: !addon.active } : addon
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden border border-slate-200">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">Settings</h2>
          
          <button onClick={() => setActiveTab('GENERAL')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}>
            General
          </button>
          <button onClick={() => setActiveTab('INTEGRATIONS')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'INTEGRATIONS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}>
            Integrations
          </button>
          <button onClick={() => setActiveTab('BILLING')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-between items-center ${activeTab === 'BILLING' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}>
            Billing & Usage
            <span className="bg-white/20 px-1.5 rounded text-[10px]">${availableCredits.toFixed(0)}</span>
          </button>
          <button onClick={() => setActiveTab('ADDONS')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ADDONS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}>
            Add-ons & Power-ups
          </button>
          {userRole === 'OWNER' && (
            <button onClick={() => setActiveTab('WHITELABEL')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'WHITELABEL' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}>
              White Label
            </button>
          )}

          <div className="flex-1"></div>
          <button onClick={onClose} className="text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
            Close Settings
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          
          {/* --- GENERAL TAB --- */}
          {activeTab === 'GENERAL' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Agency Profile</h3>
                <p className="text-slate-500 text-sm">Manage your agency identity and default settings.</p>
              </div>
              <div className="grid gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Agency Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3" defaultValue="Zenith Growth Ops" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Admin Email</label>
                  <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3" defaultValue="admin@zenithops.com" />
                </div>
              </div>
            </div>
          )}

          {/* --- INTEGRATIONS TAB --- */}
          {activeTab === 'INTEGRATIONS' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">System Integrations</h3>
                <p className="text-slate-500 text-sm">Connect external tools to your command center.</p>
              </div>

              {/* Slack Config */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-[#4A154B] text-white rounded-lg flex items-center justify-center font-bold text-xl">S</div>
                     <div>
                       <h4 className="font-bold text-slate-800">Slack Notifications</h4>
                       <p className="text-xs text-slate-500">Receive mission alerts in your channel.</p>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={localSlackConfig.enabled} onChange={(e) => setLocalSlackConfig({...localSlackConfig, enabled: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {localSlackConfig.enabled && (
                   <div className="mt-4">
                     <input 
                       type="text" 
                       value={localSlackConfig.webhookUrl} 
                       onChange={(e) => setLocalSlackConfig({...localSlackConfig, webhookUrl: e.target.value})} 
                       placeholder="https://hooks.slack.com/..." 
                       className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                     />
                   </div>
                )}
              </div>

              <button 
                onClick={() => onSaveConfig(localSlackConfig)}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* --- BILLING TAB --- */}
          {activeTab === 'BILLING' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Credits & Usage</h3>
                  <p className="text-slate-500 text-sm">
                    Pricing Model: <span className="font-bold text-emerald-600">$1.00 = 1 Credit</span>. <br/>
                    Agents are charged based on execution time (~$0.20 / min).
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Balance</p>
                  <p className="text-4xl font-bold text-emerald-600">${availableCredits.toFixed(2)}</p>
                </div>
              </div>

              {/* Top Up Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {[10, 50, 100].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => handleTopUp(amt)}
                    className="bg-white border border-slate-200 hover:border-emerald-500 p-6 rounded-2xl text-center group transition-all hover:shadow-xl hover:-translate-y-1"
                  >
                    <p className="text-lg font-bold text-slate-600 group-hover:text-emerald-600">Buy {amt} Credits</p>
                    <p className="text-3xl font-bold text-slate-800 my-2">${amt}</p>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">One-time charge</span>
                  </button>
                ))}
              </div>

              {/* Transaction History */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Recent Activity</span>
                  <span className="text-xs font-bold text-slate-500 uppercase">Amount</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {MOCK_HISTORY.map((h) => (
                    <div key={h.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{h.description}</p>
                        <p className="text-xs text-slate-400">{h.date}</p>
                      </div>
                      <span className={`text-sm font-mono font-bold ${h.type === 'CHARGE' ? 'text-slate-600' : 'text-emerald-600'}`}>
                        {h.type === 'CHARGE' ? '-' : '+'}${Math.abs(h.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- ADDONS TAB --- */}
          {activeTab === 'ADDONS' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Power-ups & Add-ons</h3>
                <p className="text-slate-500 text-sm">Enhance your agent's capabilities with premium modules.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {addOns.map(addon => (
                  <div key={addon.id} className={`p-6 rounded-2xl border transition-all ${addon.active ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-3xl">{addon.icon}</div>
                      <button 
                        onClick={() => toggleAddOn(addon.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${addon.active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {addon.active ? 'ACTIVE' : 'ENABLE'}
                      </button>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">{addon.title}</h4>
                    <p className="text-sm text-slate-500 my-2 min-h-[40px]">{addon.description}</p>
                    <div className="pt-4 mt-4 border-t border-emerald-100/50 flex items-center justify-between">
                      <span className="text-lg font-bold text-emerald-900">${addon.price}<span className="text-xs font-normal text-slate-500">{addon.type === 'MONTHLY' ? '/mo' : ' one-time'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- WHITELABEL TAB --- */}
          {activeTab === 'WHITELABEL' && (
            <div className="max-w-2xl space-y-8">
               <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">White Label Branding</h3>
                <p className="text-slate-500 text-sm">Customize the portal for your sub-agencies.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <div className="text-amber-600">⚠️</div>
                <p className="text-sm text-amber-700">This section requires the "Partner" plan. Please contact sales to unlock custom CNAME and SMTP configuration.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
