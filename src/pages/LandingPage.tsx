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
  ArrowUpRight,
  Flame,
  Wind,
  Quote,
  Building2,
  UtensilsCrossed,
  ShoppingBag,
  Hotel,
  Coffee,
  Warehouse,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { LayoutDashboard } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, useScroll, useTransform, LazyMotion, domAnimation } from 'framer-motion';
import { 
  FadeIn, 
  SlideUp, 
  SlideInLeft, 
  SlideInRight, 
  StaggerContainer, 
  staggerItem,
  ScaleIn
} from '@/components/shared/MotionWrappers';

export function LandingPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  
  // Parallax effects — all useTransform at top level
  const heroTextY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const bgParallaxY = useTransform(scrollY, [0, 1000], [0, 300]);

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

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(v => !v), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-orange-500/30">
      {/* ─── Navigation ─── */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
        style={{ willChange: 'transform' }}
        className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100/50"
      >
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 90 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{ willChange: 'transform' }}
            >
              <BrandLogo className="h-10 w-10 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/20" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">
                RMV
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                Stainless
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden gap-10 md:flex">
            {['Services', 'Process', 'About', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 hover:scale-105 transform duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {isLoggedIn ? (
              <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white font-semibold shadow-xl shadow-gray-900/10 h-10 px-6 text-sm rounded-full transition-all hover:scale-105 hover:shadow-2xl">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white font-semibold shadow-xl shadow-gray-900/10 h-10 px-6 text-sm rounded-full transition-all hover:scale-105 hover:shadow-2xl">
                  <Link to="/register">
                    Get Started
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 bg-white px-4 py-6 md:hidden shadow-2xl"
          >
            <nav className="flex flex-col space-y-2">
              {['Services', 'Process', 'About', 'Contact'].map((item, idx) => (
                <motion.a
                  key={item}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
                  href={`#${item.toLowerCase()}`}
                  onClick={closeMobileMenu}
                  className="px-4 py-3 rounded-xl text-lg font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                >
                  {item}
                </motion.a>
              ))}
              <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
                {isLoggedIn ? (
                  <Button asChild className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-12 rounded-xl text-lg">
                    <Link to="/dashboard" onClick={closeMobileMenu}>
                      <LayoutDashboard className="mr-2 h-5 w-5" />
                      Go to Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className="block px-4 py-3 rounded-xl text-lg font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Sign In
                    </Link>
                    <Button asChild className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl text-lg">
                      <Link to="/register" onClick={closeMobileMenu}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </motion.header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gray-950 flex items-center">
        {/* Background Parallax */}
        <motion.div 
          style={{ y: bgParallaxY, willChange: 'transform' }}
          className="absolute inset-0 z-0 gpu-layer"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/50 to-transparent" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-8 sm:py-12 lg:py-16">
          <motion.div 
            style={{ y: heroTextY, opacity: heroOpacity, willChange: 'transform, opacity' }}
            className="mx-auto max-w-4xl lg:mx-0"
          >
            {/* Animated Badge */}
            <FadeIn delay={0.2} className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-orange-400 mb-3 sm:mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Star className="h-3.5 w-3.5 fill-orange-400 animate-pulse" />
              <span>Trusted Stainless Steel Fabricator</span>
            </FadeIn>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl leading-[1.05] mb-2 sm:mb-4">
              <SlideInLeft delay={0.3} duration={0.8}>Precision.</SlideInLeft>
              <SlideInLeft delay={0.4} duration={0.8}>Durability.</SlideInLeft>
              <SlideInLeft delay={0.5} duration={0.8} className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent pb-2">
                Excellence.
              </SlideInLeft>
            </h1>

            <SlideUp delay={0.7} className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg leading-relaxed text-gray-400 max-w-2xl border-l-2 border-orange-500/50 pl-4 sm:pl-6">
              Transforming Kitchens, Exceeding Expectations – Your Vision, Our Expertise.
              From kitchen stainless steel fabrication to LPG gas pipelines and fire suppression systems.
            </SlideUp>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
              style={{ willChange: 'transform, opacity' }}
              className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5 lg:justify-start justify-center"
            >
              <Button
                asChild
                size="lg"
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-11 sm:h-12 px-6 sm:px-10 text-sm sm:text-base shadow-[0_0_30px_rgba(249,115,22,0.3)] w-full sm:w-auto rounded-full hover:scale-105 transition-all duration-300 ring-2 ring-orange-500 ring-offset-2 ring-offset-gray-950"
              >
                <Link to="/register">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <a
                href="#services"
                className="group flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base font-medium text-white hover:text-orange-400 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-all border border-white/10 group-hover:scale-110">
                   <ChevronRight className="h-4 w-4" />
                </div>
                View Capabilities
              </a>
            </motion.div>

            {/* Stats */}
            <div className="mt-5 sm:mt-8 grid grid-cols-3 gap-4 sm:gap-12 border-t border-white/10 pt-5 sm:pt-6 max-w-2xl">
              {[
                { value: '7+', label: 'Years Experience' },
                { value: '200+', label: 'Projects Delivered' },
                { value: '100%', label: 'Quality' },
              ].map((stat, idx) => (
                <FadeIn key={stat.label} delay={1 + (idx * 0.1)}>
                  <div className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </FadeIn>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Services Section ─── */}
      <section id="services" className="py-16 sm:py-24 lg:py-32 bg-white relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SlideUp className="mx-auto max-w-2xl text-center mb-12 sm:mb-24">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4 sm:mb-6">
              Fabrication Capabilities
            </h2>
            <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full mb-6" />
            <p className="text-base sm:text-xl text-gray-500">
              Complete stainless steel fabrication services from design to installation.
            </p>
          </SlideUp>

          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layers,
                title: 'Kitchen Stainless Steel Fabrication',
                desc: 'Custom food-grade stainless steel counters, sinks, shelving, and equipment for restaurants, hotels, and food courts.',
                items: ['Food Grade', 'Custom Fit', 'Durable'],
                color: 'bg-orange-50'
              },
              {
                icon: PenTool,
                title: 'Kitchen Planning & Remodeling',
                desc: 'End-to-end kitchen layout planning and remodeling designed for optimal workflow and compliance.',
                items: ['Layout Design', 'Remodeling', 'Compliant'],
                color: 'bg-blue-50'
              },
              {
                icon: Flame,
                title: 'LPG Gas Pipeline',
                desc: 'Professional LPG gas pipeline installation for commercial kitchens with strict safety standards.',
                items: ['Safety First', 'Commercial', 'Certified'],
                color: 'bg-red-50'
              },
              {
                icon: Shield,
                title: 'Fire Suppression System',
                desc: 'Kitchen fire suppression system installation to keep your commercial establishment safe and up to code.',
                items: ['Fire Safety', 'Compliant', 'Reliable'],
                color: 'bg-amber-50'
              },
              {
                icon: Wind,
                title: 'Exhaust & Fresh Air System',
                desc: 'Mechanical works for exhaust hoods, ductwork, and fresh air systems for proper kitchen ventilation.',
                items: ['Ventilation', 'Ductwork', 'Airflow'],
                color: 'bg-emerald-50'
              },
              {
                icon: PenTool,
                title: 'Railings & Custom Fabrication',
                desc: 'Custom-designed stainless steel railings and bespoke fabrication for residential and commercial projects.',
                items: ['Residential', 'Commercial', 'Custom'],
                color: 'bg-violet-50'
              },
            ].map((service) => (
              <motion.div
                key={service.title}
                variants={staggerItem}
                whileHover={{ y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ willChange: 'transform, opacity' }}
                className="group relative rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 sm:p-10 shadow-lg shadow-gray-200/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-shadow duration-300"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${service.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="h-7 w-7 text-gray-900" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{service.title}</h3>
                <p className="text-sm sm:text-base text-gray-500 leading-relaxed mb-5 sm:mb-8">
                  {service.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {service.items.map((item) => (
                     <span key={item} className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                       {item}
                     </span>
                  ))}
                </div>
                <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 duration-300">
                    <ArrowUpRight className="text-orange-500 h-6 w-6" />
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Process Section ─── */}
      <section id="process" className="bg-gray-950 py-16 sm:py-24 lg:py-32 relative overflow-hidden">
        {/* Background Grids */}
        <div className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: 'linear-gradient(#4b5563 1px, transparent 1px), linear-gradient(90deg, #4b5563 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} 
        />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-start">
             <div className="lg:sticky lg:top-32">
                <SlideInLeft>
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-sm font-semibold text-gray-300 mb-6">
                    <Wrench className="h-3.5 w-3.5" />
                    How It Works
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 sm:mb-6">
                    Streamlined <br/>
                    <span className="text-orange-500">Workflow.</span>
                  </h2>
                  <p className="text-base sm:text-lg text-gray-400 mb-6 sm:mb-10 max-w-md">
                    From initial consultation to final delivery — complete transparency at every step of your fabrication journey.
                  </p>
                  <Button asChild size="lg" className="bg-white text-gray-900 hover:bg-gray-200 font-bold rounded-full">
                     <Link to={isLoggedIn ? '/dashboard' : '/register'}>
                       {isLoggedIn ? <><LayoutDashboard className="mr-2 h-5 w-5" />Go to Dashboard</> : 'Get Started Now'}
                     </Link>
                  </Button>
                </SlideInLeft>
             </div>

             <StaggerContainer className="flex flex-col gap-4 sm:gap-8">
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
                  <motion.div
                    key={item.name}
                    variants={staggerItem}
                    className="flex gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    <div className="flex flex-col items-center gap-2">
                       <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-orange-600 text-white font-bold text-sm sm:text-lg shadow-lg shadow-orange-600/20">
                         {item.step}
                       </div>
                       {idx !== 3 && <div className="w-px h-full bg-white/10 min-h-[40px] grow" />}
                    </div>
                    <div className="pb-4">
                      <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">{item.name}</h3>
                      <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
             </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section id="about" className="py-16 sm:py-24 lg:py-32 bg-gray-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <SlideInLeft>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4 sm:mb-6">
                Built on Trust,<br/>
                Delivered with <span className="text-orange-600 decoration-4 decoration-orange-200 underline underline-offset-4">Precision</span>
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-xl text-gray-600 leading-relaxed mb-6 sm:mb-10">
                Founded in October 2018, RMV Stainless Steel Fabrication has grown into a 
                trusted name in commercial kitchen fabrication. We combine traditional 
                craftsmanship with modern technology to deliver outstanding results.
              </p>

              <StaggerContainer staggerDelay={0.08} className="space-y-4 sm:space-y-6">
                {[
                  'Real-time project tracking through your online portal',
                  'Transparent pricing with detailed cost breakdowns',
                  'Quality-assured with rigorous inspection protocols',
                  'Professional installation by certified technicians',
                  'On-time delivery with milestone-based updates',
                ].map((item) => (
                  <motion.div 
                    variants={staggerItem}
                    key={item} 
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-sm sm:text-lg text-gray-800 font-medium">{item}</span>
                  </motion.div>
                ))}
              </StaggerContainer>
            </SlideInLeft>

            {/* Visual card */}
            <SlideInRight className="relative flex items-center justify-center">
              <div className="relative w-full max-w-md">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ willChange: 'transform' }}
                  className="relative z-10 rounded-2xl sm:rounded-[2.5rem] bg-gray-900 p-5 sm:p-8 md:p-12 shadow-2xl overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-12 bg-orange-500/20 blur-[60px] rounded-full h-64 w-64 -mr-20 -mt-20" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                      <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                        <Wrench className="h-5 w-5 sm:h-7 sm:w-7" />
                      </div>
                      <div>
                        <span className="block text-white font-bold text-lg sm:text-2xl">RMV Portal</span>
                        <span className="text-gray-400 text-xs sm:text-sm">Client Dashboard</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        { label: 'Project Status', value: 'Fabrication', color: 'bg-orange-500' },
                        { label: 'Completion', value: '78%', color: 'bg-emerald-500' },
                        { label: 'Next Milestone', value: 'Quality Check', color: 'bg-blue-500' },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 px-3 sm:px-6 py-3 sm:py-5 hover:bg-white/10 transition-colors cursor-pointer gap-2"
                        >
                          <span className="text-xs sm:text-base text-gray-300 font-medium">{row.label}</span>
                          <span className={`text-xs sm:text-sm font-bold text-white px-2 sm:px-4 py-1 sm:py-1.5 rounded-full ${row.color}/20 text-center whitespace-nowrap`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 sm:mt-10">
                       <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                          <span>Overall Progress</span>
                          <span>78%</span>
                       </div>
                       <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                         <motion.div 
                           initial={{ scaleX: 0 }}
                           whileInView={{ scaleX: 1 }}
                           transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1.0] }}
                           viewport={{ once: true }}
                           style={{ originX: 0, willChange: 'transform' }}
                           className="h-full w-[78%] rounded-full bg-gradient-to-r from-orange-600 to-orange-400" 
                         />
                       </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Decorative Elements — CSS animations to avoid JS animation loops */}
                <div className="absolute -top-6 -right-6 sm:-top-12 sm:-right-12 h-24 w-24 sm:h-40 sm:w-40 rounded-full bg-orange-200/50 backdrop-blur-3xl -z-10 animate-float-slow" />
                <div className="absolute -bottom-6 -left-6 sm:-bottom-10 sm:-left-10 h-32 w-32 sm:h-56 sm:w-56 rounded-full bg-blue-200/50 backdrop-blur-3xl -z-10 animate-float-slower" />
              </div>
            </SlideInRight>
          </div>
        </div>
      </section>

      {/* ─── Mission & Vision ─── */}
      <section className="py-16 sm:py-24 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Our Purpose
              </h2>
              <p className="mt-3 text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
                What drives us every day in the workshop and on-site.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <SlideInLeft>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 sm:p-10 h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Star className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Our Mission</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  We are committed to delivering quality manufacturing services to our customers, fostering an environment of continuous growth for both our customers and investors.
                </p>
              </div>
            </SlideInLeft>

            <SlideInRight>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 sm:p-10 h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Our Vision</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Aspiring to be a world-class manufacturer, we aim to produce quality, custom, precision parts and fabrications that surpass customer expectations. Our success lies in providing on-time or early deliveries, affordable prices, and innovative ideas, services, and solutions that enhance our customers' products and businesses.
                </p>
              </div>
            </SlideInRight>
          </div>
        </div>
      </section>

      {/* ─── Projects Showcase ─── */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gray-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SlideUp className="mx-auto max-w-2xl text-center mb-12 sm:mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4 sm:mb-6">
              Featured Projects
            </h2>
            <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full mb-6" />
            <p className="text-base sm:text-xl text-gray-500">
              A selection of completed works across restaurants, hotels, and food establishments.
            </p>
          </SlideUp>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Le Grand Prei',
                location: 'General Santos City',
                category: 'Full Kitchen Fabrication',
                image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
              },
              {
                title: 'Kko Kko Korean Restaurant',
                location: 'Cubao, Quezon City',
                category: 'Kitchen Stainless Steel',
                image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
              },
              {
                title: "Primo's Restaurant",
                location: 'Ligao, Albay',
                category: 'Kitchen Equipment & Layout',
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
              },
              {
                title: '8 Danji Korean Resto',
                location: 'Araneta, Cubao, Quezon City',
                category: 'Full Kitchen Setup',
                image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
              },
              {
                title: 'Elkan Hotel',
                location: 'Ligao, Albay',
                category: 'Hotel Kitchen Fabrication',
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
              },
              {
                title: 'Food Stall Works – Ayala Fairview Terraces',
                location: 'Fairview, Quezon City',
                category: 'Multiple Food Stalls',
                image: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=800&q=80',
              },
            ].map((project) => (
              <motion.div
                key={project.title}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ willChange: 'transform, opacity' }}
                className="group relative rounded-2xl overflow-hidden bg-white shadow-lg shadow-gray-200/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-shadow duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">
                    {project.category}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">{project.title}</h3>
                  <p className="text-sm text-gray-300 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Sectors Served ─── */}
      <section className="py-16 sm:py-24 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SlideUp className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
              Sectors We Serve
            </h2>
            <p className="text-base sm:text-lg text-gray-500">
              Trusted by businesses across diverse industries in the food and hospitality sector.
            </p>
          </SlideUp>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: UtensilsCrossed, label: 'Restaurants' },
              { icon: ShoppingBag, label: 'Shopping Malls' },
              { icon: Warehouse, label: 'Food Courts' },
              { icon: Coffee, label: 'Bakeries & Cafés' },
              { icon: Truck, label: 'Fast Food Outlets' },
              { icon: Heart, label: 'Hospital Food Outlets' },
              { icon: Building2, label: 'Residentials' },
              { icon: Hotel, label: 'Hotels & Resorts F&B' },
            ].map((sector) => (
              <motion.div
                key={sector.label}
                variants={staggerItem}
                className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 sm:p-8 hover:border-orange-200 hover:bg-orange-50/50 transition-colors duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <sector.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center">{sector.label}</span>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gray-950 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#4b5563 1px, transparent 1px), linear-gradient(90deg, #4b5563 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <SlideUp className="mx-auto max-w-2xl text-center mb-12 sm:mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-4 sm:mb-6">
              What Our Clients Say
            </h2>
            <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full mb-6" />
            <p className="text-base sm:text-lg text-gray-400">
              Hear from business owners who trust RMV for their fabrication needs.
            </p>
          </SlideUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: 'Restaurant Owner',
                business: 'Korean Restaurant, Quezon City',
                quote: 'RMV delivered our complete kitchen setup ahead of schedule. The stainless steel work is top quality and the team was very professional throughout the entire process.',
                rating: 5,
              },
              {
                name: 'Hotel Manager',
                business: 'Hotel F&B, Albay',
                quote: 'From planning to installation, everything was handled seamlessly. The kitchen layout they designed improved our workflow significantly. Highly recommended!',
                rating: 5,
              },
              {
                name: 'Food Court Operator',
                business: 'Food Stalls, Fairview Terraces',
                quote: 'We had multiple stalls fabricated by RMV and every single one was done with excellent craftsmanship. Affordable pricing and on-time delivery.',
                rating: 5,
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.name}
                variants={staggerItem}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300"
              >
                <Quote className="h-8 w-8 text-orange-500/30 mb-4" />
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                  <p className="text-xs text-gray-400">{testimonial.business}</p>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative overflow-hidden bg-gray-900 py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531297461136-82lw9b61d69d?q=80&w=2688&auto=format&fit=crop')] bg-cover bg-fixed opacity-10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-gray-900" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <ScaleIn>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-6xl max-w-3xl mx-auto mb-6 sm:mb-8">
              Ready to build something{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                extraordinary?
              </span>
            </h2>
            <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-12 px-2">
              Create a free account to schedule your consultation. Let&apos;s bring your
              vision to life with precision engineering.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                asChild
                size="lg"
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 sm:px-12 h-12 sm:h-16 text-base sm:text-lg shadow-[0_0_40px_rgba(249,115,22,0.4)] rounded-full hover:scale-105 transition-transform w-full sm:w-auto"
              >
                <Link to={isLoggedIn ? '/dashboard' : '/register'}>
                  {isLoggedIn ? (
                    <><LayoutDashboard className="mr-2 h-5 w-5" />Go to Dashboard</>
                  ) : (
                    <>Get Started Free<ArrowRight className="ml-2 h-5 w-5" /></>
                  )}
                </Link>
              </Button>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="bg-white border-t border-gray-100 pt-12 sm:pt-24 pb-8 sm:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-12 mb-10 sm:mb-16">
            {/* Brand */}
            <div className="space-y-4 sm:space-y-6 col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-orange-500/20 shadow-sm" />
                <span className="text-lg sm:text-xl font-bold text-gray-900">RMV Stainless</span>
              </div>
              <p className="text-sm leading-6 text-gray-500">
                Precision stainless steel fabrication for residential and commercial
                industries. Quality you can trust.
              </p>
              <div className="flex gap-4">
                 {/* Social placeholders */}
                 {[1,2,3].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-orange-600 flex items-center justify-center transition-colors cursor-pointer">
                       <Sparkles className="h-4 w-4" />
                    </div>
                 ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 sm:mb-6">
                Services
              </h3>
              <ul className="space-y-4">
                {['Kitchen SS Fabrication', 'Kitchen Remodeling', 'LPG Gas Pipeline', 'Fire Suppression', 'Exhaust Systems', 'Railings'].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#services"
                        className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 sm:mb-6">
                Company
              </h3>
              <ul className="space-y-4">
                {['About Us', 'Projects', 'Careers', 'Privacy Policy'].map((item) => (
                  <li key={item}>
                    <a
                      href="#about"
                      className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 sm:mb-6">
                Contact
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-3 text-sm text-gray-500">
                  <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>BIR Village, Novaliches, Quezon City, Philippines 1118</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Phone className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span>02-9506187</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Phone className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span>0945 285 2974</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Mail className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span>rmvstainless@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Embedded Map */}
          <div className="mb-10 sm:mb-16 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <iframe
              title="RMV Location"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d966.5!2d121.039!3d14.7095!3m2!1i1024!2i768!4f13.1!3m6!1m5!1s!2sNatanawan+Residence,+Dahlia+Ext,+Quezon+City!3m2!1d14.7095!2d121.039!5e0!3m2!1sen!2sph"
              width="100%"
              height="280"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500 font-medium">
              &copy; {new Date().getFullYear()} RMV Stainless Steel Fabrication. All
              rights reserved.
            </p>
            <div className="flex items-center gap-2">
               <span className="h-1 w-1 rounded-full bg-green-500"></span>
               <p className="text-xs text-gray-500 font-medium">All Systems Operational</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </LazyMotion>
  );
}
