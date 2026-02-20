import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  Wrench,
  Truck,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ChevronRight,
  Star,
  PenTool,
  Layers,
  Calendar,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/shared/BrandLogo';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/20" />
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-gray-900">
                RMV
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                Stainless Steel
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden gap-8 md:flex">
            {['Services', 'Process', 'About', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-900 px-3 py-2"
            >
              Sign In
            </Link>
            <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white font-semibold shadow-sm h-9 px-5 text-[13px]">
              <Link to="/register">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-nav"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            id="landing-mobile-nav"
            className="border-t border-gray-100 bg-white px-4 py-4 md:hidden"
          >
            <nav className="flex flex-col space-y-1">
              {['Services', 'Process', 'About', 'Contact'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  {item}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Button asChild className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-24 sm:py-32 lg:py-40">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/80" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center lg:text-left lg:mx-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 mb-8 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-orange-400" />
              Trusted Stainless Steel Fabricator
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]">
              Precision Engineered{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                  Stainless Steel
                </span>
              </span>{' '}
              Solutions
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-400 max-w-2xl lg:text-xl">
              From custom residential railings to industrial kitchen systems. Master
              craftsmanship meets modern technology for durable, high-quality results.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 lg:justify-start justify-center">
              <Button
                asChild
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 h-12 text-base shadow-xl shadow-orange-500/25 w-full sm:w-auto"
              >
                <Link to="/register">
                  Start Your Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="#services"
                className="text-sm font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1"
              >
                View Our Capabilities
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-10 max-w-lg lg:max-w-xl">
              {[
                { value: '15+', label: 'Years Experience' },
                { value: '500+', label: 'Projects Delivered' },
                { value: '100%', label: 'Quality Guaranteed' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Services Section ─── */}
      <section id="services" className="py-24 bg-white sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Our Expertise
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Fabrication Capabilities
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-500">
              Complete stainless steel fabrication services from design to installation.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: 'Gates & Railings',
                  desc: 'Custom-designed gates and railings combining security with architectural elegance for homes and commercial spaces.',
                  features: ['Residential', 'Commercial', 'Custom Designs'],
                },
                {
                  icon: Layers,
                  title: 'Industrial Kitchens',
                  desc: 'Food-grade stainless steel fabrication for restaurants, hotels, and processing plants. Built for durability.',
                  features: ['Food Grade', 'Hygienic', 'Compliant'],
                },
                {
                  icon: PenTool,
                  title: 'Custom Fabrication',
                  desc: 'Bespoke machinery parts, tanks, and structural components built to precise engineering specifications.',
                  features: ['CNC Cutting', 'Welding', 'Polishing'],
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="group relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-orange-100 hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                    <service.icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {service.desc}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {service.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600 ring-1 ring-inset ring-gray-200"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Process Section ─── */}
      <section id="process" className="bg-gray-50 py-24 sm:py-32 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-gray-300 mb-4">
              <Wrench className="h-3.5 w-3.5" />
              How It Works
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Streamlined Workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-500">
              From initial consultation to final delivery — complete transparency at
              every step.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                name: 'Consultation',
                icon: Calendar,
                desc: 'Book online. We visit for measurements or meet to discuss your vision.',
              },
              {
                step: '02',
                name: 'Design & Costing',
                icon: FileText,
                desc: 'Receive CAD blueprints and transparent cost breakdowns for approval.',
              },
              {
                step: '03',
                name: 'Fabrication',
                icon: Wrench,
                desc: 'Watch your project come to life with real-time progress updates.',
              },
              {
                step: '04',
                name: 'Delivery',
                icon: Truck,
                desc: 'Professional installation with final quality check and handover.',
              },
            ].map((item, idx) => (
              <div
                key={item.name}
                className="relative group"
              >
                {/* Connector line */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+32px)] right-[-32px] h-px bg-gray-200 z-0" />
                )}

                <div className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white text-sm font-bold group-hover:bg-orange-500 transition-colors">
                      {item.step}
                    </div>
                    <item.icon className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section id="about" className="py-24 bg-white sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600 mb-4">
                <Shield className="h-3.5 w-3.5" />
                Why RMV
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Built on Trust, Delivered with Precision
              </h2>
              <p className="mt-4 text-lg text-gray-500 leading-relaxed">
                Over 15 years of experience in stainless steel fabrication. We combine
                traditional craftsmanship with cutting-edge technology.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Real-time project tracking through your online portal',
                  'Transparent pricing with detailed cost breakdowns',
                  'Quality-assured with rigorous inspection protocols',
                  'Professional installation by certified technicians',
                  'On-time delivery with milestone-based updates',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 p-8 sm:p-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <span className="text-white font-bold text-lg">RMV Portal</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Project Status', value: 'Fabrication', color: 'bg-orange-500' },
                    { label: 'Completion', value: '78%', color: 'bg-emerald-500' },
                    { label: 'Next Milestone', value: 'Quality Check', color: 'bg-blue-500' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                    >
                      <span className="text-sm text-gray-400 font-medium">{row.label}</span>
                      <span className={`text-sm font-bold text-white px-3 py-1 rounded-full ${row.color}/20`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Track every detail from your dashboard
                </p>
              </div>
              {/* Decorative blurs */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative overflow-hidden bg-gray-950 py-24 sm:py-32">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl max-w-2xl mx-auto">
            Ready to build something{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              extraordinary
            </span>
            ?
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
            Create a free account to schedule your consultation. Let&apos;s bring your
            vision to life.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 h-12 text-base shadow-xl shadow-orange-500/25"
            >
              <Link to="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Already have an account? <span className="text-orange-400">Sign in →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="bg-gray-950 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <BrandLogo className="h-8 w-8 ring-2 ring-orange-500/30 shadow-sm" />
                <span className="text-base font-bold text-white">RMV Stainless</span>
              </div>
              <p className="text-sm leading-6 text-gray-500">
                Precision stainless steel fabrication for residential and commercial
                industries.
              </p>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                Services
              </h3>
              <ul className="space-y-3">
                {['Gates & Railings', 'Structural Steel', 'Kitchen Equipment', 'CNC Cutting'].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#services"
                        className="text-sm text-gray-500 hover:text-white transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                {['About Us', 'Projects', 'Careers', 'Privacy Policy'].map((item) => (
                  <li key={item}>
                    <a
                      href="#about"
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                Contact
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span>123 Industrial Ave, Fabric City</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Phone className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span>(555) 123-4567</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Mail className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span>info@rmvstainless.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} RMV Stainless Steel Fabrication. All
              rights reserved.
            </p>
            <p className="text-xs text-gray-700">Engineered with precision.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
