
import React, { useState } from 'react';
import { ClientContext, AgentInstance, TeamActivity, AgentStatus } from '../types';
import { GlassPane } from './GlassPane';

interface GlobalOpsProps {
  clients: ClientContext[];
  agents: AgentInstance[];
  activities: TeamActivity[];
  onSelectClient: (client: ClientContext) => void;
}

export const GlobalOps: React.FC<GlobalOpsProps> = ({ clients, agents, activities, onSelectClient }) => {
  const [showGuide, setShowGuide] = useState(true);

  const getAgentForClient = (clientId: string) => agents.find(a => a.clientId === clientId);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.EXECUTING: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case AgentStatus.PLANNING: return 'text-amber-600 bg-amber-50 border-amber-200';
      case AgentStatus.ERROR: return 'text-red-600 bg-red-50 border-red-200';
      case AgentStatus.COMPLETED: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-1">

      {/* Fast Start Guide Panel */}
      {showGuide && (
        <div className="shrink-0 relative group animate-slide-in-top duration-700">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl opacity-20 blur group-hover:opacity-30 transition duration-1000"></div>
          <GlassPane className="relative p-6">
            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors" title="Dismiss Guide">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg text-white shrink-0">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Command Center</h2>
                <p className="text-slate-600 max-w-3xl mb-6 leading-relaxed">
                  This dashboard is your central hub for managing autonomous AI operations across your agency.
                  Follow these 3 steps to launch your first mission:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-white/60 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-inner">1</div>
                    <div>
                      <p className="font-bold text-slate-800">Select Client</p>
                      <p className="text-xs text-slate-500">Choose a sub-account below</p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-white/60 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-lg shadow-inner">2</div>
                    <div>
                      <p className="font-bold text-slate-800">Enter Terminal</p>
                      <p className="text-xs text-slate-500">Access the live agent console</p>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-white/60 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-inner">3</div>
                    <div>
                      <p className="font-bold text-slate-800">Issue Command</p>
                      <p className="text-xs text-slate-500">"Clone funnel", "Fix workflow"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassPane>
        </div>
      )}

      {/* High Level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <GlassPane className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sub-accounts</p>
            <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
          </div>
        </GlassPane>
        <GlassPane className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Agents</p>
            <p className="text-2xl font-bold text-slate-800">{agents.filter(a => a.status === AgentStatus.EXECUTING).length}</p>
          </div>
        </GlassPane>
        <GlassPane className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tasks Pending</p>
            <p className="text-2xl font-bold text-slate-800">12</p>
          </div>
        </GlassPane>
        <GlassPane className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Issues</p>
            <p className="text-2xl font-bold text-slate-800">1</p>
          </div>
        </GlassPane>
      </div>

      {/* Subaccount Grid */}
      <div className="flex-1 min-h-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Live Operations Matrix
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">Global View</span>
          </h2>
          <button className="text-xs font-bold text-indigo-600 hover:underline bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm transition-all hover:shadow-md">View All Agents</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const agent = getAgentForClient(client.id);
            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="bg-white/60 hover:bg-white border border-white/60 hover:border-indigo-200 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:from-indigo-100 opacity-50"></div>

                <div className="flex justify-between items-start relative mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                    {client.name.charAt(0)}
                  </div>
                  {agent && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <h3 className="font-bold text-slate-800 text-lg truncate">{client.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mb-4">{client.subaccountId}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Last Activity</span>
                      <span className="font-medium text-slate-600">{agent?.lastActive || 'Never'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Campaigns</span>
                      <span className="font-medium text-slate-600">Active</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">Enter Terminal</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Add New Client Card */}
          <button className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center gap-4 p-6 transition-all group min-h-[200px]">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="font-bold text-slate-500 group-hover:text-indigo-600">Connect Sub-account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
