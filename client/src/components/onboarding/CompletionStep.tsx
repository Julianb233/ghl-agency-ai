import React, { useEffect, useState } from 'react';
import { ArrowLeft, Rocket, CheckCircle2, Sparkles, TrendingUp, Zap, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from './OnboardingWizard';
import { cn } from '@/lib/utils';

interface CompletionStepProps {
  data: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const CONFETTI_COUNT = 50;

interface ConfettiParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
}

const CONFETTI_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
];

export function CompletionStep({ data, onComplete, onBack, isLoading }: CompletionStepProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Generate confetti particles
    const particles: ConfettiParticle[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));
    setConfetti(particles);

    // Show content after a brief delay for animation effect
    setTimeout(() => setShowContent(true), 300);
  }, []);

  const quickActions = [
    {
      icon: <Rocket className="w-5 h-5" />,
      title: 'Launch Your First Campaign',
      description: 'Create an AI-powered calling campaign',
      link: '/ai-campaigns',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Import Leads',
      description: 'Upload your contact lists',
      link: '/lead-lists',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Explore Automations',
      description: 'Set up workflow automations',
      link: '/workflows',
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: 'Take Product Tour',
      description: 'Learn about key features',
      action: 'tour',
    },
  ];

  const setupSummary = [
    { label: 'Company', value: data.companyName },
    { label: 'Industry', value: data.industry ? data.industry.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not specified' },
    { label: 'Team Size', value: data.employeeCount ? data.employeeCount.replace('-', ' to ') : 'Not specified' },
    { label: 'Goals', value: `${data.goals.length} selected` },
    { label: 'GHL Connected', value: data.ghlApiKey ? 'Yes' : 'Not yet' },
    { label: 'Brand Setup', value: data.logoFile || data.brandVoice ? 'Completed' : 'Skipped' },
    { label: 'Integrations', value: `${data.integrations.length} connected` },
  ];

  return (
    <div className="relative">
      {/* Confetti Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className={cn(
              "absolute w-2 h-2 rounded-full opacity-0",
              particle.color
            )}
            style={{
              left: `${particle.left}%`,
              top: '-10px',
              animation: `fall ${particle.duration}s ease-in ${particle.delay}s forwards`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "space-y-8 transition-all duration-700",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Success Icon & Message */}
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 animate-bounce-slow">
              <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-slate-800 mb-3">
            You're All Set!
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Your GHL Agency AI workspace is ready. Let's start automating!
          </p>
        </div>

        {/* Setup Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Setup Summary
          </h3>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {setupSummary.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{item.label}:</span>
                <span className="text-sm font-medium text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-4 text-center">
            What would you like to do first?
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  if (action.link) {
                    // Will navigate after onboarding completes
                    console.log('Navigate to:', action.link);
                  } else if (action.action === 'tour') {
                    console.log('Start product tour');
                  }
                }}
                className="flex items-start gap-4 p-5 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 text-center">
          <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <p className="text-emerald-800 font-medium mb-2">
            Welcome to the future of agency automation!
          </p>
          <p className="text-sm text-emerald-700">
            You now have access to powerful AI-driven tools to scale your agency operations.
          </p>
        </div>

        {/* Terminal-style Status */}
        <div className="bg-slate-900 text-slate-200 rounded-xl p-6 font-mono text-sm shadow-2xl">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span className="font-bold text-white">System Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{'>'} Workspace initialized...</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{'>'} AI engine ready...</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{'>'} Integrations synced...</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{'>'} Database connected...</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-emerald-400">{'>'} System online. Ready for commands...</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            disabled={isLoading}
            className="min-w-32"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button
            type="button"
            onClick={onComplete}
            disabled={isLoading}
            className="min-w-48 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Finalizing Setup...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Launch Dashboard
              </>
            )}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
