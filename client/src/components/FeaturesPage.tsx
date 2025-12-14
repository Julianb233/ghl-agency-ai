import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, Zap, Brain, Globe, Database, Shield, Activity, Code, Lock, CheckCircle2, Sparkles, Menu, X } from 'lucide-react';
import { SkipLink } from './SkipLink';
import { useState } from 'react';

interface FeaturesPageProps {
  onGetStarted: () => void;
  onNavigateHome?: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onGetStarted, onNavigateHome }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Automation",
      description: "Let AI handle repetitive tasks while you focus on strategy. Smart automation that learns and adapts to your workflow patterns.",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      comingSoon: false,
      benefits: [
        "Automate lead follow-up sequences",
        "Smart email and message handling",
        "Intelligent task prioritization",
        "Learns from your preferences"
      ]
    },
    {
      icon: Globe,
      title: "Multi-Agent Swarms",
      description: "Deploy teams of AI agents for complex campaigns. Coordinate multiple agents working together on sophisticated marketing operations.",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-700",
      comingSoon: false,
      benefits: [
        "Coordinate 5-15 agents simultaneously",
        "Parallel task execution",
        "Hierarchical workflow orchestration",
        "Real-time agent communication"
      ]
    },
    {
      icon: Database,
      title: "Smart Memory",
      description: "AI learns your preferences and improves over time. Build institutional knowledge that makes every agent smarter with each interaction.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      comingSoon: false,
      benefits: [
        "Cross-session memory persistence",
        "Pattern recognition and learning",
        "Client preference tracking",
        "Automated knowledge base building"
      ]
    },
    {
      icon: Zap,
      title: "Browser Automation",
      description: "Automate GHL tasks with intelligent browser control. Handle data entry, research, and repetitive web tasks automatically.",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      comingSoon: false,
      benefits: [
        "Multi-tab workflow automation",
        "GHL sub-account management",
        "Data extraction and entry",
        "Intelligent element detection"
      ]
    },
    {
      icon: Activity,
      title: "Real-Time Dashboard",
      description: "Monitor all activities with live updates. Complete visibility into agent operations, campaign performance, and system health.",
      color: "from-green-500 to-lime-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      comingSoon: false,
      benefits: [
        "Live agent status monitoring",
        "Campaign performance metrics",
        "Credit usage tracking",
        "Task completion analytics"
      ]
    },
    {
      icon: Database,
      title: "Knowledge Base",
      description: "Build institutional knowledge that makes agents smarter. Create a centralized repository of best practices and workflows.",
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200",
      textColor: "text-violet-700",
      comingSoon: true,
      benefits: [
        "Centralized knowledge repository",
        "AI-powered search and retrieval",
        "Version-controlled documentation",
        "Automated knowledge extraction"
      ]
    },
    {
      icon: Code,
      title: "API Integration",
      description: "Connect your tools with our powerful API. Seamlessly integrate with GHL, CRMs, and other marketing platforms.",
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      textColor: "text-rose-700",
      comingSoon: false,
      benefits: [
        "RESTful API access",
        "Webhook integrations",
        "GHL native integration",
        "Custom workflow triggers"
      ]
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with audit logging. SOC 2 compliant infrastructure with comprehensive activity tracking.",
      color: "from-gray-700 to-gray-900",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
      textColor: "text-gray-700",
      comingSoon: false,
      benefits: [
        "End-to-end encryption",
        "Comprehensive audit logs",
        "Role-based access control",
        "SOC 2 compliance"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col font-sans">
      {/* Skip Navigation Link for Accessibility */}
      <SkipLink />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700 shadow-lg" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <Sparkles className="w-4 h-4 sm:w-7 sm:h-7 text-white fill-white relative z-10" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">GHL Agency AI</span>
              <div className="hidden sm:block text-[11px] text-gray-400 font-semibold -mt-1">Powerful Features</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-300">
            {onNavigateHome ? (
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} className="hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Home</a>
            ) : (
              <a href="/" className="hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Home</a>
            )}
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Features</a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-300 hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>

          <div className="hidden lg:flex items-center gap-2 sm:gap-4">
            <Button onClick={onGetStarted} className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg rounded-full px-3 sm:px-6 text-xs sm:text-sm font-bold relative overflow-hidden group">
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                Get Started <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-700 shadow-lg z-50">
            <nav className="flex flex-col p-4 gap-4">
              {onNavigateHome ? (
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigateHome(); setIsMobileMenuOpen(false); }} className="text-sm font-medium text-gray-300 hover:text-emerald-400 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-800 transition-colors">Home</a>
              ) : (
                <a href="/" className="text-sm font-medium text-gray-300 hover:text-emerald-400 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-800 transition-colors">Home</a>
              )}
              <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-sm font-medium text-gray-300 hover:text-emerald-400 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-800 transition-colors">Features</a>
              <hr className="border-gray-700" />
              <Button onClick={onGetStarted} className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-full font-bold">
                Get Started <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </nav>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header id="main-content" className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800" role="banner">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/30 via-green-900/20 to-transparent opacity-60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-900/30 via-transparent to-transparent opacity-40"></div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-full blur-3xl animate-float-delayed"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Main Headline */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4 sm:mb-6 max-w-5xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
              Powerful Features for
              <span className="block sm:inline"> </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400">
                Agency Growth
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Enterprise-grade AI capabilities designed to scale your agency without scaling your headcount
            </p>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-12 sm:py-24 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group ${feature.bgColor} p-6 sm:p-8 rounded-2xl border-2 ${feature.borderColor} hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Coming Soon Badge */}
                {feature.comingSoon && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-4 sm:mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                {/* Title */}
                <h3 className={`text-xl sm:text-2xl font-bold ${feature.textColor} mb-3`}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Benefits List */}
                <div className="space-y-2">
                  {feature.benefits.map((benefit, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Highlight */}
      <section className="py-12 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6">
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Scale</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300">
              Every feature is designed with one goal: help you grow your agency without sacrificing your sanity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure by Default</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Enterprise-grade security with SOC 2 compliance, end-to-end encryption, and comprehensive audit logging
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Lightning Fast</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Optimized infrastructure ensuring sub-second response times and 99.9% uptime for mission-critical operations
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Always Learning</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI models continuously improve from every interaction, becoming smarter and more efficient over time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 leading-tight">
            Ready to Scale Your Agency?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed opacity-90">
            Join 487+ agencies using AI to reclaim their time and grow without limits
          </p>

          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-white hover:bg-gray-100 text-emerald-800 shadow-2xl rounded-full px-8 sm:px-16 h-14 sm:h-20 text-lg sm:text-2xl font-black mb-4 sm:mb-6 group animate-bounce-subtle active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-2 sm:gap-3">
              Get Started Free
              <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-2 transition-transform" />
            </span>
          </Button>

          <p className="text-sm sm:text-base opacity-90">
            30-Day Money-Back Guarantee • No Credit Card Required • Cancel Anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12 border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Product</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="/#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Company</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Resources</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Legal</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            <p>&copy; 2025 GHL Agency AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        .animate-bounce-subtle:hover {
          animation: bounce-subtle 0.5s ease;
        }
      `}</style>
    </div>
  );
};
