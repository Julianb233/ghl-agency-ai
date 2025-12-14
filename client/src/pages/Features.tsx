/**
 * Features & Benefits Page
 *
 * Comprehensive showcase of GHL Agency AI features, benefits,
 * and capabilities with modern animations and visual effects.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Bot,
  Zap,
  Globe,
  Shield,
  Clock,
  BarChart3,
  Users,
  Brain,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Play,
  MessageSquare,
  Workflow,
  Database,
  Lock,
  TrendingUp,
  Target,
  Lightbulb,
  Layers,
  RefreshCcw,
  Eye,
  MousePointer2,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturesProps {
  onBack?: () => void;
  onGetStarted?: () => void;
}

export function Features({ onBack, onGetStarted }: FeaturesProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">GHL Agency AI</span>
          </div>
          <Button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full px-6"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Agency Automation
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Features & Benefits
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Discover how GHL Agency AI transforms your agency operations with intelligent automation, real-time insights, and seamless GoHighLevel integration.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to automate your agency and scale without limits
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Showcase */}
      <section className="py-20 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                AI Agent Technology
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-6">
                Watch Your AI Think in Real-Time
              </h2>
              <p className="text-gray-400 mb-8">
                Our proprietary "Thinking Bubbles" technology lets you see exactly how your AI agent reasons through tasks, making decisions transparent and trustworthy.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Eye, text: 'Real-time reasoning visualization' },
                  { icon: Lightbulb, text: 'Step-by-step task breakdown' },
                  { icon: RefreshCcw, text: 'Learning from every interaction' },
                  { icon: CheckCircle2, text: 'Explainable AI decisions' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Thinking bubbles demo */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-sm text-gray-500">AI Agent Thinking</span>
                </div>

                <div className="space-y-3">
                  <ThinkingBubbleDemo type="thinking" text="Analyzing task: Create campaign for new lead nurture sequence..." />
                  <ThinkingBubbleDemo type="tool" text="Using tool: ghl_create_campaign" delay={0.3} />
                  <ThinkingBubbleDemo type="result" text="Campaign created successfully with 5 email touchpoints" delay={0.6} />
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 rounded-full text-sm font-bold shadow-lg"
              >
                Live Demo
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Agencies Choose Us
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Join hundreds of agencies saving 20+ hours per week with intelligent automation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <BenefitCard key={benefit.title} benefit={benefit} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Integration Showcase */}
      <section className="py-20 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Powerful Integrations
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Seamlessly connect with your favorite tools and platforms
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-6 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:border-emerald-500/50 transition-all cursor-default"
              >
                {integration}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-center"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }} />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Transform Your Agency?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Start your free trial today and see why leading agencies trust GHL Agency AI for their automation needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={onGetStarted}
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-gray-100 rounded-full px-8 font-bold shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 rounded-full px-8"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 text-center text-gray-500 text-sm">
          <p>&copy; 2025 GHL Agency AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ feature, index }: { feature: typeof coreFeatures[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group relative bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />

      <div className="relative z-10">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          'bg-gradient-to-br',
          feature.gradient
        )}>
          <feature.icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
        <p className="text-gray-400 text-sm">{feature.description}</p>
      </div>
    </motion.div>
  );
}

// Benefit Card Component
function BenefitCard({ benefit, index }: { benefit: typeof benefits[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-4 p-6 bg-gray-900/30 border border-gray-800 rounded-2xl hover:border-emerald-500/30 transition-colors"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
        <benefit.icon className="w-6 h-6 text-emerald-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1">{benefit.title}</h3>
        <p className="text-gray-400 text-sm">{benefit.description}</p>
      </div>
    </motion.div>
  );
}

// Thinking Bubble Demo Component
function ThinkingBubbleDemo({ type, text, delay = 0 }: { type: 'thinking' | 'tool' | 'result'; text: string; delay?: number }) {
  const config = {
    thinking: { bg: 'bg-blue-500', icon: Lightbulb },
    tool: { bg: 'bg-purple-500', icon: Workflow },
    result: { bg: 'bg-emerald-500', icon: CheckCircle2 },
  };

  const { bg, icon: Icon } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('rounded-xl p-3 text-white text-sm', bg)}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="font-semibold capitalize">{type}</span>
      </div>
      <p className="opacity-90">{text}</p>
    </motion.div>
  );
}

// Data
const coreFeatures = [
  {
    icon: Bot,
    title: 'AI Agent Automation',
    description: 'Intelligent agents that understand your tasks and execute them autonomously with human-like reasoning.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Globe,
    title: 'Browser Automation',
    description: 'Real browser sessions powered by Browserbase for complex web interactions and scraping tasks.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageSquare,
    title: 'Real-time Thinking UI',
    description: 'Watch your AI agent think with live "thinking bubbles" showing every step of the reasoning process.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Workflow,
    title: 'Workflow Builder',
    description: 'Visual drag-and-drop builder to create complex automation workflows without coding.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Database,
    title: 'Knowledge Management',
    description: 'AI learns from your patterns and stores knowledge for smarter future automations.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Comprehensive insights into task performance, success rates, and time saved.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Users,
    title: 'Multi-Agent Swarms',
    description: 'Coordinate multiple AI agents working together on complex, multi-step projects.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Bank-level encryption, SOC 2 compliance, and secure credential management.',
    gradient: 'from-gray-500 to-gray-700',
  },
  {
    icon: Calendar,
    title: 'Task Scheduling',
    description: 'Schedule tasks to run at specific times with full Kanban board management.',
    gradient: 'from-yellow-500 to-orange-500',
  },
];

const benefits = [
  {
    icon: Clock,
    title: 'Save 20+ Hours Per Week',
    description: 'Automate repetitive GHL tasks and focus on high-value client work.',
  },
  {
    icon: TrendingUp,
    title: 'Scale Without Hiring',
    description: 'Handle 10x more clients without adding to your team.',
  },
  {
    icon: Target,
    title: '95% Task Accuracy',
    description: 'AI agents complete tasks with human-level accuracy.',
  },
  {
    icon: Shield,
    title: 'No GHL API Limits',
    description: 'Browser automation means no rate limits or API restrictions.',
  },
];

const integrations = [
  'GoHighLevel',
  'Browserbase',
  'OpenAI',
  'Claude AI',
  'Slack',
  'Google Drive',
  'Gmail',
  'Notion',
  'Zapier',
  'Make.com',
  'Stripe',
  'Twilio',
];

const stats = [
  { value: '500+', label: 'Active Agencies' },
  { value: '2M+', label: 'Tasks Automated' },
  { value: '95%', label: 'Success Rate' },
  { value: '20hrs', label: 'Saved Per Week' },
];
