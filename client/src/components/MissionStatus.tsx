import React from 'react';
import { GlassPane } from './GlassPane';
import { Spinner } from './ui/spinner';
import { CheckCircle2, Circle, Clock, PlayCircle } from 'lucide-react';

interface MissionStatusProps {
    goal: string;
    status: 'PLANNING' | 'EXECUTING' | 'COMPLETED' | 'ERROR';
    logs: any[];
}

export const MissionStatus: React.FC<MissionStatusProps> = ({ goal, status, logs }) => {
    // Derive current step from logs (simple heuristic)
    const currentActivity = logs.length > 0 ? logs[logs.length - 1].message : 'Initializing...';

    return (
        <div className="h-full flex flex-col gap-4">
            <GlassPane title="Mission Control" className="h-full">
                <div className="p-4 space-y-6">
                    {/* Goal Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Objective</h4>
                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                            <p className="text-sm font-medium text-indigo-900 italic">"{goal}"</p>
                        </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</h4>
                        <div className="flex items-center gap-3">
                            {status === 'EXECUTING' || status === 'PLANNING' ? (
                                <div className="relative">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-75"></div>
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
                                </div>
                            ) : status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            )}
                            <span className="text-lg font-bold text-slate-700">
                                {status === 'PLANNING' ? 'Planning Mission...' :
                                    status === 'EXECUTING' ? 'Executing Steps...' :
                                        status === 'COMPLETED' ? 'Mission Complete' : 'Mission Failed'}
                            </span>
                        </div>
                    </div>

                    {/* Active Step */}
                    {(status === 'EXECUTING' || status === 'PLANNING') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Activity</h4>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <Spinner className="w-4 h-4 mt-0.5 text-indigo-600" />
                                <p className="text-sm text-slate-600 font-mono">{currentActivity}</p>
                            </div>
                        </div>
                    )}

                    {/* Timeline / Steps (Simplified) */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 opacity-50">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-medium text-slate-500 line-through">Initialize Agent</span>
                        </div>
                        <div className={`flex items-center gap-3 ${status === 'PLANNING' ? 'opacity-100' : 'opacity-50'}`}>
                            {status === 'PLANNING' ? <Spinner className="w-4 h-4 text-indigo-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            <span className={`text-xs font-medium ${status === 'PLANNING' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                Analyze Request
                            </span>
                        </div>
                        <div className={`flex items-center gap-3 ${status === 'EXECUTING' ? 'opacity-100' : 'opacity-50'}`}>
                            {status === 'EXECUTING' ? <Spinner className="w-4 h-4 text-indigo-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                            <span className={`text-xs font-medium ${status === 'EXECUTING' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                Browser Automation
                            </span>
                        </div>
                        <div className={`flex items-center gap-3 ${status === 'COMPLETED' ? 'opacity-100' : 'opacity-50'}`}>
                            {status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                            <span className={`text-xs font-medium ${status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                Verify & Complete
                            </span>
                        </div>
                    </div>

                </div>
            </GlassPane>
        </div>
    );
};
