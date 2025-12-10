
import React, { useState } from 'react';
import { GlassPane } from './GlassPane';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [agencyName, setAgencyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      // Simulate Setup
      setTimeout(() => {
        // Mark onboarding as complete
        localStorage.setItem('onboardingCompleted', 'true');
        onComplete();
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">AI</div>
             <span className="font-bold text-slate-700 text-lg">Agency Setup</span>
          </div>
          <div className="flex gap-2">
             {[1, 2, 3].map(i => (
               <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'}`}></div>
             ))}
          </div>
        </div>

        <GlassPane className="p-12 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="relative z-10">
            {step === 1 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Name your Command Center</h2>
                <p className="text-slate-500 mb-8 text-lg">How should the AI agents refer to your agency in reports?</p>
                
                <div className="space-y-4">
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Agency Name</label>
                   <input 
                     type="text" 
                     value={agencyName}
                     onChange={(e) => setAgencyName(e.target.value)}
                     className="w-full text-3xl font-bold bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-2 text-slate-800 placeholder-slate-300 transition-colors"
                     placeholder="e.g. Zenith Growth Ops"
                     autoFocus
                   />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-slide-in-right duration-500">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Connect GoHighLevel</h2>
                <p className="text-slate-500 mb-8 text-lg">Enter your Agency API Key to enable automated sub-account discovery.</p>
                
                <div className="space-y-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agency API Key</label>
                     <div className="relative">
                       <input 
                         type="password" 
                         value={apiKey}
                         onChange={(e) => setApiKey(e.target.value)}
                         className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono text-lg shadow-inner"
                         placeholder="pit_xxxxxxxxxxxxxxxx"
                       />
                       <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-all duration-300 ${apiKey.length > 10 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       </div>
                     </div>
                     <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                       Your key is encrypted with AES-256 before storage.
                     </p>
                   </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-slide-in-right duration-500 text-center">
                <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Ready to Deploy</h2>
                <p className="text-slate-500 mb-8 text-lg">We have detected <span className="font-bold text-slate-800">2 active sub-accounts</span> and initialized <span className="font-bold text-slate-800">3 AI agents</span>.</p>
                
                <div className="bg-slate-900 text-slate-200 rounded-xl p-6 max-w-md mx-auto text-left mb-8 shadow-2xl font-mono text-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-50 to-purple-500"></div>
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-bold text-white">System Online</span>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between"><span>{'>'} Initializing Neural Core...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="flex justify-between"><span>{'>'} Syncing Notion DB...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="flex justify-between"><span>{'>'} Verifying Agency API...</span> <span className="text-emerald-400">OK</span></p>
                    <p className="text-indigo-400 mt-2">{'>'} Awaiting First Command...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-8 mt-4">
              <button 
                onClick={handleNext}
                disabled={isLoading || (step === 1 && !agencyName) || (step === 2 && !apiKey)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg w-full justify-center sm:w-auto"
              >
                {isLoading ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Initializing...</>
                ) : step === 3 ? 'Launch Dashboard' : 'Continue'}
                {!isLoading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
              </button>
            </div>
          </div>
        </GlassPane>
      </div>
    </div>
  );
};
