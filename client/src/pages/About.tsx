import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Target, Users, Zap, Shield, Heart, Rocket, Award } from 'lucide-react';
import { Link } from 'wouter';
import { TeamMember, ValuesGrid, MissionSection } from '../components/about';
import { ParticleFlow } from '../components/effects/ParticleFlow';
import { GradientText } from '../components/effects/GradientText';
import { CountUp } from '../components/effects/CountUp';

const teamMembers = [
  {
    name: 'Alex Chen',
    role: 'Founder & CEO',
    bio: 'Former agency owner who built automation solutions to scale his own business. Now helping other agencies do the same.',
    image: '',
    gradient: 'from-blue-500 to-cyan-500',
    socials: [
      { type: 'linkedin' as const, url: 'https://linkedin.com' },
      { type: 'twitter' as const, url: 'https://twitter.com' },
    ],
  },
  {
    name: 'Sarah Mitchell',
    role: 'CTO',
    bio: 'AI/ML expert with 10+ years building automation systems at scale. Previously led engineering at a Fortune 500 company.',
    image: '',
    gradient: 'from-purple-500 to-pink-500',
    socials: [
      { type: 'linkedin' as const, url: 'https://linkedin.com' },
      { type: 'github' as const, url: 'https://github.com' },
    ],
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Head of Product',
    bio: 'Product leader obsessed with user experience. Built products used by millions at leading SaaS companies.',
    image: '',
    gradient: 'from-emerald-500 to-teal-500',
    socials: [
      { type: 'linkedin' as const, url: 'https://linkedin.com' },
      { type: 'twitter' as const, url: 'https://twitter.com' },
    ],
  },
  {
    name: 'Emily Watson',
    role: 'Head of Customer Success',
    bio: 'Dedicated to making every customer successful. Previously built CS teams at high-growth startups.',
    image: '',
    gradient: 'from-amber-500 to-orange-500',
    socials: [
      { type: 'linkedin' as const, url: 'https://linkedin.com' },
      { type: 'email' as const, url: 'mailto:emily@example.com' },
    ],
  },
];

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation First',
    description: 'We push boundaries and embrace new technologies to deliver cutting-edge solutions.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Target,
    title: 'Customer Obsessed',
    description: 'Every feature we build is driven by real customer needs and feedback.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Security Always',
    description: 'Enterprise-grade security is built into everything we do, not bolted on.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Heart,
    title: 'Human Connection',
    description: 'AI enhances human capabilities, it doesn\'t replace the human touch.',
    gradient: 'from-pink-500 to-rose-500',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'Agencies Served' },
  { value: 10, suffix: 'M+', label: 'Automations Run' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
  { value: 4.9, suffix: '/5', label: 'Customer Rating' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Particle background */}
      <ParticleFlow
        particleCount={40}
        colors={['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']}
        maxDistance={100}
        speed={0.2}
      />

      {/* Gradient orbs */}
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

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
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Rocket className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">Building the future of agency automation</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <GradientText
                gradient="from-blue-400 via-purple-500 to-pink-500"
                animated
              >
                We're on a Mission
              </GradientText>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              To empower every agency with AI-powered automation that scales their business and frees them to do what they do best.
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-6 rounded-xl bg-slate-800/30 border border-slate-700/30"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <CountUp
                    end={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.value % 1 !== 0 ? 1 : 0}
                    delay={index * 0.1}
                  />
                </div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="container mx-auto px-6 py-16">
          <MissionSection
            mission="We build AI-powered automation tools that help agencies scale without limits. By handling repetitive tasks, managing client workflows, and providing intelligent insights, we give agency owners their time back while improving results."
            vision="A world where every agency, regardless of size, has access to enterprise-level automation. Where human creativity is amplified by AI, not replaced by it. Where scaling a business doesn't mean sacrificing quality or work-life balance."
            className="max-w-5xl mx-auto"
          />
        </section>

        {/* Values */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <GradientText gradient="from-blue-400 to-purple-500">
                Our Core Values
              </GradientText>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              The principles that guide everything we build and every decision we make
            </p>
          </motion.div>

          <ValuesGrid values={values} className="max-w-5xl mx-auto" />
        </section>

        {/* Team */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <GradientText gradient="from-purple-400 to-pink-500">
                Meet the Team
              </GradientText>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A diverse group of builders, dreamers, and problem solvers
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <TeamMember
                key={member.name}
                {...member}
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            className="max-w-3xl mx-auto text-center glass-card p-12 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Join Our Growing Team
            </h2>
            <p className="text-slate-400 mb-8">
              We're always looking for talented people who share our passion for building great products.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/careers"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Open Positions
              </motion.a>
              <motion.a
                href="/contact"
                className="px-8 py-4 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Us
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
