import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Building2, GraduationCap, ShoppingCart, Home, Heart, Briefcase, Megaphone, Code } from 'lucide-react';
import { Link } from 'wouter';
import { UseCaseCard, IndustryFilter } from '../components/use-cases';
import { ParticleFlow } from '../components/effects/ParticleFlow';
import { GradientText } from '../components/effects/GradientText';

const industries = [
  { id: 'all', label: 'All Industries', count: 8 },
  { id: 'agency', label: 'Agencies', count: 2 },
  { id: 'coach', label: 'Coaches', count: 1 },
  { id: 'saas', label: 'SaaS', count: 1 },
  { id: 'ecommerce', label: 'E-commerce', count: 1 },
  { id: 'realestate', label: 'Real Estate', count: 1 },
  { id: 'healthcare', label: 'Healthcare', count: 1 },
  { id: 'marketing', label: 'Marketing', count: 1 },
];

const useCases = [
  {
    id: 1,
    industry: 'agency',
    icon: Building2,
    title: 'Digital Marketing Agency Automation',
    industryLabel: 'Digital Agency',
    description: 'A full-service digital agency automated their client onboarding, reporting, and campaign management across 50+ GHL sub-accounts.',
    gradient: 'from-blue-500 to-cyan-500',
    metrics: [
      { value: 85, suffix: '%', label: 'Time Saved' },
      { value: 50, suffix: '+', label: 'Clients Managed' },
      { value: 3, suffix: 'x', label: 'Revenue Growth' },
    ],
    challenge: 'Managing 50+ clients with manual reporting took 40+ hours weekly. Inconsistent client experiences led to churn.',
    solution: 'Deployed AI workflows for automated client onboarding, weekly report generation, and campaign optimization. Browser agents handle routine GHL tasks automatically.',
  },
  {
    id: 2,
    industry: 'coach',
    icon: GraduationCap,
    title: 'Business Coach Lead Nurturing',
    industryLabel: 'Coaching',
    description: 'A high-ticket business coach automated their entire lead qualification and nurturing process, from initial contact to booked calls.',
    gradient: 'from-purple-500 to-pink-500',
    metrics: [
      { value: 47, suffix: '%', label: 'More Bookings' },
      { value: 8, prefix: '$', suffix: 'K', label: 'Avg Deal Size' },
      { value: 24, suffix: '/7', label: 'Response Time' },
    ],
    challenge: 'Leads went cold due to slow follow-up. High-value prospects slipped through the cracks during busy periods.',
    solution: 'AI-powered lead scoring and automated nurture sequences. Browser agents qualify leads and book calls directly into calendar.',
  },
  {
    id: 3,
    industry: 'saas',
    icon: Code,
    title: 'SaaS Customer Success Automation',
    industryLabel: 'SaaS',
    description: 'A B2B SaaS company automated user onboarding, feature adoption tracking, and churn prevention workflows.',
    gradient: 'from-emerald-500 to-teal-500',
    metrics: [
      { value: 35, suffix: '%', label: 'Churn Reduced' },
      { value: 2, suffix: 'x', label: 'Feature Adoption' },
      { value: 92, suffix: '%', label: 'CSAT Score' },
    ],
    challenge: 'Users churned due to poor onboarding. Customer success team was overwhelmed with repetitive tasks.',
    solution: 'Automated onboarding sequences triggered by user behavior. AI identifies at-risk accounts and initiates proactive outreach.',
  },
  {
    id: 4,
    industry: 'ecommerce',
    icon: ShoppingCart,
    title: 'E-commerce Order & Review Automation',
    industryLabel: 'E-commerce',
    description: 'An online retailer automated their post-purchase flow, review collection, and customer win-back campaigns.',
    gradient: 'from-orange-500 to-red-500',
    metrics: [
      { value: 340, suffix: '%', label: 'Review Increase' },
      { value: 28, suffix: '%', label: 'Repeat Purchases' },
      { value: 15, prefix: '$', suffix: 'K', label: 'Monthly Recovery' },
    ],
    challenge: 'Low review volume hurt SEO rankings. Abandoned carts and lapsed customers represented significant lost revenue.',
    solution: 'Automated review request sequences with perfect timing. AI-powered cart abandonment and win-back campaigns.',
  },
  {
    id: 5,
    industry: 'realestate',
    icon: Home,
    title: 'Real Estate Lead Management',
    industryLabel: 'Real Estate',
    description: 'A real estate team automated lead distribution, property matching, and showing schedule management.',
    gradient: 'from-amber-500 to-orange-500',
    metrics: [
      { value: 65, suffix: '%', label: 'Faster Response' },
      { value: 4, suffix: 'x', label: 'Leads Handled' },
      { value: 23, suffix: '%', label: 'Close Rate Up' },
    ],
    challenge: 'Leads weren\'t distributed effectively. Agents spent hours on admin instead of selling.',
    solution: 'AI routes leads to the best-matched agent. Browser agents update MLS listings and schedule showings automatically.',
  },
  {
    id: 6,
    industry: 'healthcare',
    icon: Heart,
    title: 'Medical Practice Patient Engagement',
    industryLabel: 'Healthcare',
    description: 'A multi-location medical practice automated appointment reminders, follow-ups, and patient reactivation.',
    gradient: 'from-rose-500 to-pink-500',
    metrics: [
      { value: 67, suffix: '%', label: 'No-Shows Reduced' },
      { value: 45, suffix: '%', label: 'Reactivations' },
      { value: 4.9, suffix: '★', label: 'Patient Rating' },
    ],
    challenge: 'High no-show rates wasted provider time. Inactive patients represented untapped revenue.',
    solution: 'Multi-channel appointment reminders with confirmation tracking. AI identifies patients due for checkups and initiates outreach.',
  },
  {
    id: 7,
    industry: 'agency',
    icon: Briefcase,
    title: 'White-Label Agency Scaling',
    industryLabel: 'White-Label Agency',
    description: 'A white-label marketing agency scaled from 10 to 100 clients without adding headcount using AI automation.',
    gradient: 'from-indigo-500 to-purple-500',
    metrics: [
      { value: 10, suffix: 'x', label: 'Client Growth' },
      { value: 0, label: 'Staff Added' },
      { value: 97, suffix: '%', label: 'SLA Compliance' },
    ],
    challenge: 'Couldn\'t scale without proportionally increasing staff costs. Quality suffered at higher volumes.',
    solution: 'End-to-end automation of client deliverables. AI ensures consistent quality across all accounts regardless of volume.',
  },
  {
    id: 8,
    industry: 'marketing',
    icon: Megaphone,
    title: 'Content Marketing Automation',
    industryLabel: 'Content Marketing',
    description: 'A content agency automated research, brief creation, and content distribution across multiple channels.',
    gradient: 'from-cyan-500 to-blue-500',
    metrics: [
      { value: 5, suffix: 'x', label: 'Content Output' },
      { value: 40, suffix: '%', label: 'Cost Reduction' },
      { value: 180, suffix: '%', label: 'Traffic Growth' },
    ],
    challenge: 'Content creation bottleneck limited growth. Manual distribution meant inconsistent publishing schedules.',
    solution: 'AI assists with research and brief generation. Browser agents handle multi-platform publishing and performance tracking.',
  },
];

export default function UseCases() {
  const [activeIndustry, setActiveIndustry] = useState('all');

  const filteredUseCases = useMemo(() => {
    if (activeIndustry === 'all') return useCases;
    return useCases.filter((uc) => uc.industry === activeIndustry);
  }, [activeIndustry]);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Particle background */}
      <ParticleFlow
        particleCount={50}
        colors={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']}
        maxDistance={100}
        speed={0.2}
      />

      {/* Gradient orbs */}
      <div className="absolute top-40 left-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-60 right-1/3 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <GradientText
                gradient="from-blue-400 via-purple-500 to-pink-500"
                animated
              >
                Real Results, Real Businesses
              </GradientText>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
              Discover how agencies, coaches, and businesses across industries are transforming their operations with AI-powered automation.
            </p>

            {/* Industry Filter */}
            <IndustryFilter
              industries={industries}
              activeIndustry={activeIndustry}
              onSelect={setActiveIndustry}
            />
          </motion.div>
        </section>

        {/* Use Cases Grid */}
        <section className="container mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndustry}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            >
              {filteredUseCases.map((useCase, index) => (
                <UseCaseCard
                  key={useCase.id}
                  icon={useCase.icon}
                  title={useCase.title}
                  industry={useCase.industryLabel}
                  description={useCase.description}
                  metrics={useCase.metrics}
                  gradient={useCase.gradient}
                  challenge={useCase.challenge}
                  solution={useCase.solution}
                  delay={index * 0.1}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredUseCases.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-slate-400">No use cases found for this industry.</p>
            </motion.div>
          )}
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="max-w-3xl mx-auto text-center glass-card p-12 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Write Your Success Story?
            </h2>
            <p className="text-slate-400 mb-8">
              Join hundreds of businesses already transforming their operations with AI-powered automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/pricing"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Pricing
              </motion.a>
              <motion.a
                href="/features"
                className="px-8 py-4 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Explore Features
              </motion.a>
            </div>
          </motion.div>
        </section>

        {/* Footer spacer */}
        <div className="h-20" />
      </div>
    </div>
  );
}
