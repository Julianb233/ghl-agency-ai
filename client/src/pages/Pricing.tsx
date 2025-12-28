import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Shield, Users, Headphones } from 'lucide-react';
import { Link } from 'wouter';
import { PricingCard, PricingToggle, FeatureComparison } from '../components/pricing';
import { ParticleFlow } from '../components/effects/ParticleFlow';
import { GradientText } from '../components/effects/GradientText';

const pricingPlans = [
  {
    name: 'Starter',
    description: 'Perfect for solo entrepreneurs getting started',
    monthlyPrice: 97,
    annualPrice: 970,
    gradient: 'from-blue-400 to-cyan-500',
    features: [
      { text: '5 AI Workflow Automations/month', included: true },
      { text: '1 Browser Agent', included: true },
      { text: '10 Credential Vault slots', included: true },
      { text: '1 GHL Sub-account', included: true },
      { text: 'GPT-4 Integration', included: true },
      { text: 'Basic Workflow Templates', included: true },
      { text: 'Email Support', included: true },
      { text: 'Claude Integration', included: false },
      { text: 'Scheduled Automations', included: false },
      { text: 'API Access', included: false },
    ],
  },
  {
    name: 'Professional',
    description: 'For growing agencies with multiple clients',
    monthlyPrice: 297,
    annualPrice: 2970,
    popular: true,
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    features: [
      { text: '50 AI Workflow Automations/month', included: true, highlight: true },
      { text: '5 Browser Agents', included: true, highlight: true },
      { text: '100 Credential Vault slots', included: true },
      { text: '10 GHL Sub-accounts', included: true },
      { text: 'GPT-4 + Claude Integration', included: true, highlight: true },
      { text: 'Advanced Workflow Templates', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Scheduled Automations', included: true },
      { text: 'Webhook Integration', included: true },
      { text: 'API Access', included: true },
    ],
  },
  {
    name: 'Agency',
    description: 'Scale your agency with unlimited power',
    monthlyPrice: 597,
    annualPrice: 5970,
    gradient: 'from-purple-400 to-pink-500',
    features: [
      { text: 'Unlimited AI Automations', included: true, highlight: true },
      { text: '25 Browser Agents', included: true, highlight: true },
      { text: 'Unlimited Credential Vault', included: true },
      { text: '100 GHL Sub-accounts', included: true },
      { text: 'Custom AI Models', included: true, highlight: true },
      { text: 'Premium Workflow Templates', included: true },
      { text: '10 Team Members', included: true },
      { text: 'White-label Option', included: true },
      { text: 'Custom Onboarding', included: true },
      { text: '99.5% SLA Guarantee', included: true },
    ],
  },
  {
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    monthlyPrice: null,
    annualPrice: null,
    gradient: 'from-emerald-400 to-cyan-500',
    ctaText: 'Contact Sales',
    ctaLink: '/contact',
    features: [
      { text: 'Everything in Agency', included: true },
      { text: 'Unlimited Browser Agents', included: true, highlight: true },
      { text: 'Unlimited Team Members', included: true },
      { text: 'Unlimited GHL Sub-accounts', included: true },
      { text: 'Dedicated Account Manager', included: true, highlight: true },
      { text: 'SSO / SAML Authentication', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'On-premise Deployment Option', included: true },
      { text: '99.9% SLA Guarantee', included: true, highlight: true },
      { text: 'Custom Contract Terms', included: true },
    ],
  },
];

const guarantees = [
  {
    icon: Zap,
    title: '14-Day Free Trial',
    description: 'Try any plan risk-free',
  },
  {
    icon: Shield,
    title: 'Money-Back Guarantee',
    description: '30-day full refund policy',
  },
  {
    icon: Users,
    title: 'No Hidden Fees',
    description: 'Transparent pricing always',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'We\'re here when you need us',
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Particle background */}
      <ParticleFlow
        particleCount={60}
        colors={['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']}
        maxDistance={120}
        speed={0.3}
      />

      {/* Gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

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
                Simple, Transparent Pricing
              </GradientText>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Choose the plan that scales with your agency. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <PricingToggle
              isAnnual={isAnnual}
              onToggle={setIsAnnual}
              discount={20}
            />
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                {...plan}
                isAnnual={isAnnual}
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>

        {/* Guarantees */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {guarantees.map((item, index) => (
              <motion.div
                key={item.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <GradientText gradient="from-blue-400 to-purple-500">
                Compare All Features
              </GradientText>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A detailed breakdown of what's included in each plan
            </p>
          </motion.div>

          <FeatureComparison className="max-w-6xl mx-auto" />
        </section>

        {/* FAQ Teaser */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="max-w-3xl mx-auto text-center glass-card p-12 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Have Questions?
            </h2>
            <p className="text-slate-400 mb-6">
              Our team is here to help you choose the right plan for your agency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/docs"
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Read Documentation
              </motion.a>
              <motion.a
                href="/contact"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Sales
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
