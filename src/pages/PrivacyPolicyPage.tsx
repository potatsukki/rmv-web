import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PrivacyPolicyPage() {
  return (
    <div className="landing-atelier min-h-screen bg-[#0a0a0b] text-white/90 selection:bg-[#FFD700]/30 selection:text-white">
      <PublicNavbar />

      <main className="relative pt-32 pb-40 lg:pt-48">
        <div className="blueprint-grid absolute inset-0 pointer-events-none opacity-20" />
        
        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: SMOOTH_240 }}
            className="mb-20 text-center"
          >
            <p className="label-font mb-6 text-[10px] font-black uppercase tracking-[0.5em] text-[#FFD700] gold-glow">
              Status: Validated
            </p>
            <h1 className="headline-font mb-4 text-5xl font-bold tracking-tight text-white lg:text-6xl">
              Privacy <span className="text-shimmer italic font-light">Policy</span>
            </h1>
            <p className="label-font text-[10px] uppercase tracking-widest text-[#919097]">
              Effective Date: March 4, 2026
            </p>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                id: '01',
                title: 'Information We Collect',
                content: (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-[#919097]">
                      RMV Stainless Steel Fabrication collects critical data required for the engineering and management of your projects:
                    </p>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {[
                        { label: 'Account', detail: 'Name, email, phone provided during signup.' },
                        { label: 'Auth', detail: 'Google account metadata via OAuth.' },
                        { label: 'Projects', detail: 'CAD drawings, blueprints, and materials.' },
                        { label: 'Payments', detail: 'Proof of transactions via PayMongo.' },
                      ].map((item) => (
                        <li key={item.label} className="border border-white/5 bg-white/[0.02] p-4">
                          <span className="block label-font text-[9px] font-bold uppercase tracking-widest text-[#FFD700] mb-1">{item.label}</span>
                          <span className="text-xs text-[#919097]">{item.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              },
              {
                id: '02',
                title: 'Data Utilization',
                content: (
                  <ul className="space-y-3">
                    {[
                      'Workflow orchestration and project status tracking.',
                      'Automated billing and payment schedule verification.',
                      'Digital signature and contract generation.',
                      'Technical support and system security auditing.'
                    ].map((text) => (
                      <li key={text} className="flex gap-4 text-sm text-[#919097]">
                        <span className="text-[#FFD700] font-bold">/</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                )
              },
              {
                id: '03',
                title: 'Security Architecture',
                content: (
                  <div className="border-l border-[#FFD700]/30 pl-6 py-2">
                    <p className="text-sm leading-relaxed text-[#919097]">
                      Our systems implement enterprise-grade security including HTTPS encryption for all data in transit, 
                      stateless JWT authentication with httpOnly persistence, and role-based access controls for internal data security.
                    </p>
                  </div>
                )
              },
              {
                id: '04',
                title: 'Google User Data Policy',
                content: (
                  <p className="text-sm leading-relaxed text-[#919097]">
                    RMV complies with Google API Services User Data Policy. We access only basic profile metadata (name, email) 
                    solely for identity verification. We do not transfer or sell Google user data to third parties.
                  </p>
                )
              }
            ].map((section) => (
              <motion.section 
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: SMOOTH_240 }}
                className="group relative"
              >
                <div className="flex items-start gap-8">
                  <span className="label-font text-[10px] font-bold text-[#FFD700]/40 mt-1">{section.id}</span>
                  <div className="flex-1 space-y-6">
                    <h2 className="label-font text-xs font-black uppercase tracking-[0.3em] text-white group-hover:text-[#FFD700] transition-colors">
                      {section.title}
                    </h2>
                    {section.content}
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          <motion.footer 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-32 pt-12 border-t border-white/5 text-center"
          >
            <Shield className="h-6 w-6 text-[#FFD700]/40 mx-auto mb-6" />
            <p className="label-font text-[10px] uppercase tracking-[0.4em] text-[#919097]">
              Certified RMV Legal Framework
            </p>
          </motion.footer>
        </div>
      </main>
    </div>
  );
}
