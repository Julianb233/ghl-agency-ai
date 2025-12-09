
import React from 'react';
import { GlassPane } from './GlassPane';
import { AgentStep } from '../types';

interface BrowserPreviewProps {
  currentStep: AgentStep | null;
  screenshotUrl?: string;
  liveViewUrl?: string;
  isProcessing: boolean;
  sessionId?: string;
  isStreaming?: boolean; // Whether we're receiving SSE updates
}

export const BrowserPreview: React.FC<BrowserPreviewProps> = ({ currentStep, screenshotUrl, liveViewUrl, isProcessing, sessionId, isStreaming = false }) => {
  const isAnalyzing = currentStep?.action === 'ANALYZE_UX' || currentStep?.action === 'INSPECT';
  const isBuilding = currentStep?.action === 'BUILD_ELEMENT' || currentStep?.action === 'CLONE_SECTION';

  return (
    <GlassPane title="Remote Browser" className="h-full relative group">

      {/* Browser Chrome UI Mockup */}
      <div className="bg-white/80 border-b border-slate-200 p-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
        </div>

        {/* URL Bar */}
        <div className="bg-slate-100/80 border border-slate-200 rounded-md px-2 sm:px-4 py-1.5 text-[10px] sm:text-xs text-slate-500 font-mono flex-1 text-center truncate flex items-center justify-center gap-2 shadow-inner max-w-[200px] sm:max-w-none mx-auto">
          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span className="truncate">{currentStep?.target || "app.gohighlevel.com"}</span>
        </div>

        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full h-full bg-slate-50 relative flex items-center justify-center overflow-hidden">
        {liveViewUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className={`p-2 border-b flex items-center justify-between ${isStreaming || isProcessing ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2">
                {(isStreaming || isProcessing) ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-700 font-medium">Live Browser - Watching in real-time</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-emerald-700 font-medium">✓ Session ready - browser is live</span>
                  </>
                )}
                {sessionId && (
                  <span className="text-[10px] text-slate-500 font-mono">ID: {sessionId.slice(0, 8)}</span>
                )}
              </div>
              <a
                href={liveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
              >
                Open Fullscreen →
              </a>
            </div>
            <iframe
              src={liveViewUrl}
              className="w-full flex-1 border-none"
              title="Live Browser View"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Browser View"
            className="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 border-dashed flex items-center justify-center">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            </div>
            <p className="font-mono text-sm uppercase tracking-widest opacity-60">Awaiting Mission</p>
          </div>
        )}

        {/* Analysis Overlay (Grid/Wireframe effect) */}
        {isAnalyzing && isProcessing && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Grid Lines */}
            <div className="w-full h-full grid grid-cols-6 opacity-20">
              {[...Array(6)].map((_, i) => <div key={i} className="border-r border-indigo-500 h-full"></div>)}
            </div>
            <div className="absolute inset-0 grid grid-rows-6 opacity-20">
              {[...Array(6)].map((_, i) => <div key={i} className="border-b border-indigo-500 w-full"></div>)}
            </div>

            {/* Scanning Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>

            {/* Design Token extraction visual */}
            <div className="absolute top-10 right-10 bg-black/80 backdrop-blur text-white text-[10px] font-mono p-2 rounded border border-white/20 shadow-xl animate-pulse">
              <p>Running UX Audit...</p>
              <p className="text-indigo-400">Found: H1 (Inter, 700)</p>
              <p className="text-emerald-400">Found: Primary Btn (#4F46E5)</p>
            </div>
          </div>
        )}

        {/* Builder Overlay */}
        {isBuilding && isProcessing && (
          <div className="absolute inset-0 z-10 pointer-events-none border-4 border-emerald-500/30 border-dashed animate-pulse">
            <div className="absolute bottom-4 right-4 bg-emerald-600 text-white px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg flex items-center gap-2">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Building...
            </div>
          </div>
        )}

        {/* Processing Spinner - only show when NO live view */}
        {isProcessing && !isAnalyzing && !isBuilding && !liveViewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[2px]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              <div className="w-16 h-16 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin shadow-xl"></div>
            </div>
          </div>
        )}

        {/* Action Overlay Label */}
        {currentStep && isProcessing && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 border border-indigo-100 text-indigo-600 px-6 py-3 rounded-full text-sm font-mono shadow-2xl shadow-indigo-500/20 flex items-center gap-3 z-20 whitespace-nowrap">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAnalyzing ? 'bg-purple-500' : 'bg-indigo-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isAnalyzing ? 'bg-purple-600' : 'bg-indigo-600'}`}></span>
            </span>
            <span className="font-bold">{currentStep.action}:</span>
            <span className="text-slate-600 max-w-[200px] truncate">{currentStep.target}</span>
          </div>
        )}

        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>
      </div>
    </GlassPane>
  );
};
