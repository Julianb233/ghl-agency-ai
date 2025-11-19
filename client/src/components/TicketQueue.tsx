
import React, { useState } from 'react';
import { SupportTicket, TicketPriority, TicketSource } from '../types';
// Gemini service removed - will be implemented server-side via tRPC
import { GlassPane } from './GlassPane';

interface TicketQueueProps {
  tickets: SupportTicket[];
  onResolve: (ticket: SupportTicket, command: string) => void;
}

export const TicketQueue: React.FC<TicketQueueProps> = ({ tickets, onResolve }) => {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'LOG'>('QUEUE');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{analysis: string, command: string} | null>(null);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  const visibleTickets = activeTab === 'QUEUE' 
    ? tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED')
    : tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    setAiRecommendation(null);
    
    // If manual analysis is needed (or auto-run on select)
    setIsAnalyzing(true);
    // Simulate network delay for "AI Thinking"
    setTimeout(async () => {
      // Mock AI analysis - will be replaced with tRPC call
      const result = {
        analysis: `Ticket analysis: ${ticket.subject}. Recommended action based on priority.`,
        command: `Fix issue for ${ticket.subject}`
      };
      setAiRecommendation(result);
      setIsAnalyzing(false);
    }, 1200);
  };

  const getPriorityColor = (p: TicketPriority) => {
    switch(p) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getSourceIcon = (s: TicketSource) => {
    switch(s) {
      case 'VOICE': return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
      );
      case 'EMAIL': return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      );
      case 'SLACK': return (
        <span className="font-bold text-[8px]">#</span>
      );
      case 'WHATSAPP': return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      );
      default: return <span className="text-[8px]">?</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg shrink-0">
        <button 
          onClick={() => setActiveTab('QUEUE')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'QUEUE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Active Queue ({tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length})
        </button>
        <button 
          onClick={() => setActiveTab('LOG')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'LOG' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Resolution Log
        </button>
      </div>

      {/* Ticket List */}
      <GlassPane title={activeTab === 'QUEUE' ? "Incoming Requests" : "History"} className="flex-1 min-h-0 flex flex-col">
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {visibleTickets.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              No tickets in this view.
            </div>
          )}

          {visibleTickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => handleSelectTicket(ticket)}
              className={`w-full text-left p-3 rounded-xl border transition-all group hover:shadow-md ${
                selectedTicketId === ticket.id 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                  : 'bg-white border-slate-200 hover:border-indigo-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${
                    ticket.source === 'VOICE' ? 'bg-purple-500' : 
                    ticket.source === 'EMAIL' ? 'bg-blue-500' : 
                    ticket.source === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-slate-500'
                  }`}>
                    {getSourceIcon(ticket.source)}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{ticket.timestamp}</span>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-1 line-clamp-1">{ticket.subject}</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{ticket.description}</p>
            </button>
          ))}
        </div>

        {/* Triage Panel (Bottom overlay or embedded) */}
        {selectedTicket && activeTab === 'QUEUE' && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
              AI Receptionist Triage
              {isAnalyzing && <span className="loading loading-dots loading-xs text-indigo-500"></span>}
            </h4>
            
            {isAnalyzing ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
              </div>
            ) : aiRecommendation ? (
              <div className="space-y-3 animate-slide-in-bottom">
                <div className="bg-white p-2 rounded border border-slate-200">
                   <p className="text-[10px] text-slate-600 leading-relaxed">
                     <span className="font-bold text-indigo-600">Analysis:</span> {aiRecommendation.analysis}
                   </p>
                </div>
                <button 
                  onClick={() => onResolve(selectedTicket, aiRecommendation.command)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold py-2 rounded-lg shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <span>Execute Fix</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic">
                Select a ticket to run diagnostics.
              </div>
            )}
          </div>
        )}
      </GlassPane>
    </div>
  );
};
