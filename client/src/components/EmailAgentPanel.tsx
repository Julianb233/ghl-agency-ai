import React, { useState } from 'react';
import { GlassPane } from './GlassPane';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Mail, RefreshCw, Send, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';

interface EmailDraft {
    id: string;
    subject: string;
    to: string;
    preview: string;
    status: 'DRAFT' | 'SENT' | 'NEEDS_REVIEW';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    timestamp: string;
}

// Email drafts will be loaded from the backend API when connected
const INITIAL_DRAFTS: EmailDraft[] = [];

export const EmailAgentPanel: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [drafts, setDrafts] = useState<EmailDraft[]>(INITIAL_DRAFTS);

    const handleConnect = () => {
        // Simulate OAuth flow
        setTimeout(() => setIsConnected(true), 1000);
    };

    const toggleMonitoring = () => {
        setIsMonitoring(!isMonitoring);
    };

    return (
        <div className="h-full p-4 flex flex-col gap-6 overflow-y-auto">
            {/* Header / Status */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        AI Email Agent
                        {isConnected && (
                            <Badge variant={isMonitoring ? "default" : "secondary"} className={isMonitoring ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                {isMonitoring ? "Active Monitoring" : "Idle"}
                            </Badge>
                        )}
                    </h2>
                    <p className="text-slate-500 text-sm">Autonomous inbox management and drafting assistant.</p>
                </div>

                <div className="flex gap-2">
                    {!isConnected ? (
                        <Button onClick={handleConnect} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                            <Mail className="w-4 h-4 mr-2" />
                            Connect Gmail / Outlook
                        </Button>
                    ) : (
                        <Button onClick={toggleMonitoring} variant={isMonitoring ? "destructive" : "default"} className={!isMonitoring ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                            {isMonitoring ? "Pause Agent" : "Start Monitoring"}
                        </Button>
                    )}
                </div>
            </div>

            {!isConnected ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <Mail className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Connect Your Inbox</h3>
                    <p className="text-slate-500 max-w-md mb-8">
                        Grant the AI agent access to read and draft emails on your behalf.
                        It will analyze incoming messages, categorize them, and prepare draft responses for your review.
                    </p>
                    <Button onClick={handleConnect} size="lg" className="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50">
                        Authorize with OAuth
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    {/* Left Col: Stats & Config */}
                    <div className="flex flex-col gap-6">
                        <GlassPane title="Inbox Analytics" className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                                    <p className="text-xs text-teal-500 font-bold uppercase">Unread</p>
                                    <p className="text-2xl font-bold text-teal-900">-</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <p className="text-xs text-emerald-500 font-bold uppercase">Drafted</p>
                                    <p className="text-2xl font-bold text-emerald-900">{drafts.length}</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs text-amber-500 font-bold uppercase">Needs Review</p>
                                    <p className="text-2xl font-bold text-amber-900">{drafts.filter(d => d.status === 'NEEDS_REVIEW').length}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Reply Rate</p>
                                    <p className="text-2xl font-bold text-slate-700">-</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Agent Settings</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm text-slate-700">
                                        <span>Auto-Draft Responses</span>
                                        <div className="w-8 h-4 bg-emerald-600 rounded-full relative cursor-pointer"><div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-700">
                                        <span>Auto-Send (High Confidence)</span>
                                        <div className="w-8 h-4 bg-slate-300 rounded-full relative cursor-pointer"><div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-700">
                                        <span>Tone Matching</span>
                                        <div className="w-8 h-4 bg-emerald-600 rounded-full relative cursor-pointer"><div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                                    </div>
                                </div>
                            </div>
                        </GlassPane>

                        <GlassPane title="Recent Activity" className="flex-1 p-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-4">
                                    {isMonitoring ? (
                                        <div className="flex gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
                                            </div>
                                            <div>
                                                <p className="text-slate-700"><span className="font-bold">Monitoring inbox</span></p>
                                                <p className="text-xs text-slate-400">Waiting for new emails...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <p className="text-sm">Start monitoring to see activity</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </GlassPane>
                    </div>

                    {/* Right Col: Drafts & Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-700">Pending Drafts</h3>
                            <Button variant="outline" size="sm" className="text-xs">
                                <RefreshCw className="w-3 h-3 mr-2" />
                                Refresh
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {drafts.map(draft => (
                                <div key={draft.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={
                                                draft.status === 'NEEDS_REVIEW' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                    draft.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        'bg-slate-50 text-slate-600'
                                            }>
                                                {draft.status.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs text-slate-400">{draft.timestamp}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Approve & Send">
                                                <Send className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" title="Discard">
                                                <ThumbsDown className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-800 mb-1">{draft.subject}</h4>
                                    <p className="text-xs text-slate-500 mb-3">To: {draft.to}</p>

                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-3 font-mono text-xs leading-relaxed border border-slate-100">
                                        {draft.preview}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            Sentiment: <span className={
                                                draft.sentiment === 'POSITIVE' ? 'text-emerald-600 font-bold' :
                                                    draft.sentiment === 'NEGATIVE' ? 'text-red-600 font-bold' : 'text-slate-600 font-bold'
                                            }>{draft.sentiment}</span>
                                        </div>
                                        {draft.status === 'NEEDS_REVIEW' && (
                                            <div className="flex items-center gap-1 text-amber-600">
                                                <AlertCircle className="w-3 h-3" />
                                                AI Confidence: 85%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
