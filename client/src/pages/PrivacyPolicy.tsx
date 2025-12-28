import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead, BreadcrumbSchema, BREADCRUMB_PATHS } from '@/components/seo';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOHead
        title="Privacy Policy"
        description="Bottleneck Bot's privacy policy explains how we collect, use, and protect your personal information. GDPR and CCPA compliant data handling practices."
        keywords={['privacy policy', 'data protection', 'GDPR', 'CCPA', 'personal data']}
        canonicalUrl="https://bottleneckbot.com/privacy"
        type="website"
      />
      <BreadcrumbSchema items={BREADCRUMB_PATHS.privacy} />

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-black">Privacy Policy</h1>
          </div>
          <p className="text-purple-100">Last updated: December 11, 2025</p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        <div className="prose prose-slate max-w-none">

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 mb-4">
              Bottleneck Bot ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Personal Information</h3>
            <p className="text-slate-600 mb-4">We may collect personal information that you voluntarily provide, including:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>Name and email address</li>
              <li>Company/agency name</li>
              <li>Phone number</li>
              <li>Billing information</li>
              <li>Account credentials</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">Automatically Collected Information</h3>
            <p className="text-slate-600 mb-4">When you visit our site, we automatically collect:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent</li>
              <li>Referring website</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Respond to inquiries and provide support</li>
              <li>Analyze usage to improve our services</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Cookies and Tracking</h2>
            <p className="text-slate-600 mb-4">
              We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
            </p>
            <p className="text-slate-600 mb-4">We use:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li><strong>Essential Cookies:</strong> Required for the website to function</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site (Google Analytics)</li>
              <li><strong>Marketing Cookies:</strong> Used for advertising purposes (Meta Pixel)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-slate-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li><strong>Service Providers:</strong> Third parties who help us operate our business</li>
              <li><strong>Business Partners:</strong> With your consent for joint offerings</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
            </ul>
            <p className="text-slate-600">We do not sell your personal information to third parties.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Data Security</h2>
            <p className="text-slate-600 mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>256-bit SSL encryption</li>
              <li>Secure data centers</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Your Rights (GDPR/CCPA)</h2>
            <p className="text-slate-600 mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data ("right to be forgotten")</li>
              <li>Restrict processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="text-slate-600">To exercise these rights, contact us at support@bottleneckbot.com</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Data Retention</h2>
            <p className="text-slate-600 mb-4">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Children's Privacy</h2>
            <p className="text-slate-600 mb-4">
              Our services are not intended for individuals under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700">
                <strong>Bottleneck Bot</strong><br />
                Email: support@bottleneckbot.com<br />
                Website: https://www.bottleneckbot.com
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 py-8 text-center text-sm text-slate-600">
        <p>&copy; 2025 Bottleneck Bot. All rights reserved.</p>
      </footer>
    </div>
  );
};
