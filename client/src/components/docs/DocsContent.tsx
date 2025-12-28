import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Clock, Edit, ThumbsUp, ThumbsDown } from 'lucide-react';

interface DocsContentProps {
  slug: string;
  className?: string;
}

// Mock content - in production, this would come from a CMS or markdown files
const docsContent: Record<string, {
  title: string;
  category: string;
  readTime: string;
  lastUpdated: string;
  content: React.ReactNode;
}> = {
  introduction: {
    title: 'Introduction',
    category: 'Getting Started',
    readTime: '5 min read',
    lastUpdated: 'Dec 2024',
    content: (
      <>
        <p className="text-lg text-slate-300 mb-6">
          Welcome to GHL Agency AI – the all-in-one AI automation platform designed specifically for agencies using GoHighLevel.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">What is GHL Agency AI?</h2>
        <p className="text-slate-400 mb-4">
          GHL Agency AI is a powerful automation platform that connects with your GoHighLevel account to automate repetitive tasks, manage client workflows, and scale your agency operations without adding headcount.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Key Features</h2>
        <ul className="list-disc list-inside space-y-2 text-slate-400 mb-6">
          <li><strong className="text-white">AI Workflow Automation</strong> – Create intelligent automations that adapt to your clients' needs</li>
          <li><strong className="text-white">Browser Agents</strong> – Automate web interactions like form fills, data entry, and more</li>
          <li><strong className="text-white">Credential Vault</strong> – Securely store API keys and credentials with AES-256 encryption</li>
          <li><strong className="text-white">GHL Integration</strong> – Deep integration with GoHighLevel sub-accounts</li>
        </ul>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
          <p className="text-blue-400">
            <strong>Pro Tip:</strong> Start with the Quick Start Guide to get your first automation running in under 5 minutes.
          </p>
        </div>
      </>
    ),
  },
  quickstart: {
    title: 'Quick Start Guide',
    category: 'Getting Started',
    readTime: '5 min read',
    lastUpdated: 'Dec 2024',
    content: (
      <>
        <p className="text-lg text-slate-300 mb-6">
          Get up and running with your first AI automation in just a few minutes.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Step 1: Connect Your GHL Account</h2>
        <p className="text-slate-400 mb-4">
          Navigate to Settings → Integrations and click "Connect GoHighLevel". You'll be redirected to authorize the connection.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Step 2: Create Your First Workflow</h2>
        <p className="text-slate-400 mb-4">
          Go to the Workflows section and click "New Workflow". Choose from our library of templates or start from scratch.
        </p>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
          <pre className="text-sm text-slate-300 overflow-x-auto">
{`// Example workflow configuration
{
  "name": "New Lead Notification",
  "trigger": "ghl.contact.created",
  "actions": [
    { "type": "ai.analyze", "prompt": "Qualify this lead..." },
    { "type": "ghl.tag.add", "tag": "Qualified" }
  ]
}`}
          </pre>
        </div>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Step 3: Test & Activate</h2>
        <p className="text-slate-400 mb-4">
          Use the built-in testing tools to verify your workflow works correctly, then activate it to start processing real events.
        </p>
      </>
    ),
  },
  'credential-vault': {
    title: 'Credential Vault',
    category: 'Security',
    readTime: '8 min read',
    lastUpdated: 'Dec 2024',
    content: (
      <>
        <p className="text-lg text-slate-300 mb-6">
          The Credential Vault provides secure, encrypted storage for your API keys, OAuth tokens, and other sensitive credentials.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Security Features</h2>
        <ul className="list-disc list-inside space-y-2 text-slate-400 mb-6">
          <li><strong className="text-white">AES-256-GCM Encryption</strong> – Military-grade encryption at rest</li>
          <li><strong className="text-white">Zero-Knowledge Architecture</strong> – We never see your decrypted credentials</li>
          <li><strong className="text-white">Domain-Based Auto-Fill</strong> – Browser agents can automatically use credentials for matching domains</li>
          <li><strong className="text-white">Audit Logging</strong> – Track every credential access</li>
        </ul>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Adding Credentials</h2>
        <p className="text-slate-400 mb-4">
          Navigate to Settings → Credentials and click "Add Credential". Choose the credential type and enter the required information.
        </p>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <p className="text-amber-400">
            <strong>Security Note:</strong> Always use strong, unique passwords and rotate credentials regularly.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Using Credentials in Workflows</h2>
        <p className="text-slate-400 mb-4">
          Reference credentials in your workflows using the credential name. Browser agents will automatically retrieve and use the appropriate credentials based on the target domain.
        </p>
      </>
    ),
  },
  'browser-agents': {
    title: 'Browser Agents',
    category: 'Core Concepts',
    readTime: '10 min read',
    lastUpdated: 'Dec 2024',
    content: (
      <>
        <p className="text-lg text-slate-300 mb-6">
          Browser agents are AI-powered automation tools that can interact with web pages just like a human would.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">What Can Browser Agents Do?</h2>
        <ul className="list-disc list-inside space-y-2 text-slate-400 mb-6">
          <li>Fill out forms and submit data</li>
          <li>Navigate through multi-step processes</li>
          <li>Extract data from web pages</li>
          <li>Handle login and authentication</li>
          <li>Interact with dynamic content and SPAs</li>
        </ul>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Creating a Browser Agent Task</h2>
        <p className="text-slate-400 mb-4">
          Define what you want the agent to accomplish in natural language. The AI will figure out the best way to complete the task.
        </p>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
          <pre className="text-sm text-slate-300 overflow-x-auto">
{`// Example browser agent task
{
  "task": "Log into client portal and download latest invoice",
  "startUrl": "https://portal.example.com",
  "credentialDomain": "portal.example.com",
  "outputType": "file"
}`}
          </pre>
        </div>
      </>
    ),
  },
};

export const DocsContent: React.FC<DocsContentProps> = ({
  slug,
  className = '',
}) => {
  const doc = docsContent[slug] || docsContent['introduction'];

  return (
    <motion.article
      key={slug}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`max-w-3xl ${className}`}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span>Docs</span>
        <ChevronRight className="w-4 h-4" />
        <span>{doc.category}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-300">{doc.title}</span>
      </div>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {doc.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {doc.readTime}
          </span>
          <span>Last updated: {doc.lastUpdated}</span>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-invert max-w-none">
        {doc.content}
      </div>

      {/* Feedback */}
      <div className="mt-12 pt-8 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <p className="text-slate-400">Was this page helpful?</p>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <ThumbsUp className="w-4 h-4" />
              Yes
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <ThumbsDown className="w-4 h-4" />
              No
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <Edit className="w-4 h-4 text-slate-500" />
          <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
            Edit this page on GitHub
          </a>
        </div>
      </div>
    </motion.article>
  );
};

export default DocsContent;
