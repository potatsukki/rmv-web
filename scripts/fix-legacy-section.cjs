const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'pages', 'LandingPage.tsx');
let source = fs.readFileSync(filePath, 'utf8');

const replacement = `        {/* Built on Trust Section */}
        <section ref={aboutRef} id="about" className="relative overflow-hidden border-t border-[#d4af37]/20 bg-[#040507] py-24 md:py-32 lg:py-36">
          <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-35" />
          <div className="mx-auto max-w-[86rem] px-6 lg:px-8">
            <div className="grid items-center gap-14 md:grid-cols-2 md:gap-16">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="relative mx-auto w-full max-w-[38rem] md:mx-0 md:order-1"
              >
                <div className="relative border border-[#d4af37]/80 bg-[#050608] p-3 md:p-4">
                  <div className="relative overflow-hidden border border-white/10 bg-black">
                    <img
                      src="/image.png"
                      alt="RMV stainless fabrication showcase"
                      className="relative block h-auto w-full object-cover grayscale"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="absolute -left-8 top-8 -z-10 h-[88%] w-[88%] border border-[#d4af37]/45" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="relative md:order-2"
              >
                <p className="label-font mb-8 text-[10px] font-black uppercase tracking-[0.58em] text-[#d4af37]">
                  The Legacy of RMV
                </p>
                <h2 className="headline-font mb-8 text-4xl font-bold leading-[0.98] tracking-[-0.03em] text-white sm:text-5xl lg:text-7xl">
                  Built on Trust, Delivered
                  <br />
                  with <span className="text-[#d4af37]">Precision</span>
                </h2>
                <p className="mb-12 max-w-[54ch] text-lg leading-relaxed text-white/40 md:text-[1.28rem] md:leading-[1.7]">
                  Established in 2018, RMV Fabrication has redefined the standard for heavy-duty manufacturing. Our shop is a nexus where heritage craftsmanship meets cutting-edge automation, ensuring every project-from simple ducting to complex HVAC systems-is a masterpiece of structural integrity.
                </p>

                <ul className="grid gap-x-12 gap-y-8 sm:grid-cols-2 sm:gap-y-10">
                  {[
                    { title: 'Real-time tracking', note: 'Full visibility 24/7' },
                    { title: 'Transparent pricing', note: 'No hidden costs' },
                    { title: 'Quality inspections', note: 'ISO 9001 Standards' },
                    { title: 'Expert master team', note: 'Vetted professionals' },
                  ].map((item) => (
                    <li key={item.title} className="border-l border-[#d4af37]/55 pl-5">
                      <p className="label-font text-[11px] font-black uppercase tracking-[0.28em] text-white">{item.title}</p>
                      <p className="mt-2 text-xs font-medium tracking-wide text-white/35">{item.note}</p>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Streamlined Workflow */}`;

const pattern = /\{\/\* Built on Trust Section \*\/\}[\s\S]*?\{\/\* Streamlined Workflow \*\/\}/;
if (!pattern.test(source)) {
  throw new Error('Could not locate Built on Trust section block.');
}

source = source.replace(pattern, replacement);
fs.writeFileSync(filePath, source);
console.log('Legacy section replaced.');
