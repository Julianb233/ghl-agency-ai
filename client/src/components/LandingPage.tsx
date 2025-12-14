import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, CheckCircle2, Zap, Globe, Mail, Phone, BarChart3, Shield, Users, Clock, DollarSign, TrendingUp, Target, Sparkles, Crown, Rocket, Brain, Play, Menu, X } from 'lucide-react';
import { SkipLink } from './SkipLink';
import { ExitIntentPopup } from './ExitIntentPopup';
import { CookieConsent } from './CookieConsent';
import { CountdownTimer } from './CountdownTimer';
import { TrustBadges, TrustBadgesInline } from './TrustBadges';
import { LiveChat } from './LiveChat';


// Optimized image component with lazy loading and CLS prevention
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}> = ({ src, alt, className = '', priority = false, width, height }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    width={width}
    height={height}
    style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
  />
);

interface LandingPageProps {
  onLogin: () => void;
  onNavigateToFeatures?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onNavigateToFeatures }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      {/* Exit Intent Popup */}
      <ExitIntentPopup onSignUp={onLogin} />

      {/* Skip Navigation Link for Accessibility */}
      <SkipLink />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <Sparkles className="w-4 h-4 sm:w-7 sm:h-7 text-white fill-white relative z-10" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent">GHL Agency AI</span>
              <div className="hidden sm:block text-[11px] text-gray-600 font-semibold -mt-1">Buy Back Your Freedom</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-700">
            {onNavigateToFeatures && (
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToFeatures(); }} className="hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Features</a>
            )}
            <a href="#problem" onClick={(e) => scrollToSection(e, 'problem')} className="hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">The Problem</a>
            <a href="#solution" onClick={(e) => scrollToSection(e, 'solution')} className="hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">The Solution</a>
            <a href="#proof" onClick={(e) => scrollToSection(e, 'proof')} className="hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Proof</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md px-2 py-1">Investment</a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-700 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 rounded-md"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <Button onClick={onLogin} className="lg:hidden bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg rounded-full px-3 sm:px-6 text-xs sm:text-sm font-bold relative overflow-hidden group">
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                Start Free <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Button>
            <div className="hidden lg:flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" onClick={onLogin} className="font-semibold text-xs sm:text-sm text-gray-700 hover:text-emerald-600 px-2 sm:px-4">
                Log In
              </Button>
              <Button onClick={onLogin} className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg rounded-full px-3 sm:px-6 text-xs sm:text-sm font-bold relative overflow-hidden group">
                <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                  Start Free <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <nav className="flex flex-col p-4 gap-4">
              {onNavigateToFeatures && (
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToFeatures(); setIsMobileMenuOpen(false); }} className="text-sm font-medium text-gray-700 hover:text-emerald-600 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-50 transition-colors">Features</a>
              )}
              <a href="#problem" onClick={(e) => scrollToSection(e, 'problem')} className="text-sm font-medium text-gray-700 hover:text-emerald-600 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-50 transition-colors">The Problem</a>
              <a href="#solution" onClick={(e) => scrollToSection(e, 'solution')} className="text-sm font-medium text-gray-700 hover:text-emerald-600 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-50 transition-colors">The Solution</a>
              <a href="#proof" onClick={(e) => scrollToSection(e, 'proof')} className="text-sm font-medium text-gray-700 hover:text-emerald-600 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-50 transition-colors">Proof</a>
              <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="text-sm font-medium text-gray-700 hover:text-emerald-600 py-3 px-4 min-h-[44px] flex items-center rounded-md hover:bg-gray-50 transition-colors">Investment</a>
              <hr className="border-gray-200" />
              <Button variant="ghost" onClick={onLogin} className="font-semibold text-sm text-gray-700 hover:text-emerald-600 justify-start">
                Log In
              </Button>
              <Button onClick={onLogin} className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-full font-bold">
                Start Free <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </nav>
          </div>
        )}
      </nav>

      {/* Hero Section - Direct Response Style */}
      <header id="main-content" className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 overflow-hidden bg-gradient-to-b from-gray-50 to-white" role="banner">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50/80 via-green-50/40 to-transparent opacity-60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-50/60 via-transparent to-transparent opacity-40"></div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-green-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl animate-float-delayed"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Attention-grabbing badge */}
          <div className="text-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-white border border-emerald-200 rounded-full px-3 sm:px-6 py-2 sm:py-2.5 shadow-sm">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent uppercase tracking-wide">
                For Agency Owners Who Are Done Being Babysitters
              </span>
            </div>
          </div>

          {/* Big Promise Headline - Alex Hormozi Style */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-4 sm:mb-6 max-w-5xl mx-auto leading-[1.1] text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Stop Managing.
            <span className="block sm:inline"> Start Living.</span>
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-green-500 to-teal-600">
              Buy Back Your Time, Peace, and Freedom.
            </span>
          </h1>

          {/* Subheadline - The Big Claim */}
          <p className="text-base sm:text-xl md:text-2xl text-gray-700 mb-4 sm:mb-6 max-w-4xl mx-auto leading-relaxed text-center font-semibold animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Finally. An AI workforce that actually shows up, delivers what it promised, and gives you your evenings and weekends back.
          </p>

          {/* Objection Handler / Proof Element */}
          <p className="text-sm sm:text-lg text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <span className="font-bold text-gray-900">Real talk:</span> This isn't another chatbot that "sounds smart but does nothing." This is the AI workforce that handles your fulfillment while you're at dinner with your family. <span className="underline decoration-emerald-400 decoration-2">No more 2am emergency Slack messages.</span>
          </p>

          {/* CTA Buttons - Classic Direct Response */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400 px-4">
            <Button
              onClick={onLogin}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl rounded-full px-6 sm:px-10 h-12 sm:h-16 text-base sm:text-xl font-black relative overflow-hidden group animate-gradient animate-bounce-subtle active:scale-95 transition-transform"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                Claim Your Freedom
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                // Scroll to features section as an alternative to demo video
                document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto rounded-full px-6 sm:px-10 h-12 sm:h-16 text-base sm:text-xl font-bold border-2 border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md animate-bounce-subtle active:scale-95 transition-transform"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              See The Magic
            </Button>
          </div>

          {/* Social Proof Element */}
          <div className="text-center text-xs sm:text-sm text-gray-600 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 px-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-base sm:text-lg">★</span>
              ))}
              <span className="font-bold text-gray-900 ml-1 sm:ml-2">5.0</span>
            </div>
            <p className="font-medium">
              <span className="font-bold text-emerald-600">487 agency owners</span> have reclaimed their time and sanity
            </p>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="mt-12 sm:mt-20 relative max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-600 px-4">
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-emerald-200/40 via-green-200/40 to-teal-200/40 rounded-2xl sm:rounded-3xl blur-3xl"></div>
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
              <OptimizedImage
                src="/assets/demo/global_ops_view_1763563925931.png"
                alt="Live AI Agent Dashboard - Real-time operations view"
                className="w-full"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      {/* Trusted By Social Proof Bar */}
      <section className="py-8 sm:py-12 bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-xs sm:text-sm text-gray-500 font-medium mb-6 uppercase tracking-wider">Trusted by 487+ agencies worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            {/* Logo-style company representations */}
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">GF</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">GrowthForge</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">BP</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">BrightPath</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">SU</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">ScaleUp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">LP</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">LaunchPad</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">VX</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">Voxel</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">NX</span>
              </div>
              <span className="text-sm font-semibold hidden sm:inline">Nexus</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Agitate Section - Agency Tools Focus */}
      <section id="problem" className="py-12 sm:py-24 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-rose-100/40 to-orange-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">The Daily Struggle</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 sm:mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500">Remember Why You Started</span> Your Agency?
            </h2>
            <p className="text-base sm:text-xl text-gray-700 leading-relaxed">
              You mastered <span className="font-bold text-emerald-600">GoHighLevel</span>, <span className="font-bold text-blue-600">Facebook Ads</span>, and <span className="font-bold text-purple-600">client funnels</span>—only to become a <span className="font-bold text-rose-600">babysitter for VAs who ghost you</span>.
            </p>
          </div>

          {/* Pain Points Grid - Centered Icons with Color */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {[
              { icon: Globe, title: "GHL Sub-Account Chaos", pain: "Logging into 50+ sub-accounts daily. Checking automations. Fixing broken workflows. Your VAs can't keep up and you're drowning in the weeds.", color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" },
              { icon: BarChart3, title: "Meta Ads on Fire", pain: "You wake up to ROAS tanking at 3am. By the time your VA sees it, you've burned $500. Who's actually watching your ad accounts?", color: "from-indigo-500 to-purple-500", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-700" },
              { icon: Mail, title: "Lead Follow-Up Falls Through", pain: "Hot leads sitting in GHL for 6+ hours before anyone responds. Speed-to-lead is everything—and you're losing the race every single day.", color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-700" },
              { icon: Phone, title: "Missed Calls = Lost Revenue", pain: "Your AI caller couldn't handle objections. The VA forgot to follow up. Another $5K deal walked out the door while you were in a meeting.", color: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
              { icon: Users, title: "Client Reporting Nightmare", pain: "Pulling data from GHL, Facebook, Google—manually. Creating reports until midnight. Your clients want weekly updates and it's crushing you.", color: "from-rose-500 to-pink-500", bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-700" },
              { icon: Zap, title: "Zapier Breaks at 2AM", pain: "Your automation failed. 200 leads didn't get tagged. The follow-up sequence never fired. Now you're in damage control mode. Again.", color: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", borderColor: "border-violet-200", textColor: "text-violet-700" }
            ].map((item, i) => (
              <div
                key={i}
                className={`group ${item.bgColor} p-6 sm:p-8 rounded-2xl border-2 ${item.borderColor} hover:shadow-xl transition-all duration-300 text-center`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <item.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${item.textColor} mb-3`}>{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{item.pain}</p>
              </div>
            ))}
          </div>

          {/* Transition statement */}
          <div className="mt-12 sm:mt-20 text-center max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-8 sm:p-10 rounded-3xl border border-emerald-200 shadow-lg">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                What if your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">GHL, Meta Ads, and lead follow-up ran themselves</span>...
              </p>
              <p className="text-base sm:text-xl text-gray-700">
                ...24/7, without VAs, without Zapier breaking, without checking your phone at dinner?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - Russell Brunson Style with Features */}
      <section id="solution" className="py-12 sm:py-24 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-block bg-white border border-emerald-200 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 mb-4 sm:mb-6 shadow-sm">
              <span className="text-xs sm:text-sm font-bold text-emerald-700 uppercase tracking-wide">The Freedom Machine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 sm:mb-6 max-w-4xl mx-auto leading-tight">
              Get Your Life Back.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-green-500 to-teal-600">
                Sleep Through The Night. Take Real Vacations.
              </span>
            </h2>
            <p className="text-base sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              An AI workforce that works 24/7, never complains, never ghosts, and <span className="font-bold">actually gives you the freedom you started your agency for.</span>
            </p>
          </div>

          {/* Feature Showcase with Images */}
          <div className="space-y-16 sm:space-y-32 max-w-7xl mx-auto">

            {/* Feature 1: Global Operations Command Center */}
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md">
                    <Globe className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-emerald-200">Peace of Mind</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">
                  Sleep Through The Night<br />Knowing Nothing's On Fire
                </h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  One dashboard. Complete visibility. Watch your AI agents handle everything in real-time—or don't watch at all. That's the beauty. <span className="font-bold">You can finally trust the work is getting done while you're living your life.</span>
                </p>

                {/* Benefits List */}
                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Get your evenings back—no more 'quick checks' at dinner", metric: "87% Report Better Work-Life Balance" },
                    { text: "Take vacations without checking Slack every 5 minutes", metric: "Real Time Off, Finally" },
                    { text: "Wake up to clients served, not fires to put out", metric: "Morning Peace Restored" },
                    { text: "One glance tells you everything—or ignore it completely", metric: "Mental Space Reclaimed" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-emerald-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Proof Snippet */}
                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 shadow-md">
                  <div className="flex items-start gap-3">
                    <OptimizedImage
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face"
                      alt="Marcus T."
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-200 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 italic mb-2">
                        "I took my first real vacation in 4 years. Didn't check my phone once. The AI handled 47 clients flawlessly. I cried when I realized what I'd been missing."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">— Marcus T., Founder @ GrowthForge Media</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xs">★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 lg:order-2 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl sm:rounded-2xl opacity-50 blur-2xl"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white transform group-hover:scale-[1.02] transition-transform duration-300">
                    <OptimizedImage
                      src="/assets/demo/global_ops_view_1763563925931.png"
                      alt="Global Operations Command Center - Real-time agent monitoring"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: AI Ad Manager */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md">
                    <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Never Sleeps</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">
                  24/7 Ad Optimization<br />While You're With Your Family
                </h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  Your AI ad manager watches campaigns while you're at your kid's soccer game. It never forgets to check. Never misses an opportunity. <span className="font-bold">You finally get to be present in your life.</span>
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Spots problems at 3am and fixes them—no frantic morning calls", metric: "Zero Morning Panic Attacks" },
                    { text: "Clients get better results without you checking obsessively", metric: "Freedom From Micromanaging" },
                    { text: "Spend time growing the business, not babysitting ads", metric: "Time For What Actually Matters" },
                    { text: "No more 'Did anyone check the campaign?' anxiety", metric: "Mental Peace Restored" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-teal-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 shadow-md">
                  <div className="flex items-start gap-3">
                    <OptimizedImage
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face"
                      alt="Sarah K."
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-teal-200 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 italic mb-2">
                        "I used to wake up at 5am to check campaigns before my media buyer logged on. Now I sleep till 7, have coffee with my wife, and the work's already done. Life-changing."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">— Sarah K., CEO @ BrightPath Digital</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xs">★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-teal-100 to-green-100 rounded-xl sm:rounded-2xl opacity-50 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white transform group-hover:scale-[1.02] transition-transform duration-300">
                    <div className="aspect-video bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <BarChart3 className="w-16 h-16 sm:w-24 sm:h-24 text-teal-400 mx-auto mb-4" />
                        <p className="text-sm sm:text-base text-teal-600 font-bold">AI Ad Manager Dashboard</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Automated campaign optimization in real-time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: AI Browser Automation */}
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md">
                    <Zap className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-lime-50 text-lime-700 border border-lime-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Time Freedom</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">
                  Stop Doing Grunt Work<br />Start Living Your Life
                </h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  All those tedious tasks eating your day? Gone. The AI handles research, data entry, reporting—<span className="font-bold">all the soul-crushing busywork that keeps you from what matters.</span> Get your weekends back.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Reclaim 15+ hours/week from repetitive tasks", metric: "That's 60 Hours/Month Back" },
                    { text: "Stop working weekends to 'catch up' on admin", metric: "Saturday Mornings Are Yours Again" },
                    { text: "Spend time on strategy, family, or actual rest", metric: "Energy Restored" },
                    { text: "No more 'I'll do it later' guilt pile", metric: "Mental Clarity Back" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-lime-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 shadow-md">
                  <div className="flex items-start gap-3">
                    <OptimizedImage
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face"
                      alt="David R."
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-lime-200 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 italic mb-2">
                        "I used to spend Sundays doing research and reports. Last Sunday I went hiking with my daughter. The work was done Monday morning. I actually felt like a human again."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">— David R., Founder @ ScaleUp Agency</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xs">★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 lg:order-2 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-lime-100 to-green-100 rounded-xl sm:rounded-2xl opacity-50 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white transform group-hover:scale-[1.02] transition-transform duration-300">
                    <div className="aspect-video bg-gradient-to-br from-lime-50 to-green-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <Zap className="w-16 h-16 sm:w-24 sm:h-24 text-lime-400 mx-auto mb-4" />
                        <p className="text-sm sm:text-base text-lime-600 font-bold">AI Browser Automation</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Extract data, automate tasks, save hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Marketplace */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                    <Rocket className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Scale Freedom</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">
                  Scale Without The Stress<br />Grow Without The Chaos
                </h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  Need more capacity? Click a button. That's it. No recruiting. No training. No drama. <span className="font-bold">Your business grows without stealing more of your life.</span> This is what freedom looks like.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Add capacity in 60 seconds, not 60 days", metric: "Zero Recruiting Headaches" },
                    { text: "No commitments—scale up or down as you need", metric: "Complete Flexibility" },
                    { text: "Take on more clients without sacrificing your sanity", metric: "Growth Without Chaos" },
                    { text: "Actual humans available when you need us (rarely)", metric: "Real Support, Real Fast" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-emerald-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 order-1 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white transform group-hover:scale-[1.02] transition-transform duration-300">
                    <div className="aspect-video bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <Rocket className="w-16 h-16 sm:w-24 sm:h-24 text-emerald-400 mx-auto mb-4" />
                        <p className="text-sm sm:text-base text-emerald-600 font-bold">Agent Marketplace</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Scale your AI workforce instantly</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Proof/Results Section */}
      <section id="proof" className="py-12 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Real Agency Owners. Real Life Back.
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Time reclaimed. Stress eliminated. Freedom restored.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto mb-12 sm:mb-16">
            {[
              { number: "487", label: "Agency Owners Living Again", suffix: "+" },
              { number: "18hrs", label: "Average Time Reclaimed Per Week", suffix: "" },
              { number: "94%", label: "Report Dramatically Reduced Stress", suffix: "" },
              { number: "24/7", label: "Working For You (While You Sleep)", suffix: "" }
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 sm:p-8 rounded-2xl border-2 border-emerald-200/50 group-hover:border-emerald-400 transition-all duration-300 animate-card-lift">
                  <div className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 animate-count-up" style={{ animationDelay: `${i * 150}ms` }}>
                    {stat.number}{stat.suffix}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                quote: "I finally made it to my son's baseball games. ALL of them. The AI handled client requests while I was in the stands cheering. Worth every penny.",
                name: "Michael Chen",
                role: "Founder @ Apex Digital",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face",
                result: "15 hrs/week saved"
              },
              {
                quote: "Went from working 70-hour weeks to 35. Same revenue. Actually MORE revenue because I'm not burned out. My wife has her husband back.",
                name: "Jennifer Walsh",
                role: "CEO @ Velocity Marketing",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face",
                result: "50% time reduction"
              },
              {
                quote: "Fired 3 VAs who kept ghosting me. The AI hasn't missed a single task in 4 months. Zero drama. Zero excuses. Just results.",
                name: "Robert Martinez",
                role: "Owner @ Catalyst Agency",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=96&h=96&fit=crop&crop=face",
                result: "100% reliability"
              },
              {
                quote: "Date nights are actually date nights now. I'm not checking my phone every 5 minutes. That alone changed my marriage.",
                name: "Amanda Foster",
                role: "Founder @ Spark Social",
                image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=96&h=96&fit=crop&crop=face",
                result: "Peace of mind"
              },
              {
                quote: "Scaled from 12 to 40 clients without hiring anyone new. The math finally makes sense. My margins are actually healthy now.",
                name: "Daniel Kim",
                role: "CEO @ Launchpoint Media",
                image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=face",
                result: "3x client capacity"
              },
              {
                quote: "Took a 2-week vacation and didn't open my laptop ONCE. Came back to happy clients and zero fires. First time in 6 years.",
                name: "Lisa Thompson",
                role: "Owner @ Horizon Digital",
                image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=face",
                result: "True vacation"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <OptimizedImage
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200 group-hover:border-emerald-400 transition-colors"
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {testimonial.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - 4-Tier Structure */}
      <section id="pricing" className="py-12 sm:py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 text-gray-900">
              What's Your Freedom Worth?
            </h2>
            <p className="text-lg sm:text-2xl text-gray-700 max-w-3xl mx-auto mb-4">
              <span className="font-bold text-gray-900">You're already paying the price—in time, stress, and sanity.</span>
            </p>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              3 VAs at $4K/month = <span className="font-bold text-red-600">$144,000/year</span> in labor costs.
              <br className="hidden sm:block" />
              Buy back your freedom for a fraction of that cost.
            </p>
          </div>

          {/* What Are AI Team Members? */}
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">What Are AI Team Members?</h3>
              <p className="text-sm text-gray-700">
                Think of each AI Team Member as a <span className="font-bold text-emerald-700">virtual employee that works 24/7</span>.
                Each one can handle tasks like lead follow-up, data entry, appointment setting, and client communication—simultaneously.
                <span className="font-bold"> 3 AI Team Members = the work output of 2-3 full-time VAs</span>, but at a fraction of the cost.
              </p>
            </div>
          </div>

          {/* 4-Tier Pricing Grid */}
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

            {/* Starter Tier */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow relative">
              <div className="text-center mb-6">
                <div className="inline-block bg-gray-100 text-gray-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide mb-4">
                  Starter
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">For Growing Agencies</h3>
                <div className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1.5 rounded-lg mb-2">
                  3 AI Team Members
                </div>
                <p className="text-xs text-gray-500 mb-1">Replaces 1-2 full-time VAs</p>
                <p className="text-xs text-amber-600 font-medium mb-3">Up to 25 clients</p>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">$997</span>
                  <span className="text-lg text-gray-600">/mo</span>
                </div>
                <p className="text-xs text-emerald-700 font-bold mb-2">Just $332/AI Team Member</p>
                <p className="text-sm text-gray-600 font-medium">$997 White-Glove Setup</p>
                <p className="text-xs text-gray-500 mt-1">or $274/week</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "AI Email Agents",
                  "Operations Dashboard",
                  "GHL Integration",
                  "Email Support",
                  "Basic Reporting"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={onLogin}
                variant="outline"
                className="w-full rounded-full h-12 font-bold border-2 border-gray-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Get Started
              </Button>
            </div>

            {/* Growth Tier - Most Popular */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border-2 border-emerald-500 shadow-xl relative transform lg:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-6 pt-2">
                <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide mb-4">
                  Growth
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">For Scaling Agencies</h3>
                <div className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 text-sm font-bold px-3 py-1.5 rounded-lg mb-2">
                  5 AI Team Members
                </div>
                <p className="text-xs text-gray-500 mb-1">Replaces 2-3 full-time VAs</p>
                <p className="text-xs text-emerald-600 font-medium mb-3">Unlimited clients</p>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">$1,697</span>
                  <span className="text-lg text-gray-600">/mo</span>
                </div>
                <p className="text-xs text-emerald-700 font-bold mb-2">Just $339/AI Team Member</p>
                <p className="text-sm text-gray-600 font-medium">$997 White-Glove Setup</p>
                <p className="text-xs text-gray-500 mt-1">or $467/week</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "Everything in Starter, plus:",
                  "AI Voice Agents",
                  "AI Ad Manager & Optimizer",
                  "Multi-Tab Workflow Builder",
                  "Priority Support (< 2hr)"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className={i === 0 ? "font-semibold text-emerald-700" : ""}>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={onLogin}
                className="w-full bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-full h-12 font-black shadow-lg hover:shadow-xl transition-shadow"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>

            {/* Professional Tier */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-center mb-6">
                <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide mb-4">
                  Professional
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">For Established Agencies</h3>
                <div className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1.5 rounded-lg mb-2">
                  8 AI Team Members
                </div>
                <p className="text-xs text-gray-500 mb-1">Replaces 4-5 full-time VAs</p>
                <p className="text-xs text-blue-600 font-medium mb-3">Unlimited clients</p>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">$3,197</span>
                  <span className="text-lg text-gray-600">/mo</span>
                </div>
                <p className="text-xs text-blue-700 font-bold mb-2">Just $400/AI Team Member</p>
                <p className="text-sm text-gray-600 font-medium">$997 White-Glove Setup</p>
                <p className="text-xs text-gray-500 mt-1">or $879/week</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "Everything in Growth, plus:",
                  "White-Label Option",
                  "Dedicated Account Manager",
                  "Weekly Strategy Calls",
                  "Custom Integrations"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className={i === 0 ? "font-semibold text-blue-700" : ""}>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={onLogin}
                variant="outline"
                className="w-full rounded-full h-12 font-bold border-2 border-blue-400 hover:border-blue-500 hover:bg-blue-50 text-blue-700 transition-colors"
              >
                Get Started
              </Button>
            </div>

            {/* Enterprise Tier - Best Value */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow relative">
              <div className="absolute -top-3 right-4">
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Best Value
                </span>
              </div>
              <div className="text-center mb-6">
                <div className="inline-block bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide mb-4">
                  Enterprise
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">For Industry Leaders</h3>
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-bold px-3 py-1.5 rounded-lg mb-2">
                  15+ AI Team Members
                </div>
                <p className="text-xs text-gray-500 mb-1">Replaces 8-10+ full-time VAs</p>
                <p className="text-xs text-amber-600 font-medium mb-3">Unlimited everything</p>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">$4,997</span>
                  <span className="text-lg text-gray-600">/mo</span>
                </div>
                <p className="text-xs text-amber-700 font-bold mb-2">Just $333/AI Team Member</p>
                <p className="text-sm text-gray-600 font-medium">$997 White-Glove Setup</p>
                <p className="text-xs text-gray-500 mt-1">or $1,374/week</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  "Everything in Professional, plus:",
                  "Full White-Label Branding",
                  "VIP Support (< 30min)",
                  "SLA & Uptime Guarantee",
                  "Custom Development"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className={i === 0 ? "font-semibold text-amber-700" : ""}>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={onLogin}
                variant="outline"
                className="w-full rounded-full h-12 font-bold border-2 border-amber-400 hover:border-amber-500 hover:bg-amber-50 text-amber-700 transition-colors"
              >
                <Crown className="w-4 h-4 mr-2" />
                Book a Demo
              </Button>
            </div>
          </div>

          {/* Urgency Banner */}
          <div className="max-w-3xl mx-auto text-center mb-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl px-6 py-4">
              <p className="text-sm font-bold text-red-700 mb-1">
                Limited Availability: Only accepting 15 new agencies this month
              </p>
              <p className="text-xs text-gray-600">
                Due to onboarding capacity, we limit new sign-ups to ensure quality setup for every client.
              </p>
            </div>
          </div>

          {/* Weekly Payment Note */}
          <div className="max-w-3xl mx-auto text-center mb-8">
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-6 py-3">
              <span className="font-medium text-gray-700">Prefer weekly billing?</span> We offer weekly payments for added flexibility. Same great service, your preferred schedule.
            </p>
          </div>

          {/* Guarantees & CTA */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">30-Day Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Zap className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">Free Demo Available</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">Cancel Anytime</span>
              </div>
            </div>
            <TrustBadges variant="light" />
          </div>

          {/* ROI Calculator */}
          <div className="mt-12 max-w-4xl mx-auto bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-emerald-200 shadow-md">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">The Math on 5 AI Team Members (Growth Plan)</h3>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-center mb-6">
              <div className="bg-white/80 p-4 rounded-xl">
                <div className="text-red-600 font-bold text-xs sm:text-sm mb-2">Hiring 3 VAs Instead</div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900">$144,000</div>
                <div className="text-xs text-gray-500">3 VAs × $4K/mo × 12</div>
              </div>
              <div className="bg-white/80 p-4 rounded-xl">
                <div className="text-emerald-700 font-bold text-xs sm:text-sm mb-2">5 AI Team Members</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">$21,661</div>
                <div className="text-xs text-gray-500">$1,697/mo × 12 + setup</div>
              </div>
              <div className="bg-white/80 p-4 rounded-xl">
                <div className="text-amber-700 font-bold text-xs sm:text-sm mb-2">You Keep</div>
                <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-green-600">$122,339</div>
                <div className="text-xs text-gray-500">+ they work 24/7</div>
              </div>
            </div>
            <p className="text-center text-xs sm:text-sm text-gray-600">
              That's enough to finally take that vacation, be at every soccer game, and sleep through the night. Remember why you started this?
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 text-center mb-12 sm:mb-16">
              Questions You're Probably Asking...
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "Does this really work for MY agency? I'm in a unique niche...",
                  a: "Yes. Whether you do lead gen, ad management, SEO, web design, or anything else—these agents handle the repetitive fulfillment work that exists in EVERY agency. They're specialized by task (email, calls, automation), not by industry."
                },
                {
                  q: "What happens if I run out of credits?",
                  a: "You can purchase top-up packs anytime (500 credits for $50). Unused credits roll over. Or upgrade your plan. You're always in control. No surprise bills, no overages without your approval."
                },
                {
                  q: "Can I control who uses credits? I don't want my team going crazy...",
                  a: "Absolutely. Set daily or monthly credit limits for individual team members in the Team Permissions settings. You control the budget down to the user level."
                },
                {
                  q: "Is this going to replace my entire team? What about my VAs?",
                  a: "It replaces the WORK, not necessarily the PEOPLE. Many agencies redeploy their VAs to higher-value tasks (sales, client management, strategy) while AI handles the grunt work. Or, yes, you can scale down your team and pocket the savings. Your call."
                },
                {
                  q: "What if a client notices it's AI and freaks out?",
                  a: "White-label option is available. Your clients see YOUR branding, YOUR domain, YOUR logo. We operate in the background. Plus, if your clients are happier with faster response times and better results... do they really care?"
                },
                {
                  q: "How long does it take to set up?",
                  a: "Most agencies are fully operational in under 24 hours. Seriously. Connect your accounts, configure your agents, and watch them work. We provide step-by-step onboarding and weekly office hours to help you get started fast."
                },
                {
                  q: "What if I don't like it?",
                  a: "30-day money-back guarantee. No questions asked. But here's the thing: once you see your first AI-handled client ticket at 2 AM while you're sleeping... you're probably not going back."
                },
                {
                  q: "This sounds too good to be true. What's the catch?",
                  a: "We get it. Here's the honest truth: AI won't replace your creative strategy, your client relationships, or your vision. What it WILL do is handle the repetitive execution work that eats 60% of your week. The 'catch' is you still need to set up your workflows initially (we help), and complex edge cases still benefit from human review. But for the 80% of tasks that are predictable and repeatable? That's where the magic happens. We're not promising unicorns—we're promising your weekends back."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-50 to-emerald-50/30 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
                  <details className="group">
                    <summary className="cursor-pointer text-base sm:text-lg font-bold text-gray-900 flex items-center justify-between">
                      {faq.q}
                      <ArrowRight className="w-5 h-5 text-emerald-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 leading-relaxed pl-0">
                      {faq.a}
                    </p>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 sm:mb-6 leading-tight">
            Here's What It Comes Down To
          </h2>
          <p className="text-base sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            You can keep doing what you're doing. Keep managing VAs who ghost you. Keep missing dinner with your family. Keep waking up at 2am to client fires. Keep pretending this is "freedom."
            <br /><br />
            <span className="font-bold">Or you can let AI handle the work while you actually live your life.</span> Sleep through the night. Show up for your kids. Build the business AND have the life you started this whole thing for.
          </p>

          <Button
            onClick={onLogin}
            size="lg"
            className="bg-white hover:bg-gray-100 text-emerald-800 shadow-2xl rounded-full px-8 sm:px-16 h-14 sm:h-20 text-lg sm:text-2xl font-black mb-4 sm:mb-6 group animate-bounce-subtle active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-2 sm:gap-3">
              <Rocket className="w-6 h-6 sm:w-8 sm:h-8" />
              I'm Ready To Reclaim My Life
              <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-2 transition-transform" />
            </span>
          </Button>

          <p className="text-xs sm:text-sm opacity-90 mb-8 sm:mb-12">
            30-Day Money-Back Guarantee • No Credit Card Required • Cancel Anytime
          </p>

          <div className="inline-block bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
            <p className="text-xs sm:text-sm mb-2 opacity-90">
              <span className="font-bold">P.S.</span> The founder pricing ($497/mo) locks in 30 days. After that, it's $997/mo for new signups.
            </p>
            <p className="text-xs sm:text-sm opacity-90">
              Every day you wait is another day stolen from your family. Another weekend lost. Another evening you can't get back. <span className="font-bold">How much is your time worth?</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 text-gray-600 py-8 sm:py-12 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Product</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Company</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Resources</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Legal</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-300 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            <p>&copy; 2025 GHL Agency AI. All rights reserved. Built for agency owners who refuse to sacrifice their lives for their business.</p>
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
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-lift {
          from { transform: translateY(0); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          to { transform: translateY(-8px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-bounce-subtle:hover {
          animation: bounce-subtle 0.5s ease;
        }
        .animate-card-lift:hover {
          animation: card-lift 0.3s ease forwards;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .animate-count-up {
          animation: count-up 0.6s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Live Chat Widget */}
      <LiveChat />
    </div>
  );
};
