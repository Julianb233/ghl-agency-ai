
import React, { useState } from 'react';

export const SystemStatus: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const systems = [
    { name: 'Notion Knowledge Base', status: 'synced', lastSync: 'Just now', icon: 'N' },
    { name: 'Slack Ops Channel', status: 'live', lastSync: 'Listening', icon: 'S' },
    { name: 'NeonDB Audit Log', status: 'active', lastSync: 'Recording', icon: 'DB' },
    { name: 'GoHighLevel API', status: 'connected', lastSync: '45ms latency', icon: 'GHL' },
    { name: 'Twilio Voice AI', status: 'standby', lastSync: 'Ready for calls', icon: 'T' },
    { name: 'WhatsApp Business', status: 'connected', lastSync: 'msg_id_992', icon: 'WA' },
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-white/60 px-3 py-1.5 rounded-full transition-all shadow-sm group"
      >
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 tracking-wide uppercase">
          Neural Sync
        </span>
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white/90 backdrop-blur-xl border border-white/60 rounded-xl shadow-2xl p-1 z-50 animate-zoom-in duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Context Sources</p>
          </div>
          <div className="p-1">
            {systems.map((sys) => (
              <div key={sys.name} className="flex items-center gap-3 p-2 hover:bg-indigo-50 rounded-lg transition-colors group cursor-default">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-indigo-600 transition-all">
                  {sys.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-700">{sys.name}</p>
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 rounded">{sys.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {sys.lastSync}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50/50 p-2 rounded-b-lg text-center">
             <span className="text-xs text-indigo-500 font-mono">System Healthy • Latency 45ms</span>
          </div>
        </div>
      )}
    </div>
  );
};
