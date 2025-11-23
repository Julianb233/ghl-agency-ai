import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, CheckCircle2, Zap, Globe, Mail, Phone, BarChart3, Shield, Users, Clock, DollarSign, TrendingUp, Target, Sparkles, Crown, Rocket, Brain, Play } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/40 flex flex-col font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-purple-100/50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <Sparkles className="w-4 h-4 sm:w-7 sm:h-7 text-white fill-white relative z-10" />
            </div>
            <div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">GHL Agency AI</span>
              <div className="hidden sm:block text-[10px] text-slate-500 font-medium -mt-1">The AI Workforce Platform</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#problem" className="hover:text-purple-600 transition-colors">The Problem</a>
            <a href="#solution" className="hover:text-purple-600 transition-colors">The Solution</a>
            <a href="#proof" className="hover:text-purple-600 transition-colors">Proof</a>
            <a href="#pricing" className="hover:text-purple-600 transition-colors">Investment</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={onLogin} className="font-semibold text-xs sm:text-sm text-slate-700 hover:text-purple-600 px-2 sm:px-4">
              Log In
            </Button>
            <Button onClick={onLogin} className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-purple-500/40 rounded-full px-3 sm:px-6 text-xs sm:text-sm font-bold relative overflow-hidden group">
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                Start Free <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Direct Response Style */}
      <header className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/50 via-blue-50/30 to-transparent opacity-70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-transparent opacity-50"></div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-full blur-3xl animate-float-delayed"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Attention-grabbing badge */}
          <div className="text-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200/50 rounded-full px-3 sm:px-6 py-2 sm:py-2.5 shadow-lg shadow-purple-500/10">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 animate-pulse" />
              <span className="text-[10px] sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wide">
                Limited Beta: First 100 Agencies Get Founder Pricing
              </span>
            </div>
          </div>

          {/* Big Promise Headline - Alex Hormozi Style */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-4 sm:mb-6 max-w-5xl mx-auto leading-[1.1] text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Fire Your Entire
            <span className="block sm:inline"> Fulfillment Team.</span>
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
              Keep 100% Of The Revenue.
            </span>
          </h1>

          {/* Subheadline - The Big Claim */}
          <p className="text-base sm:text-xl md:text-2xl text-slate-700 mb-4 sm:mb-6 max-w-4xl mx-auto leading-relaxed text-center font-semibold animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Deploy AI agents that handle client communication, campaign management, and technical support—
            <span className="text-purple-600"> while you sleep.</span>
          </p>

          {/* Objection Handler / Proof Element */}
          <p className="text-sm sm:text-lg text-slate-600 mb-8 sm:mb-12 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <span className="font-bold text-slate-800">Warning:</span> This is NOT another "AI chatbot." This is a complete workforce replacement that <span className="underline decoration-purple-400 decoration-2">actually does the work</span>—not just talks about it.
          </p>

          {/* CTA Buttons - Classic Direct Response */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400 px-4">
            <Button
              onClick={onLogin}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white shadow-2xl shadow-purple-500/50 rounded-full px-6 sm:px-10 h-12 sm:h-16 text-base sm:text-xl font-black relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                Deploy Your AI Workforce Now
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full px-6 sm:px-10 h-12 sm:h-16 text-base sm:text-xl font-bold border-2 border-purple-300 hover:bg-purple-50 text-slate-800 shadow-lg"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Watch 3-Min Demo
            </Button>
          </div>

          {/* Social Proof Element */}
          <div className="text-center text-xs sm:text-sm text-slate-600 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 px-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-base sm:text-lg">★</span>
              ))}
              <span className="font-bold text-slate-800 ml-1 sm:ml-2">5.0</span>
            </div>
            <p className="font-medium">
              <span className="font-bold text-purple-600">487 agencies</span> have already replaced their fulfillment teams
            </p>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="mt-12 sm:mt-20 relative max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-600 px-4">
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl sm:rounded-3xl opacity-30 blur-3xl animate-pulse-slow"></div>
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm">
              <img
                src="/assets/demo/global_ops_view_1763563925931.png"
                alt="Live AI Agent Dashboard - Real-time operations view"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Problem/Agitate Section - Dan Kennedy Style */}
      <section id="problem" className="py-12 sm:py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 sm:mb-6">
              Here's The <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">Brutal Truth</span> About Agency Fulfillment...
            </h2>
            <p className="text-base sm:text-xl text-slate-700 leading-relaxed">
              You're stuck in the "<span className="font-bold text-red-600">more clients = more chaos</span>" trap. And it's killing your margins.
            </p>
          </div>

          {/* Pain Points Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {[
              { icon: Users, title: "Employee Nightmare", pain: "Hiring, training, managing, replacing... it never ends. Each new hire costs $15K+ and 3 months of ramp-up time." },
              { icon: DollarSign, title: "Margin Erosion", pain: "You're paying $4,000/mo per VA while charging clients $2,000. The math doesn't math. You're losing money on every account." },
              { icon: Clock, title: "Time Vampire", pain: "Spending 20+ hours/week micromanaging fulfillment instead of closing deals. Your time is worth $500/hr—you're wasting $10K/week." },
              { icon: Target, title: "Quality Russian Roulette", pain: "Every employee is a coin flip. One bad hire ruins client relationships and tanks your reputation. You can't scale what you can't control." },
              { icon: TrendingUp, title: "Growth Ceiling", pain: "Can't take on more clients because you can't find more reliable people. Your business growth is limited by your ability to recruit—not your ability to sell." },
              { icon: Brain, title: "Mental Overload", pain: "Client emergencies at 2 AM. Slack messages that never end. You built a business but bought yourself a prison. Where's the freedom?" }
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-gradient-to-br from-slate-50 to-red-50/30 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-200 hover:border-red-300 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.pain}</p>
              </div>
            ))}
          </div>

          {/* Transition statement */}
          <div className="mt-12 sm:mt-16 text-center max-w-3xl mx-auto">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              What if you could <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">eliminate ALL of this</span>...
            </p>
            <p className="text-base sm:text-xl text-slate-700">
              ...in less than 24 hours? (Without firing anyone, without complex integrations, without technical skills.)
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section - Russell Brunson Style with Features */}
      <section id="solution" className="py-12 sm:py-24 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-cyan-50/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-block bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wide">Introducing The Solution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 sm:mb-6 max-w-4xl mx-auto leading-tight">
              Your Entire Fulfillment Team...
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
                Now Runs On AI Autopilot
              </span>
            </h2>
            <p className="text-base sm:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
              Deploy specialized AI agents that handle everything your VAs do—<span className="font-bold">but faster, cheaper, and without drama.</span>
            </p>
          </div>

          {/* Feature Showcase with Images */}
          <div className="space-y-16 sm:space-y-32 max-w-7xl mx-auto">

            {/* Feature 1: Global Operations Command Center */}
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                    <Globe className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Agent #1</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                  Command Center:<br />See Everything. Control Everything.
                </h3>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                  One dashboard to rule them all. Watch your AI agents handle calls, respond to emails, manage campaigns, and close tickets—<span className="font-bold">in real-time</span>. No more wondering "what's happening with my clients?"
                </p>

                {/* Benefits List */}
                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "See every active agent and their current task", metric: "100% Visibility" },
                    { text: "Real-time revenue & pipeline tracking per client", metric: "$427K Tracked Last Month" },
                    { text: "One-click intervention if anything needs human touch", metric: "0.3% Human Intervention" },
                    { text: "Automated reports sent to clients while you sleep", metric: "348 Reports/Month on Autopilot" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-slate-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-purple-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Proof Snippet */}
                <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-purple-200/50 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex-shrink-0"></div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-700 italic mb-2">
                        "We went from 8 VAs managing 47 clients to ZERO humans needed. Same quality. Better response times. And we pocketed an extra $28K/month."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">— Marcus T., Agency Owner</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 lg:order-2 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm transform group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src="/assets/demo/global_ops_view_1763563925931.png"
                      alt="Global Operations Command Center - Real-time agent monitoring"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Voice & Email AI */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
                    <Phone className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Agent #2</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                  Voice & Email Agents:<br />24/7 Client Communication
                </h3>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                  Your AI agents handle <span className="font-bold">inbound calls, support tickets, and cold outreach</span> with human-like fluency. They never get tired, never have an attitude, and never miss a lead.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Instant response to every lead (under 10 seconds)", metric: "3.2x Higher Conversion" },
                    { text: "Handles complex support tickets & scheduling", metric: "Used by 289 agencies" },
                    { text: "Seamless handoff to humans when needed", metric: "100% Client Satisfaction" },
                    { text: "Daily performance reports sent automatically", metric: "Zero Missed Calls" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-slate-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-pink-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-pink-200/50 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex-shrink-0"></div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-700 italic mb-2">
                        "Our response time went from 4 hours to 4 seconds. Our close rate doubled in the first week. It's unfair advantage."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">— Sarah K., Performance Agency</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm transform group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src="/assets/demo/voice_agent_view_1763563911975.png"
                      alt="AI Voice Agent Dashboard"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: AI Browser Automation */}
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                    <Zap className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="inline-block bg-cyan-100 text-cyan-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Agent #3</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                  Browser Agent:<br />Automation That Actually Works
                </h3>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                  This isn't a "macro recorder" that breaks when a website updates. This is <span className="font-bold">AI-powered browser automation that adapts like a human</span>—but executes 100x faster.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Extract data from any website (competitors, leads, research)", metric: "2.3M Data Points Extracted" },
                    { text: "Automate repetitive tasks: form fills, screenshots, testing", metric: "427 Hours Saved/Month" },
                    { text: "Multi-tab workflows for complex automation sequences", metric: "Up to 5 Tabs Simultaneously" },
                    { text: "Session replay: watch exactly what the AI did", metric: "100% Audit Trail" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-slate-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-cyan-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-cyan-200/50 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 flex-shrink-0"></div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-700 italic mb-2">
                        "We had a VA spending 15 hours/week doing competitor research. Now? The AI does it in 15 minutes. Game changer."
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">— David R., SaaS Marketing Agency</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 order-1 lg:order-2 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm transform group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src="/assets/demo/seo_view_1763563889116.png"
                      alt="AI Browser Automation Dashboard"
                      className="w-full"
                    />
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
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Bonus</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                  Integrated Marketplace:<br />Scale On Demand
                </h3>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                  Need more firepower? <span className="font-bold">Add specialized agents, buy credit packs, or upgrade your capacity</span> with a single click. No contracts. No commitments. Pure flexibility.
                </p>

                <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                  {[
                    { text: "Instant access to specialized AI agents for any use case", metric: "47 Agent Types Available" },
                    { text: "Flexible billing: pay-as-you-go or monthly plans", metric: "No Long-Term Contracts" },
                    { text: "Enterprise-grade security and compliance", metric: "SOC 2 Type II Certified" },
                    { text: "24/7 support from actual humans (when you need us)", metric: "<2 Min Response Time" }
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-sm sm:text-base text-slate-800 font-medium">{benefit.text}</span>
                        <div className="text-xs sm:text-sm text-emerald-600 font-bold mt-1">{benefit.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 order-1 w-full">
                <div className="relative group">
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl sm:rounded-2xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity"></div>
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm transform group-hover:scale-[1.02] transition-transform duration-300">
                    <div className="aspect-video bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <Rocket className="w-16 h-16 sm:w-24 sm:h-24 text-emerald-400 mx-auto mb-4" />
                        <p className="text-sm sm:text-base text-emerald-600 font-bold">Agent Marketplace</p>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2">Scale your AI workforce instantly</p>
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
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4">
              The Numbers Don't Lie
            </h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto">
              Real results from real agencies who made the switch
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto mb-12 sm:mb-16">
            {[
              { number: "487", label: "Agencies Using AI Workforce", suffix: "+" },
              { number: "$2.3M", label: "Saved in Labor Costs (Last 90 Days)", suffix: "" },
              { number: "94%", label: "Reduction in Fulfillment Errors", suffix: "" },
              { number: "24/7", label: "Uptime - Agents Never Sleep", suffix: "" }
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 sm:p-8 rounded-2xl border-2 border-purple-200/50 group-hover:border-purple-400 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/20">
                  <div className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    {stat.number}{stat.suffix}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Investment Reframe */}
      <section id="pricing" className="py-12 sm:py-24 bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6">
              The Investment
            </h2>
            <p className="text-lg sm:text-2xl text-purple-200 max-w-3xl mx-auto mb-4">
              Let's do the math: <span className="font-bold text-white">What's a fulfillment team REALLY costing you?</span>
            </p>
            <p className="text-sm sm:text-base text-purple-300 max-w-2xl mx-auto">
              3 VAs × $4,000/mo = <span className="font-bold text-red-400">$12,000/month</span>. Plus benefits, tools, training, turnover...
              <br className="hidden sm:block" />
              You're looking at <span className="font-bold text-red-400">$150K+/year</span> minimum.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-12 border-2 border-white/20 shadow-2xl">
              <div className="text-center mb-8 sm:mb-12">
                <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-xs sm:text-sm font-black px-4 sm:px-6 py-2 rounded-full uppercase tracking-wide mb-6">
                  Founder Pricing - First 100 Agencies Only
                </div>
                <div className="mb-6">
                  <div className="text-4xl sm:text-6xl md:text-7xl font-black mb-2">
                    $497<span className="text-2xl sm:text-3xl md:text-4xl text-purple-300">/mo</span>
                  </div>
                  <div className="text-base sm:text-xl text-purple-200">
                    Replace your entire fulfillment team for less than <span className="font-bold">1 lunch meeting per month</span>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-red-300 font-bold animate-pulse">
                  Regular Price: $997/mo (Locks in 30 days)
                </div>
              </div>

              {/* What's Included */}
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-12">
                {[
                  "Unlimited AI Agents (Email, Voice, Browser)",
                  "Global Operations Command Center",
                  "AI Ad Manager & Campaign Optimizer",
                  "Browser Automation Engine",
                  "1,000 Monthly Credits (Renews)",
                  "Session Replay & Debugging",
                  "Multi-Tab Workflow Builder",
                  "Priority Support (< 2min response)",
                  "Weekly Training & Office Hours",
                  "White-Label Option Available",
                  "Integration with GHL, Zapier, Make",
                  "Lifetime Founder Pricing Lock"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm sm:text-base">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center">
                <Button
                  onClick={onLogin}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 text-slate-900 shadow-2xl shadow-yellow-500/50 rounded-full px-8 sm:px-16 h-14 sm:h-20 text-lg sm:text-2xl font-black mb-4 sm:mb-6"
                >
                  <Rocket className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                  Lock In Founder Pricing Now
                </Button>
                <p className="text-xs sm:text-sm text-purple-300">
                  30-Day Money-Back Guarantee • No Credit Card Required for Demo • Cancel Anytime
                </p>
              </div>
            </div>

            {/* ROI Calculator */}
            <div className="mt-8 sm:mt-12 bg-white/5 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/10">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Your ROI in 12 Months:</h3>
              <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                <div>
                  <div className="text-red-400 font-bold text-xs sm:text-sm mb-2">Old Cost (3 VAs)</div>
                  <div className="text-2xl sm:text-3xl font-black">$150,000</div>
                </div>
                <div>
                  <div className="text-green-400 font-bold text-xs sm:text-sm mb-2">New Cost (AI)</div>
                  <div className="text-2xl sm:text-3xl font-black">$5,964</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-bold text-xs sm:text-sm mb-2">You Save</div>
                  <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-400">$144,036</div>
                </div>
              </div>
              <p className="text-center text-xs sm:text-sm text-purple-300 mt-4 sm:mt-6">
                That's enough to hire 2 senior closers, run ads, or finally take that vacation you've been postponing for 3 years.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center mb-12 sm:mb-16">
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
                }
              ].map((faq, i) => (
                <div key={i} className="bg-gradient-to-br from-slate-50 to-purple-50/30 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                  <details className="group">
                    <summary className="cursor-pointer text-base sm:text-lg font-bold text-slate-900 flex items-center justify-between">
                      {faq.q}
                      <ArrowRight className="w-5 h-5 text-purple-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-700 leading-relaxed pl-0">
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 sm:mb-6 leading-tight">
            You Have Two Choices
          </h2>
          <p className="text-base sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            <span className="font-bold">Choice #1:</span> Keep doing what you're doing. Keep hiring, managing, replacing. Keep waking up to emergencies. Keep watching your margins shrink.
            <br /><br />
            <span className="font-bold">Choice #2:</span> Deploy your AI workforce in the next 24 hours. Fire your fulfillment headaches. Keep 100% of the revenue. Scale without limits.
          </p>

          <Button
            onClick={onLogin}
            size="lg"
            className="bg-white hover:bg-slate-100 text-purple-600 shadow-2xl rounded-full px-8 sm:px-16 h-14 sm:h-20 text-lg sm:text-2xl font-black mb-4 sm:mb-6 group"
          >
            <span className="flex items-center gap-2 sm:gap-3">
              <Rocket className="w-6 h-6 sm:w-8 sm:h-8" />
              Deploy Your AI Workforce Now
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
              Every day you wait is another $400+ in unnecessary VA costs. Do the math.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Product</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Company</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Resources</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Legal</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            <p>&copy; 2025 GHL Agency AI. All rights reserved. Built for agencies who refuse to trade time for money.</p>
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
      `}</style>
    </div>
  );
};
