import React, { useState, useEffect } from 'react';
import { GlassPane } from './GlassPane';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Phone, Play, Pause, BarChart3, Users, Upload, CheckCircle2, XCircle, Clock, Mic } from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    company: string;
    phone: string;
    status: 'PENDING' | 'CALLING' | 'COMPLETED' | 'FAILED';
    disposition?: 'BOOKED' | 'VOICEMAIL' | 'CALLBACK' | 'NOT_INTERESTED';
    duration?: string;
    notes?: string;
}

const MOCK_LEADS: Lead[] = [
    { id: 'l1', name: 'Michael Scott', company: 'Dunder Mifflin', phone: '+1 (555) 123-4567', status: 'COMPLETED', disposition: 'BOOKED', duration: '4m 12s', notes: 'Interested in enterprise plan. Booked demo for Tuesday.' },
    { id: 'l2', name: 'Dwight Schrute', company: 'Schrute Farms', phone: '+1 (555) 987-6543', status: 'COMPLETED', disposition: 'NOT_INTERESTED', duration: '1m 30s', notes: 'Happy with current beet supplier.' },
    { id: 'l3', name: 'Jim Halpert', company: 'Athlead', phone: '+1 (555) 246-8101', status: 'PENDING' },
    { id: 'l4', name: 'Pam Beesly', company: 'Pratt Institute', phone: '+1 (555) 135-7924', status: 'PENDING' },
    { id: 'l5', name: 'Ryan Howard', company: 'WUPHF.com', phone: '+1 (555) 111-2222', status: 'PENDING' },
];

export const VoiceAgentPanel: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
    const [currentCall, setCurrentCall] = useState<Lead | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);

    // Simulate calling loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(() => {
                if (!currentCall) {
                    // Find next pending lead
                    const nextLead = leads.find(l => l.status === 'PENDING');
                    if (nextLead) {
                        setCurrentCall(nextLead);
                        setLeads(prev => prev.map(l => l.id === nextLead.id ? { ...l, status: 'CALLING' } : l));
                        setTranscript(['AI: Dialing ' + nextLead.name + '...']);
                    } else {
                        setIsActive(false); // No more leads
                    }
                } else {
                    // Simulate conversation progress
                    setTranscript(prev => [...prev, '...']);

                    // Randomly finish call after some updates
                    if (Math.random() > 0.8) {
                        const dispositions: Lead['disposition'][] = ['BOOKED', 'VOICEMAIL', 'CALLBACK', 'NOT_INTERESTED'];
                        const result = dispositions[Math.floor(Math.random() * dispositions.length)];

                        setLeads(prev => prev.map(l => l.id === currentCall.id ? {
                            ...l,
                            status: 'COMPLETED',
                            disposition: result,
                            duration: '2m 15s'
                        } : l));
                        setCurrentCall(null);
                    }
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isActive, currentCall, leads]);

    return (
        <div className="h-full p-4 flex flex-col gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Phone className="w-6 h-6 text-emerald-600" />
                        Voice Agent <Badge className="bg-emerald-600">Enterprise</Badge>
                    </h2>
                    <p className="text-slate-500 text-sm">Autonomous outbound calling and appointment setting.</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" /> Import Leads
                    </Button>
                    <Button
                        onClick={() => setIsActive(!isActive)}
                        className={`${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2 shadow-lg`}
                    >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isActive ? 'Stop Campaign' : 'Start Calling'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left Col: Stats & Live Call */}
                <div className="flex flex-col gap-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <GlassPane className="p-4 flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase">Calls Made</p>
                            <p className="text-3xl font-bold text-slate-700">{leads.filter(l => l.status === 'COMPLETED').length}</p>
                        </GlassPane>
                        <GlassPane className="p-4 flex flex-col items-center justify-center text-center bg-emerald-50/50 border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase">Booked</p>
                            <p className="text-3xl font-bold text-emerald-700">{leads.filter(l => l.disposition === 'BOOKED').length}</p>
                        </GlassPane>
                    </div>

                    {/* Live Call Visualization */}
                    <GlassPane title="Live Call Status" className="flex-1 flex flex-col min-h-[300px]">
                        {currentCall ? (
                            <div className="flex-1 p-4 flex flex-col gap-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{currentCall.name}</h3>
                                        <p className="text-sm text-slate-500">{currentCall.company}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full animate-pulse">
                                        <Mic className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Live</span>
                                    </div>
                                </div>

                                <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-y-auto space-y-2 font-mono text-sm">
                                    {transcript.map((line, i) => (
                                        <p key={i} className="text-slate-600">{line}</p>
                                    ))}
                                </div>

                                <div className="text-center text-xs text-slate-400">
                                    AI Agent is navigating objection handling...
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Phone className="w-12 h-12 opacity-20" />
                                <p>Waiting for next call...</p>
                            </div>
                        )}
                    </GlassPane>
                </div>

                {/* Right Col: Lead List */}
                <GlassPane className="lg:col-span-2 flex flex-col overflow-hidden" title="Campaign Leads">
                    <div className="flex-1 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-3">Company</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Disposition</div>
                            <div className="col-span-2 text-right">Duration</div>
                        </div>
                        <ScrollArea className="h-full">
                            <div className="divide-y divide-slate-100">
                                {leads.map(lead => (
                                    <div key={lead.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors text-sm">
                                        <div className="col-span-3 font-medium text-slate-700">{lead.name}</div>
                                        <div className="col-span-3 text-slate-500">{lead.company}</div>
                                        <div className="col-span-2">
                                            <Badge variant="outline" className={
                                                lead.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                                                    lead.status === 'CALLING' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse' :
                                                        'bg-white text-slate-400'
                                            }>
                                                {lead.status}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2">
                                            {lead.disposition && (
                                                <Badge className={
                                                    lead.disposition === 'BOOKED' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                                        lead.disposition === 'NOT_INTERESTED' ? 'bg-red-500 hover:bg-red-600' :
                                                            'bg-amber-500 hover:bg-amber-600'
                                                }>
                                                    {lead.disposition.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-right font-mono text-slate-500">
                                            {lead.duration || '--:--'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </GlassPane>

            </div>
        </div>
    );
};
