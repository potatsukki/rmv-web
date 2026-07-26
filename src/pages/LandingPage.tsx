import { Link, useNavigate } from 'react-router-dom';
import { motion, LazyMotion, domAnimation } from 'framer-motion';
import { Award, CheckCircle2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { useAuthStore } from '@/stores/auth.store';
import { SERVICE_CATALOG } from '@/lib/service-catalog';
import { useLandingPageContent } from '@/hooks/useLandingPage';

const DEFAULT_HERO = {
  title: 'Built for commercial fabrication teams that demand results.',
  subtitle: 'RMV Fabrication is the trusted partner for stainless steel, HVAC, and custom industrial builds across Metro Manila.',
  description:
    'Our team combines structural engineering, certified installation, and fabrication excellence so you can ship projects on time, on budget, and without rework.',
  ctaLabel: 'Book a Consultation',
  ctaUrl: '/appointments/book',
  secondaryLabel: 'Explore Services',
  secondaryUrl: '#services',
  imageUrl: '/landing/completed-works/cover.png',
};

const DEFAULT_STATS = [
  { label: 'Projects Delivered', value: '320+' },
  { label: 'Client Satisfaction', value: '98%' },
  { label: 'Average Lead Time', value: '12 days' },
  { label: 'Safety Inspections', value: '100%' },
];

const DEFAULT_TESTIMONIALS = [
  {
    author: 'Miguel Santos',
    role: 'Operations Manager, Urban Eats',
    quote:
      'RMV delivered our commercial kitchen on a tight schedule without compromising quality. Their team handled design changes instantly and kept the site clean every day.',
  },
  {
    author: 'Claire Mendoza',
    role: 'Founder, Bamboo Street Food',
    quote:
      'From framing to final installation, RMV made the entire process feel effortless. Their workmanship is precise, and the final result looks premium.',
  },
];

const FEATURED_PROJECTS = SERVICE_CATALOG.flatMap((service) =>
  service.projects.map((project) => ({
    ...project,
    serviceLabel: service.label,
  })),
).slice(0, 6);

export function LandingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const bookingTarget = user ? '/appointments/book' : '/login';
  const { data: landingConfig } = useLandingPageContent();

  const hero = { ...DEFAULT_HERO, ...(landingConfig?.hero ?? {}) };
  const serviceCards = landingConfig?.services ?? SERVICE_CATALOG.slice(0, 4).map((service) => ({
    id: service.id,
    label: service.label,
    description: service.shortDescription,
  }));
  const featuredProjects = landingConfig?.projects ?? FEATURED_PROJECTS;
  const stats = landingConfig?.stats ?? DEFAULT_STATS;
  const testimonials = landingConfig?.testimonials ?? DEFAULT_TESTIMONIALS;

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#050608] text-white selection:bg-white/20 selection:text-white">
        <PublicNavbar />

        <main className="pt-16">
          <section id="hero" className="relative overflow-hidden border-b border-white/10 bg-[#07090b] pb-24 pt-28 sm:pt-32 lg:pb-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-2xl"
                >
                  <span className="mb-6 inline-flex rounded-full border border-[#FFD700]/15 bg-[#FFD700]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FFD700]">
                    Precision fabrication for restaurants, retail, and industrial buildouts
                  </span>
                  <h1 className="headline-font mb-6 text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                    {hero.title}
                  </h1>
                  <p className="mb-8 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                    {hero.subtitle}
                  </p>
                  <p className="mb-10 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                    {hero.description}
                  </p>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Button onClick={() => navigate(bookingTarget)} className="rounded-full px-8 py-3 text-sm font-semibold tracking-[0.08em] shadow-[0_18px_50px_rgba(255,215,0,0.16)]" variant="prominent">
                      {hero.ctaLabel}
                    </Button>
                    <Button asChild variant="secondary" className="rounded-full px-8 py-3 text-sm font-semibold tracking-[0.08em]">
                      <a href={hero.secondaryUrl}>{hero.secondaryLabel}</a>
                    </Button>
                  </div>

                  <div className="mt-12 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/60">
                        <Sparkles className="mr-2 h-4 w-4" /> Trusted delivery
                      </div>
                      <p className="text-sm leading-7 text-white/70">
                        Durable fabrication standards, strict quality checks, and clear approvals across every phase.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/60">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Code-compliant systems
                      </div>
                      <p className="text-sm leading-7 text-white/70">
                        Certified gasline, fire suppression, and sanctioned HVAC installations for commercial environments.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mx-auto w-full max-w-xl"
                >
                  <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121619] shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
                    <img
                      src={hero.imageUrl ?? DEFAULT_HERO.imageUrl}
                      alt="Featured RMV fabrication project"
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050608] to-transparent" />
                </motion.div>
              </div>
            </div>
          </section>

          <section id="about" className="border-b border-white/10 bg-[#060809] py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20">
                <div>
                  <p className="label-font mb-4 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">
                    We are RMV
                  </p>
                  <h2 className="headline-font mb-6 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                    A lean fabrication studio for demanding builds and tight schedules.
                  </h2>
                  <p className="max-w-xl text-base leading-8 text-white/70">
                    We work with restaurateurs, contractors, and developers to bring stainless steel, kitchen, and industrial projects to life with precision engineering and turnkey installation.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: 'Design to install', detail: 'Full-service fabrication and fit-out.' },
                    { title: 'Custom engineering', detail: 'Tailored solutions for every space.' },
                    { title: 'Quality assurance', detail: 'Inspection-ready builds on every delivery.' },
                    { title: 'Reliable schedules', detail: 'Milestone planning with on-time handoff.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/50">{item.title}</p>
                      <p className="text-sm leading-7 text-white/70">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="border-b border-white/10 bg-black/80 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-12 max-w-2xl">
                <p className="label-font mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Our Services</p>
                <h2 className="headline-font text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                  Core fabrication services designed for hospitality, retail, and industrial operations.
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {serviceCards.map((service) => (
                  <motion.article
                    key={service.id}
                    whileHover={{ y: -5 }}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 transition-all duration-300"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FFD700]/10 text-[#FFD700]">
                      <Award className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-white">{service.label}</h3>
                    <p className="mb-8 text-sm leading-7 text-white/60">{service.description}</p>
                    <Button
                      asChild
                      variant="ghost"
                      className="!px-0 !py-0 text-sm font-semibold uppercase tracking-[0.24em] text-white/80 transition-colors hover:text-[#FFD700]"
                    >
                      <Link to={`/services/${service.id}`}>View details</Link>
                    </Button>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <section id="projects" className="border-b border-white/10 bg-[#07090b] py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="label-font mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Featured Projects</p>
                  <h2 className="headline-font text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                    Recent gallery highlights from completed RMV installations.
                  </h2>
                </div>
                <Button asChild variant="secondary" className="h-11 rounded-full px-7 text-sm font-semibold uppercase tracking-[0.18em]">
                  <Link to={bookingTarget}>Book a site assessment</Link>
                </Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {featuredProjects.map((project) => (
                  <article key={`${project.title}-${project.location}`} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1">
                    <div className="relative overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">{project.serviceLabel}</p>
                      </div>
                    </div>
                    <div className="space-y-3 p-6">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/50">
                        <CheckCircle2 className="h-4 w-4 text-[#FFD700]" />
                        <span>{project.location}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                      <p className="text-sm leading-7 text-white/60">{project.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="border-b border-white/10 bg-black/80 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
                <div>
                  <p className="label-font mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Why RMV</p>
                  <h2 className="headline-font mb-6 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                    Trusted fabrication with production-grade accountability.
                  </h2>
                  <p className="max-w-xl text-base leading-8 text-white/70">
                    We combine streamlined execution, code-aware installation, and responsive project communication so your teams can move from estimate to turnover with confidence.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { icon: Award, title: 'Local manufacturing', description: 'In-house welding, bending, and finishing for faster timelines.' },
                    { icon: ShieldCheck, title: 'Safety-first systems', description: 'All gasline and suppression work follows regulatory compliance.' },
                    { icon: Sparkles, title: 'Finish quality', description: 'Polished aesthetics and durable stainless fit your brand standards.' },
                    { icon: Users, title: 'Responsiveness', description: 'Dedicated coordination and hands-on supervision from start to handoff.' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-3xl bg-[#FFD700]/10 text-[#FFD700]">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="mb-3 text-xl font-semibold text-white">{item.title}</h3>
                        <p className="text-sm leading-7 text-white/65">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-white/10 bg-[#07090b] py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-12 max-w-2xl">
                <p className="label-font mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Performance</p>
                <h2 className="headline-font text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                  Numbers that matter at every stage of the build.
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                    <p className="text-4xl font-black tracking-tight text-white">{stat.value}</p>
                    <p className="mt-4 text-sm leading-7 text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-black py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 xl:grid-cols-[0.95fr_1.05fr] xl:items-center xl:gap-20">
                <div>
                  <p className="label-font mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Client Feedback</p>
                  <h2 className="headline-font text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                    Leaders and operators trust RMV for repeat fabrication scope.
                  </h2>
                </div>
                <div className="space-y-6">
                  {testimonials.map((item) => (
                    <div key={item.author} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.2)]">
                      <p className="mb-6 text-lg leading-8 text-white/80">“{item.quote}”</p>
                      <div>
                        <p className="font-semibold text-white">{item.author}</p>
                        <p className="text-sm leading-6 text-white/60">{item.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="border-t border-white/10 bg-[#050608] py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
                <div>
                  <p className="label-font mb-4 text-[11px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Start Your Project</p>
                  <h2 className="headline-font max-w-xl text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                    Let’s plan your next fabrication scope with a fast, accurate quote.
                  </h2>
                  <p className="mt-6 max-w-xl text-base leading-8 text-white/70">
                    Book a consultation to share drawings, walk through the site, and get a dependable schedule from the first estimate.
                  </p>
                </div>
                <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_80px_rgba(0,0,0,0.2)]">
                  <p className="text-sm uppercase tracking-[0.28em] text-white/50">Ready for a precise handoff?</p>
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold text-white">Book appointment</p>
                    <p className="text-sm leading-6 text-white/60">No account? Sign in to request an on-site assessment and project proposal.</p>
                  </div>
                  <Button onClick={() => navigate(bookingTarget)} className="w-full rounded-full px-8 py-4 text-sm font-semibold tracking-[0.1em]" variant="prominent">
                    {user ? 'Schedule an assessment' : 'Sign in to book'}
                  </Button>
                  <div className="grid gap-3 text-sm text-white/60 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="font-semibold text-white">Location</p>
                      <p className="text-white/70">Metro Manila fabrication hub</p>
                    </div>
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="font-semibold text-white">Support</p>
                      <p className="text-white/70">operations@rmvfabrication.app</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </LazyMotion>
  );
}
