import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// TypeScript Definitions for Speech Recognition
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

interface CommandBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
  hasActiveSession?: boolean;
  onNewSession?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ onSend, disabled, hasActiveSession = false, onNewSession }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognitionCtor();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        const text = lastResult[0].transcript;
        
        setInput(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${text}` : text;
        });
        
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl mt-6 shadow-lg transition-all">
      <div className="flex gap-3 items-end">
        {/* New Session Button - only show when there's an active session */}
        {hasActiveSession && onNewSession && (
          <button
            type="button"
            onClick={onNewSession}
            className="p-3 rounded-xl bg-white border border-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 hover:shadow-md transition-all shadow-sm"
            title="Start New Browser Session"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Attach File Button (Visual Only) */}
        <button
          type="button"
          className="p-3 rounded-xl bg-white border border-white text-slate-400 hover:text-emerald-600 hover:shadow-md transition-all shadow-sm"
          title="Attach Context (Screenshot/Markdown)"
        >
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
           </svg>
        </button>

        {/* Voice Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all duration-300 border shadow-sm relative overflow-hidden ${
            isListening 
              ? 'bg-red-50 border-red-200 text-red-500' 
              : 'bg-white border-white text-slate-400 hover:text-emerald-600 hover:shadow-md'
          }`}
          title={isListening ? "Stop Listening" : "Voice Dictation"}
        >
          {isListening && (
              <span className="absolute inset-0 rounded-xl bg-red-400/20 animate-ping"></span>
          )}
          <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        
        <div className="flex-1 relative">
           <textarea
             ref={textareaRef}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={isListening ? "Listening..." : "Describe the task or reference URL (e.g., 'Clone stylediver.com to GHL')..."}
             disabled={disabled}
             rows={1}
             className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-mono resize-none text-sm shadow-inner ${
                 isListening ? 'border-red-300 ring-2 ring-red-200' : 'border-white/60'
             }`}
           />
           <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 pointer-events-none font-mono">
             AI.ARCHITECT
           </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>EXECUTE</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
