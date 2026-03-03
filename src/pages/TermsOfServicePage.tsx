import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#d2d2d7]/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1f]">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">Terms of Service</h1>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-[#3a3a3e]">
          <p className="text-sm text-[#86868b]">Last updated: March 4, 2026</p>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing and using the RMV Stainless Steel Fabrication project management system
              (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree
              to these terms, please do not use the Service.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">2. Description of Service</h2>
            <p className="text-sm leading-relaxed">
              The Service is an online project management platform designed for stainless steel fabrication
              projects. It provides tools for:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Project creation, tracking, and management.</li>
              <li>Blueprint submission, review, and revision workflows.</li>
              <li>Appointment scheduling for on-site visits.</li>
              <li>Payment plan management and online payments.</li>
              <li>Visit reports and fabrication progress tracking.</li>
              <li>Document generation (contracts, receipts).</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">3. User Accounts</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>You must provide accurate and complete information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must not share your account with others or allow unauthorized access.</li>
              <li>You must enable two-factor authentication (2FA) when required by system administrators.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">4. Payments & Refunds</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Payment plans are generated based on your approved project specifications.</li>
              <li>Stage-based payments must follow the payment schedule established in your contract.</li>
              <li>Online payments are processed securely through PayMongo. Payment proofs are subject to admin verification.</li>
              <li>Cash payments must be made in person and are verified by the assigned cashier.</li>
              <li>Refund policies are handled on a case-by-case basis. Contact administration for disputes.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">5. Blueprint & Project Workflows</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Blueprints submitted for review may be approved, revised, or rejected by administrators.</li>
              <li>Once a blueprint is accepted, the associated payment plan is generated and the project moves forward.</li>
              <li>Project status transitions follow a defined state machine. Unauthorized attempts to alter status will be denied.</li>
              <li>All changes to project data are audited and logged for accountability.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">6. Intellectual Property</h2>
            <p className="text-sm leading-relaxed">
              All content, designs, and materials provided through the Service — including system interfaces,
              logos, and generated documents — are the property of RMV Stainless Steel Fabrication.
              Blueprint designs uploaded by customers remain the property of the customer but grant us a
              license to use them for project fulfillment purposes.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">7. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind, either express or implied.
              RMV Stainless Steel Fabrication shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service. Our total liability shall not
              exceed the amount paid by you for the specific project in question.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">8. Prohibited Conduct</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Attempting to bypass authentication, authorization, or security mechanisms.</li>
              <li>Uploading malicious files, scripts, or content.</li>
              <li>Interfering with the operation or availability of the Service.</li>
              <li>Using the Service for any fraudulent or unlawful purpose.</li>
              <li>Scraping, crawling, or automated extraction of data from the Service.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">9. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of
              the Philippines. Any disputes arising from these terms shall be subject to the exclusive
              jurisdiction of the courts of the Philippines.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">10. Changes to Terms</h2>
            <p className="text-sm leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be effective upon posting
              to this page with an updated date. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">11. Contact</h2>
            <p className="text-sm leading-relaxed">
              For questions about these Terms of Service, contact us at:
            </p>
            <p className="text-sm font-medium">
              RMV Stainless Steel Fabrication<br />
              Email: rmvstainless@gmail.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
