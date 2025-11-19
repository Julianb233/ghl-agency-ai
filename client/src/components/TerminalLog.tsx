
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { GlassPane } from './GlassPane';

interface TerminalLogProps {
  logs: LogEntry[];
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'success': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'system': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <GlassPane title="Execution Log" className="h-full">
      <div className="p-2 sm:p-4 font-mono text-[10px] sm:text-xs h-full overflow-y-auto space-y-2 bg-white/20">
        {logs.length === 0 && <span className="text-slate-400 italic">Waiting for agent start...</span>}

        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 group hover:bg-white/40 p-1.5 sm:p-2 rounded-lg transition-colors">
            <span className="text-slate-400 shrink-0 text-[9px] sm:text-[10px] pt-0.5">[{log.timestamp}]</span>
            <span className={`shrink-0 font-bold uppercase px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] border ${getColor(log.level)}`}>
              {log.level}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-slate-700 font-medium">{log.message}</span>
              {log.detail && <span className="text-slate-500 pl-2 border-l-2 border-slate-200 mt-1 break-all">{log.detail}</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </GlassPane>
  );
};
