/**
 * Quick Demo Step Component
 *
 * Interactive product tour showing AI agent capabilities
 * with a simulated automation demo.
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Play, CheckCircle2, Loader2, Sparkles, Zap, Mail, Users, Bot, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnboardingData } from './OnboardingWizard';

interface QuickDemoStepProps {
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSkip?: () => void;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  thinkingText: string;
  resultText: string;
  duration: number;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'analyze',
    title: 'Analyzing Task',
    description: 'Understanding your automation request',
    icon: Bot,
    thinkingText: 'Reading task requirements and identifying key actions...',
    resultText: 'Task analyzed! Found: Create email sequence with 3 follow-ups',
    duration: 2000,
  },
  {
    id: 'plan',
    title: 'Creating Plan',
    description: 'Building execution strategy',
    icon: Target,
    thinkingText: 'Breaking down into actionable steps...',
    resultText: 'Plan created: 5 steps identified for email sequence setup',
    duration: 1500,
  },
  {
    id: 'connect',
    title: 'Connecting to GHL',
    description: 'Establishing secure connection',
    icon: Zap,
    thinkingText: 'Authenticating with GoHighLevel API...',
    resultText: 'Connected successfully to your GHL account',
    duration: 1000,
  },
  {
    id: 'execute',
    title: 'Executing Actions',
    description: 'Performing automated tasks',
    icon: Mail,
    thinkingText: 'Creating email templates and configuring automation triggers...',
    resultText: 'Email sequence created with smart timing rules',
    duration: 2500,
  },
  {
    id: 'complete',
    title: 'Task Complete',
    description: 'Verifying and reporting results',
    icon: CheckCircle2,
    thinkingText: 'Validating configuration and testing triggers...',
    resultText: 'All done! Your email sequence is now active and ready',
    duration: 1500,
  },
];

const CAPABILITIES = [
  { icon: Mail, label: 'Email Automation', description: 'Create sequences and broadcasts' },
  { icon: Users, label: 'Lead Management', description: 'Import, tag, and segment leads' },
  { icon: Target, label: 'Campaign Builder', description: 'Build multi-channel campaigns' },
  { icon: Clock, label: 'Workflow Automation', description: 'Create automated triggers' },
];

export function QuickDemoStep({ data, onNext, onBack, onSkip }: QuickDemoStepProps) {
  const [demoState, setDemoState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentDemoStep, setCurrentDemoStep] = useState(0);
  const [showCapabilities, setShowCapabilities] = useState(true);

  // Run demo animation
  useEffect(() => {
    if (demoState !== 'running') return;

    if (currentDemoStep >= DEMO_STEPS.length) {
      setDemoState('completed');
      return;
    }

    const timer = setTimeout(() => {
      setCurrentDemoStep(prev => prev + 1);
    }, DEMO_STEPS[currentDemoStep].duration);

    return () => clearTimeout(timer);
  }, [demoState, currentDemoStep]);

  const startDemo = () => {
    setShowCapabilities(false);
    setDemoState('running');
    setCurrentDemoStep(0);
  };

  const resetDemo = () => {
    setDemoState('idle');
    setCurrentDemoStep(0);
    setShowCapabilities(true);
  };

  const handleContinue = () => {
    onNext({});
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 mb-4"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Quick Demo</span>
        </motion.div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">See the AI Agent in Action</h2>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Watch how our AI agent automates your GHL tasks in seconds. This is a preview of what you'll be able to do!
        </p>
      </div>

      {/* Demo Area */}
      <Card className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {showCapabilities && demoState === 'idle' && (
              <motion.div
                key="capabilities"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">What the AI Agent Can Do</h3>
                  <p className="text-sm text-slate-500">Click Start Demo to see automation in action</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {CAPABILITIES.map((cap, index) => (
                    <motion.div
                      key={cap.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                        <cap.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800 text-sm">{cap.label}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{cap.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center pt-4">
                  <Button
                    onClick={startDemo}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 gap-2 shadow-lg shadow-purple-500/20"
                  >
                    <Play className="w-5 h-5" />
                    Start Demo
                  </Button>
                </div>
              </motion.div>
            )}

            {(demoState === 'running' || demoState === 'completed') && (
              <motion.div
                key="demo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Demo Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">AI Agent</h3>
                      <p className="text-xs text-slate-500">Creating email sequence...</p>
                    </div>
                  </div>
                  <Badge variant={demoState === 'completed' ? 'default' : 'secondary'} className={cn(
                    'gap-1',
                    demoState === 'completed' && 'bg-green-500'
                  )}>
                    {demoState === 'running' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </>
                    )}
                  </Badge>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  {DEMO_STEPS.map((step, index) => {
                    const isActive = index === currentDemoStep && demoState === 'running';
                    const isCompleted = index < currentDemoStep || demoState === 'completed';
                    const isPending = index > currentDemoStep;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: isPending ? 0.5 : 1,
                          x: 0,
                          scale: isActive ? 1.02 : 1,
                        }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-xl border transition-all',
                          isActive && 'bg-purple-50 border-purple-200 shadow-md',
                          isCompleted && 'bg-green-50 border-green-200',
                          isPending && 'bg-slate-50 border-slate-100'
                        )}
                      >
                        {/* Step Icon */}
                        <div className={cn(
                          'p-2 rounded-lg shrink-0 transition-colors',
                          isActive && 'bg-purple-200 text-purple-700',
                          isCompleted && 'bg-green-200 text-green-700',
                          isPending && 'bg-slate-200 text-slate-400'
                        )}>
                          {isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'font-medium text-sm',
                              isActive && 'text-purple-800',
                              isCompleted && 'text-green-800',
                              isPending && 'text-slate-400'
                            )}>
                              {step.title}
                            </h4>
                            <span className={cn(
                              'text-xs',
                              isActive && 'text-purple-600',
                              isCompleted && 'text-green-600',
                              isPending && 'text-slate-400'
                            )}>
                              {step.description}
                            </span>
                          </div>

                          {/* Thinking/Result Text */}
                          <AnimatePresence mode="wait">
                            {isActive && (
                              <motion.div
                                key="thinking"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2"
                              >
                                <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-100 px-3 py-1.5 rounded-lg">
                                  <div className="flex gap-0.5">
                                    <span className="animate-bounce">.</span>
                                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                                  </div>
                                  {step.thinkingText}
                                </div>
                              </motion.div>
                            )}
                            {isCompleted && (
                              <motion.div
                                key="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2 text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-lg"
                              >
                                {step.resultText}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Demo Complete Actions */}
                {demoState === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4 pt-4"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-3 rounded-full bg-green-100">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Demo Complete!</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        That's how easy it is to automate your GHL workflows
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetDemo}
                    >
                      Watch Again
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-amber-800 text-sm">Pro Tip</h4>
            <p className="text-xs text-amber-700 mt-1">
              After setup, you can describe any GHL task in natural language and the AI agent will execute it for you.
              Try commands like "Create an email sequence for new leads" or "Send a broadcast to all active contacts".
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="min-w-32"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {onSkip && (
            <Button
              type="button"
              onClick={onSkip}
              variant="ghost"
              className="text-slate-500"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleContinue}
            className="min-w-32 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
