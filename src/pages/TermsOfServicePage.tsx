import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function TermsOfServicePage() {
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
              Status: Binding
            </p>
            <h1 className="headline-font mb-4 text-5xl font-bold tracking-tight text-white lg:text-6xl">
              Terms of <span className="text-shimmer italic font-light">Service</span>
            </h1>
            <p className="label-font text-[10px] uppercase tracking-widest text-[#919097]">
              Effective Date: March 4, 2026
            </p>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                id: '01',
                title: 'Provision of Service',
                content: (
                  <p className="text-sm leading-relaxed text-[#919097]">
                    The Service is a digital platform for the management of high-precision stainless steel fabrication. 
                    Users are granted access to project tracking, blueprint oversight, and payment orchestration 
                    contingent upon strict adherence to these terms.
                  </p>
                )
              },
              {
                id: '02',
                title: 'User Responsibilities',
                content: (
                  <ul className="space-y-4">
                    {[
                      { label: 'Integrity', text: 'Users must provide structurally accurate data all stages.' },
                      { label: 'Security', text: 'Responsibility for account credentials lies solely with the user.' },
                      { label: 'Compliance', text: 'Adherence to all technical and safety standards is mandatory.' }
                    ].map((item) => (
                      <li key={item.label} className="border border-white/5 bg-white/[0.02] p-4 flex gap-6 items-center">
                        <span className="label-font text-[9px] font-bold text-[#FFD700] uppercase tracking-widest">{item.label}</span>
                        <span className="text-xs text-[#919097]">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                )
              },
              {
                id: '03',
                title: 'Payments & Obligations',
                content: (
                  <p className="text-sm leading-relaxed text-[#919097]">
                    Project stages are unlocked via milestone-based payments. Delays in scheduled payments 
                    may result in the suspension of fabrication workflows. All online transactions are 
                    facilitated through certified third-party processors.
                  </p>
                )
              },
              {
                id: '04',
                title: 'Intellectual Governance',
                content: (
                  <div className="border-l border-[#FFD700]/30 pl-6 py-2">
                    <p className="text-sm leading-relaxed text-[#919097]">
                      Interfaces and generated technical documents are proprietor to RMV. Customer-uploaded 
                      designs are utilized solely for the purpose of engineering execution and physical fabrication.
                    </p>
                  </div>
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
            <FileText className="h-6 w-6 text-[#FFD700]/40 mx-auto mb-6" />
            <p className="label-font text-[10px] uppercase tracking-[0.4em] text-[#919097]">
              Structural Integrity in Every Transaction
            </p>
          </motion.footer>
        </div>
      </main>
    </div>
  );
}
