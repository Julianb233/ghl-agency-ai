import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead, BreadcrumbSchema, BREADCRUMB_PATHS } from '@/components/seo';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOHead
        title="Terms of Service"
        description="Bottleneck Bot's terms of service outline the rules and guidelines for using our AI-powered automation platform for GoHighLevel agencies."
        keywords={['terms of service', 'terms and conditions', 'user agreement', 'service terms']}
        canonicalUrl="https://bottleneckbot.com/terms"
        type="website"
      />
      <BreadcrumbSchema items={BREADCRUMB_PATHS.terms} />

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
            <FileText className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-black">Terms of Service</h1>
          </div>
          <p className="text-purple-100">Last updated: December 11, 2025</p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        <div className="prose prose-slate max-w-none">

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-slate-600 mb-4">
              By accessing or using Bottleneck Bot's services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Services</h2>
            <p className="text-slate-600 mb-4">
              Bottleneck Bot provides an AI-powered platform for agency automation, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>AI agent management and deployment</li>
              <li>Automated fulfillment workflows</li>
              <li>Browser automation tools</li>
              <li>Campaign management features</li>
              <li>Lead enrichment services</li>
              <li>Integration with third-party platforms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Account Registration</h2>
            <p className="text-slate-600 mb-4">To use our services, you must:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Subscription and Payments</h2>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Pricing</h3>
            <p className="text-slate-600 mb-4">
              Our services are offered on a subscription basis. Current pricing is displayed on our website and may be subject to change with 30 days notice.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">Billing</h3>
            <p className="text-slate-600 mb-4">
              Subscriptions are billed monthly or annually in advance. You authorize us to charge your payment method on a recurring basis.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">Credits</h3>
            <p className="text-slate-600 mb-4">
              Certain features consume credits. Unused credits may roll over to the next billing period, subject to plan limitations. Credits have no cash value and are non-transferable.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">Refunds</h3>
            <p className="text-slate-600 mb-4">
              We offer a 30-day money-back guarantee for new subscriptions. After this period, refunds are provided at our discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Acceptable Use</h2>
            <p className="text-slate-600 mb-4">You agree NOT to use our services to:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Send spam or unsolicited communications</li>
              <li>Distribute malware or harmful code</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with the service's operation</li>
              <li>Scrape or harvest data without permission</li>
              <li>Resell access without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-600 mb-4">
              Bottleneck Bot and its licensors retain all rights to the service, including software, designs, and content. You are granted a limited, non-exclusive license to use the service for your business purposes.
            </p>
            <p className="text-slate-600 mb-4">
              You retain ownership of your data and content. By using our service, you grant us a license to process your data as necessary to provide the services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Data and Privacy</h2>
            <p className="text-slate-600 mb-4">
              Your use of our services is also governed by our Privacy Policy. You are responsible for ensuring your use of our services complies with applicable data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Third-Party Services</h2>
            <p className="text-slate-600 mb-4">
              Our platform integrates with third-party services (e.g., GoHighLevel, social media platforms). Your use of these integrations is subject to the respective third parties' terms and policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Service Availability</h2>
            <p className="text-slate-600 mb-4">
              We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect availability. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-slate-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BOTTLENECK BOT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.
            </p>
            <p className="text-slate-600 mb-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Indemnification</h2>
            <p className="text-slate-600 mb-4">
              You agree to indemnify and hold harmless Bottleneck Bot and its affiliates from any claims, damages, or expenses arising from your use of the services or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Termination</h2>
            <p className="text-slate-600 mb-4">
              We may suspend or terminate your access for violation of these terms. You may cancel your subscription at any time through your account settings. Upon termination, your right to use the services ceases immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Dispute Resolution</h2>
            <p className="text-slate-600 mb-4">
              Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive any right to participate in class actions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Changes to Terms</h2>
            <p className="text-slate-600 mb-4">
              We reserve the right to modify these terms at any time. We will provide notice of material changes. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">15. General Provisions</h2>
            <ul className="list-disc pl-6 text-slate-600 mb-4">
              <li><strong>Governing Law:</strong> These terms are governed by the laws of Delaware, USA.</li>
              <li><strong>Severability:</strong> If any provision is unenforceable, the remaining provisions remain in effect.</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not constitute a waiver.</li>
              <li><strong>Entire Agreement:</strong> These terms constitute the entire agreement between you and Bottleneck Bot.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">16. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              For questions about these Terms of Service, contact us at:
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
