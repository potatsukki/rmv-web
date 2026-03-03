import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPolicyPage() {
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
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">Privacy Policy</h1>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-[#3a3a3e]">
          <p className="text-sm text-[#86868b]">Last updated: March 4, 2026</p>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed">
              RMV Stainless Steel Fabrication (&quot;we&quot;, &quot;our&quot;, or &quot;the Company&quot;) collects the following
              information when you use our project management system:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li><strong>Account information:</strong> Name, email address, phone number, and address provided during registration.</li>
              <li><strong>Authentication data:</strong> Google account information when using Google Sign-In.</li>
              <li><strong>Project data:</strong> Project details, blueprints, measurements, photos, and documents you upload.</li>
              <li><strong>Payment information:</strong> Payment proofs and transaction records. We do not store credit card numbers directly.</li>
              <li><strong>Device information:</strong> Browser type, IP address, and device identifiers for security and session management.</li>
              <li><strong>Usage data:</strong> Login history, audit logs, and interaction patterns to improve our services.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Manage your fabrication projects, appointments, and payment schedules.</li>
              <li>Send notifications about project status, payment reminders, and important updates via email and in-app alerts.</li>
              <li>Generate contracts, receipts, and other project documents.</li>
              <li>Ensure system security through login tracking and audit logging.</li>
              <li>Improve our services and user experience.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">3. Data Storage & Security</h2>
            <p className="text-sm leading-relaxed">
              Your data is stored securely using encrypted databases and cloud storage services. We implement
              industry-standard security measures including:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>HTTPS encryption for all data in transit.</li>
              <li>Secure httpOnly cookies for authentication tokens.</li>
              <li>Role-based access control (RBAC) to limit data access to authorized users.</li>
              <li>Rate limiting and CSRF protection to prevent unauthorized access.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">4. Third-Party Services</h2>
            <p className="text-sm leading-relaxed">We use the following third-party services:</p>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li><strong>Google Firebase:</strong> Authentication (Google Sign-In).</li>
              <li><strong>PayMongo:</strong> Online payment processing.</li>
              <li><strong>Cloudflare R2:</strong> Secure file storage for blueprints and documents.</li>
              <li><strong>SendGrid / Nodemailer:</strong> Email delivery for notifications and reminders.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">5. Your Rights</h2>
            <p className="text-sm leading-relaxed">Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to:</p>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              <li>Access your personal data stored in our system.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Object to processing of your data for purposes beyond service delivery.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">6. Data Retention</h2>
            <p className="text-sm leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services.
              Project records and payment history may be retained for up to 5 years for legal and accounting
              purposes, in compliance with Philippine regulations.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d2d2d7]/50 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">7. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have questions about this privacy policy or wish to exercise your data rights, contact us at:
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
