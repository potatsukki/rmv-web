import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Menu,
  X,
  LayoutDashboard,
  CheckCircle,
  Clock,
  Settings,
  Flame,
  Utensils,

  ShoppingBag,
  Store,
  Coffee,
  Truck,
  HeartPulse,
  Home,
  Hotel,
  MapPin,
  Phone,
  Mail,
  Quote,
  Maximize,
  Layers,
  Star,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, LazyMotion, domAnimation, AnimatePresence, useScroll, useTransform } from 'framer-motion';

// Ultra-smooth 240Hz-optimized ease — gentle acceleration, long organic deceleration
const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface CollectionProject {
  title: string;
  location: string;
  image: string;
  description: string;
}

interface CollectionData {
  id: string;
  label: string;
  headline: string;
  shortDescription: string;
  capabilityDescription: string;
  bestFor: string;
  scopeNote: string;
  coverImage: string;
  tags: string[];
  systems: string[];
  icon: React.ElementType;
  projects: CollectionProject[];
}

interface HeroSignalCard {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
}

const HERO_SIGNAL_CARDS: HeroSignalCard[] = [
  {
    label: 'Blueprint Approvals',
    value: 'Review Online',
    detail: 'See drawings and revisions clearly before fabrication moves forward.',
    icon: CheckCircle,
  },
  {
    label: 'Payment Tracking',
    value: 'Per Milestone',
    detail: 'Check balances, due dates, and verified payments in one place.',
    icon: LayoutDashboard,
  },
  {
    label: 'Project Progress',
    value: 'Live Updates',
    detail: 'Follow fabrication, quality checks, and installation updates as your project moves.',
    icon: Clock,
  },
];

const SHOWCASE_COLLECTIONS: CollectionData[] = [
  {
    id: 'commercial-kitchens',
    label: 'Commercial Kitchens',
    headline: 'Kitchen Stainless Steel Fabrication',
    shortDescription: 'Food-grade counters, prep lines, sinks, and service stations built for heavy daily operations.',
    capabilityDescription: 'This collection focuses on full stainless-steel kitchen packages for restaurants and production spaces, combining layout planning, custom fabrication, and workflow-ready installation.',
    bestFor: 'Restaurants, commissaries, and high-volume prep kitchens.',
    scopeNote: 'Built around clean zoning, durable surfaces, and efficient service circulation.',
    coverImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2932&auto=format&fit=crop',
    tags: ['Food Grade', 'Custom Fit', 'Production Ready'],
    systems: ['Custom counters', 'Prep tables', 'Sink systems', 'Service lines'],
    icon: Layers,
    projects: [
      {
        title: 'Le Grand Prei',
        location: 'General Santos City',
        image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2932&auto=format&fit=crop',
        description: 'Complete commercial kitchen fabrication for Le Grand Prei, featuring custom stainless steel countertops, exhaust hoods, and a full equipment layout designed for fast restaurant operations.',
      },
      {
        title: "Primo's Restaurant",
        location: 'Ligao, Albay',
        image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=2874&auto=format&fit=crop',
        description: 'End-to-end kitchen design and stainless steel fabrication for Primo\'s Restaurant, using a tighter prep-to-plating flow that improves daily kitchen movement without sacrificing build quality.',
      },
      {
        title: 'Production Kitchen Line',
        location: 'Metro Manila',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop',
        description: 'A commercial kitchen line arranged for volume cooking, built with coordinated prep zones, washable stainless worktops, and durable service counters for continuous use.',
      },
    ],
  },
  {
    id: 'grill-concepts',
    label: 'Grill Concepts',
    headline: 'Kitchen Planning, Ventilation, and Hot-Line Buildouts',
    shortDescription: 'Purpose-built stainless packages for grill-heavy concepts that need airflow, heat control, and tough prep zones.',
    capabilityDescription: 'Focused on Korean BBQ, grill restaurants, and high-heat concepts where stainless fabrication, exhaust routing, and cooking flow need to work together as one system.',
    bestFor: 'Korean BBQ, grill houses, and smoke-heavy kitchens.',
    scopeNote: 'Combines fabrication, hood planning, duct support, and prep-line organization.',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop',
    tags: ['Ventilation', 'High Heat', 'Workflow Driven'],
    systems: ['Exhaust hood runs', 'Grilling stations', 'Cold storage fit-outs', 'Drainage planning'],
    icon: Flame,
    projects: [
      {
        title: 'Kko Kko Korean Restaurant',
        location: 'Cubao, Quezon City',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop',
        description: 'A full stainless kitchen fit-out with grilling stations, prep tables, cold storage, and ventilation support designed for Korean BBQ service.',
      },
      {
        title: '8 Danji Korean Resto',
        location: 'Araneta, Cubao',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop',
        description: 'Custom fabrication for specialized prep stations, dual-purpose cooking areas, and integrated drainage that supports a compact but busy grill concept.',
      },
      {
        title: 'Open Grill Service Line',
        location: 'Quezon City',
        image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2940&auto=format&fit=crop',
        description: 'An open-kitchen grill line with stainless surrounds, coordinated hood coverage, and durable prep surfaces designed for front-facing service.',
      },
    ],
  },
  {
    id: 'hotel-banquet',
    label: 'Hotel Kitchens',
    headline: 'Banquet Production and Back-of-House Systems',
    shortDescription: 'Larger stainless packages for hotels and hospitality kitchens that need separate zones and dependable throughput.',
    capabilityDescription: 'Designed for back-of-house teams that operate at banquet scale, with stainless work lines, dedicated prep areas, and production layouts that stay manageable under pressure.',
    bestFor: 'Hotels, resorts, and large hospitality food operations.',
    scopeNote: 'Supports plating, wash, prep, and cooking zones without crowding the kitchen core.',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2940&auto=format&fit=crop',
    tags: ['Banquet Ready', 'Zone Planning', 'Heavy Duty'],
    systems: ['Prep zoning', 'Wash areas', 'Large cooklines', 'Holding stations'],
    icon: Hotel,
    projects: [
      {
        title: 'Elkan Hotel',
        location: 'Ligao, Albay',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2940&auto=format&fit=crop',
        description: 'Large-scale hotel kitchen fabrication designed for banquet-level production with separated prep, cooking, plating, and wash zones in premium stainless steel.',
      },
      {
        title: 'Hospitality Service Kitchen',
        location: 'Bicol Region',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2940&auto=format&fit=crop',
        description: 'A hospitality-focused kitchen layout built for steady daily output, with cleaner movement between receiving, prep, plating, and washdown spaces.',
      },
      {
        title: 'Banquet Prep Line',
        location: 'South Luzon',
        image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2940&auto=format&fit=crop',
        description: 'A banquet support line configured for larger batch work, featuring expanded stainless prep surfaces and clearer service transitions during peak events.',
      },
    ],
  },
  {
    id: 'food-stall-systems',
    label: 'Food Stall Systems',
    headline: 'Compact Counters and Service-Focused Fabrication',
    shortDescription: 'Smart stainless assemblies for smaller footprints where every surface has to work harder.',
    capabilityDescription: 'Built for food stalls and service counters that need efficient prep, storage, and customer-facing presentation without wasting floor area.',
    bestFor: 'Food courts, kiosks, and compact retail food spaces.',
    scopeNote: 'Compact layouts with storage, service counters, and durable stainless finishes.',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2874&auto=format&fit=crop',
    tags: ['Compact Layout', 'Fast Service', 'Flexible Build'],
    systems: ['Serving counters', 'Storage integration', 'Compact cook stations', 'Washable finishes'],
    icon: Store,
    projects: [
      {
        title: 'Food Stall Works',
        location: 'Fairview, Quezon City',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2874&auto=format&fit=crop',
        description: 'Multiple compact stall fabrication packages featuring stainless service counters, storage, and cooking stations tailored for high-turnover food court operations.',
      },
      {
        title: 'Mall Kiosk Counter',
        location: 'Metro Manila',
        image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=2940&auto=format&fit=crop',
        description: 'A compact kiosk fit-out with durable stainless worktops, built-in storage, and a frontage designed to support fast service in a tight retail footprint.',
      },
      {
        title: 'Quick-Service Stall Line',
        location: 'Quezon City',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2940&auto=format&fit=crop',
        description: 'A quick-service line organized around order flow, with stainless workstations arranged to reduce congestion between prep, cook, and handoff areas.',
      },
    ],
  },
  {
    id: 'custom-metalworks',
    label: 'Custom Metalworks',
    headline: 'Railings, Architectural Stainless, and Bespoke Fabrication',
    shortDescription: 'Beyond kitchens: polished stainless details and architectural fabrications for commercial and residential spaces.',
    capabilityDescription: 'This collection covers stainless railings and custom-built metal elements where finish, detailing, and visual presence matter as much as durability.',
    bestFor: 'Commercial lobbies, staircases, balconies, and premium residential work.',
    scopeNote: 'Ideal when the project needs both structural confidence and a cleaner modern finish.',
    coverImage: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2940&auto=format&fit=crop',
    tags: ['Architectural', 'Polished Finish', 'Bespoke'],
    systems: ['Railing fabrication', 'Stair details', 'Custom brackets', 'Architectural trim'],
    icon: Maximize,
    projects: [
      {
        title: 'Lobby Stair Rail System',
        location: 'Davao Region',
        image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2940&auto=format&fit=crop',
        description: 'A polished stainless stair rail package designed for a modern lobby setting, balancing visual refinement with long-term durability in a high-traffic interior.',
      },
      {
        title: 'Balcony Guardrail Collection',
        location: 'South Cotabato',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2940&auto=format&fit=crop',
        description: 'Custom stainless guardrails fabricated for a residential project, emphasizing clean lines, stable hand feel, and a brighter architectural finish.',
      },
      {
        title: 'Commercial Entry Detail',
        location: 'General Santos City',
        image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2940&auto=format&fit=crop',
        description: 'A bespoke stainless entry detail package with coordinated rails and trim elements that sharpen the visual identity of the space while staying easy to maintain.',
      },
    ],
  }
];

export function LandingPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCollectionIndex, setActiveCollectionIndex] = useState<number | null>(null);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null);
  const activeCollection = activeCollectionIndex !== null ? SHOWCASE_COLLECTIONS[activeCollectionIndex] ?? null : null;
  const activeProject = activeCollection
    ? activeCollection.projects[activeProjectIndex ?? 0] ?? activeCollection.projects[0] ?? null
    : null;

  // Sticky hero scroll tracking
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroWrapperRef,
    offset: ['start start', 'end start'],
  });
  const heroContentY = useTransform(heroProgress, [0, 1], [0, 100]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.5, 1], [1, 0.6, 0]);
  const heroContentScale = useTransform(heroProgress, [0, 1], [1, 0.95]);
  const blueprintLeftX = useTransform(heroProgress, [0, 1], [0, -80]);
  const blueprintRightX = useTransform(heroProgress, [0, 1], [0, 80]);
  const blueprintOpacity = useTransform(heroProgress, [0, 0.5, 1], [1, 0.6, 0]);
  const heroGlowScale = useTransform(heroProgress, [0, 1], [1, 1.3]);
  const heroGlowOpacity = useTransform(heroProgress, [0, 0.7, 1], [0.45, 0.2, 0]);

  // About section parallax
  const aboutRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: aboutProgress } = useScroll({ target: aboutRef, offset: ['start end', 'end start'] });
  const aboutBlobY = useTransform(aboutProgress, [0, 1], [100, -100]);
  const aboutCardY = useTransform(aboutProgress, [0, 1], [80, -60]);

  // Workflow section parallax
  const workflowRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: workflowProgress } = useScroll({ target: workflowRef, offset: ['start end', 'end start'] });
  const workflowGlowY = useTransform(workflowProgress, [0, 1], [120, -120]);
  const workflowGlow2Y = useTransform(workflowProgress, [0, 1], [-80, 80]);

  // Section refs for scroll anchoring
  const capabilitiesRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  // Testimonials section parallax
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: testimonialsProgress } = useScroll({ target: testimonialsRef, offset: ['start end', 'end start'] });
  const testimonialsGlowScale = useTransform(testimonialsProgress, [0, 1], [0.8, 1.3]);

  const ctaRef = useRef<HTMLDivElement>(null);
  const sectorsRef = useRef<HTMLDivElement>(null);
  const purposeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!activeCollection) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCollectionIndex(null);
        setActiveProjectIndex(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeCollection]);

  useEffect(() => {
    document.documentElement.classList.add('landing-page-scrollbar');
    document.body.classList.add('landing-page-scrollbar');
    return () => {
      document.documentElement.classList.remove('landing-page-scrollbar');
      document.body.classList.remove('landing-page-scrollbar');
    };
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[linear-gradient(180deg,#0d1117_0%,#1a212b_18%,#cbd3db_46%,#dde4ea_68%,#141a22_100%)] font-sans text-[#1d1d1f] selection:bg-[#1d1d1f] selection:text-white">
        
        {/* Navigation */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: SMOOTH_240 }}
          className="fixed top-0 z-50 w-full border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,12,18,0.88)_0%,rgba(18,26,35,0.76)_58%,rgba(29,38,49,0.68)_100%)] backdrop-blur-2xl shadow-[0_10px_40px_rgba(6,8,12,0.24)] gpu-reveal"
        >
          <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2 group">
              <BrandLogo className="h-6 w-6 text-[#f2f5f8] transition-transform duration-500 group-hover:scale-110" />
              <span className="text-sm font-bold tracking-tight text-[#f2f5f8]">
                RMV Stainless Steel Fabrication
              </span>
            </Link>

            <nav className="hidden lg:flex gap-7">
              {[
                { label: 'Home', href: '#hero' },
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#capabilities' },
                { label: 'Projects', href: '#projects' },
                { label: 'Contact', href: '#contact' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="relative text-[13px] font-medium text-[#c6d0da] transition-colors hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-[#d9b36a] after:transition-all after:duration-300"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              {isLoggedIn ? (
                <Button asChild variant="ghost" className="h-9 rounded-full px-5 text-[13px] font-medium text-white hover:bg-white/10">
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 text-[13px] font-medium text-[#c6d0da] transition-colors hover:text-white">
                    Sign In
                  </Link>
                  <Button asChild className="h-9 rounded-full bg-[linear-gradient(135deg,#e2b566_0%,#c38a37_48%,#f1d49a_100%)] px-6 text-[13px] font-semibold text-[#11161c] transition-all duration-300 hover:scale-105 hover:brightness-105 hover:bg-[linear-gradient(135deg,#ebc274_0%,#cf943f_48%,#f5ddb0_100%)] hover:text-[#11161c] active:scale-95 shadow-[0_10px_26px_rgba(186,131,49,0.28)]">
                    <Link to="/register" className="text-[#11161c] hover:text-[#11161c]">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            <button
              type="button"
              className="-mr-1 rounded-xl p-2.5 text-[#f2f5f8] transition-colors hover:bg-white/10 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-[linear-gradient(180deg,#081019_0%,#111923_52%,#1d2733_100%)] px-6 pt-20 lg:hidden"
          >
            <nav className="flex flex-col gap-1 mt-4">
               {[
                 { label: 'Home', href: '#hero' },
                 { label: 'About', href: '#about' },
                 { label: 'Services', href: '#capabilities' },
                 { label: 'Projects', href: '#projects' },
                 { label: 'Contact', href: '#contact' },
               ].map((item) => (
                 <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="border-b border-white/10 py-4 text-2xl font-semibold tracking-tight text-[#f3f6f9] transition-all hover:pl-2">
                   {item.label}
                 </a>
               ))}
               <div className="pt-8 flex flex-col gap-4">
                 {isLoggedIn ? (
                   <Button asChild className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#e2b566_0%,#c38a37_48%,#f1d49a_100%)] text-base font-semibold text-[#11161c]">
                     <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                   </Button>
                 ) : (
                   <>
                     <Button asChild className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#e2b566_0%,#c38a37_48%,#f1d49a_100%)] text-base font-semibold text-[#11161c] hover:bg-[linear-gradient(135deg,#ebc274_0%,#cf943f_48%,#f5ddb0_100%)] hover:text-[#11161c]">
                       <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-[#11161c] hover:text-[#11161c]">Get Started</Link>
                     </Button>
                     <Button asChild variant="outline" className="h-14 w-full rounded-2xl border-[#d6dde6]/70 bg-[linear-gradient(180deg,rgba(245,247,250,0.98)_0%,rgba(222,228,235,0.94)_100%)] text-base font-semibold text-[#14181d] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_24px_rgba(0,0,0,0.12)] hover:bg-[linear-gradient(180deg,rgba(250,251,253,1)_0%,rgba(228,233,239,0.98)_100%)] hover:text-[#14181d]">
                       <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-[#14181d] hover:text-[#14181d]">Sign In</Link>
                     </Button>
                   </>
                 )}
               </div>
            </nav>
          </motion.div>
        )}

        {/* Hero Section */}
        <section ref={heroWrapperRef} id="hero" className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#04070c_0%,#0c1219_18%,#15202c_42%,#223142_66%,#d0b070_86%,#f0dfb5_100%)] pt-20 pb-12 md:pb-16 lg:pb-20">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(245,232,196,0.18)_0%,rgba(245,232,196,0)_100%)] pointer-events-none" />
          <div className="absolute inset-y-0 left-[12%] w-px bg-[linear-gradient(180deg,transparent_0%,rgba(233,194,115,0.3)_16%,rgba(233,194,115,0.08)_82%,transparent_100%)] pointer-events-none hidden xl:block" />
          <div className="absolute inset-y-0 right-[12%] w-px bg-[linear-gradient(180deg,transparent_0%,rgba(173,194,217,0.26)_16%,rgba(173,194,217,0.08)_82%,transparent_100%)] pointer-events-none hidden xl:block" />
          {/* Soft center glow — parallax layer */}
          <motion.div
            style={{ scale: heroGlowScale, opacity: heroGlowOpacity }}
            className="absolute top-1/2 left-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(241,212,154,0.24)_0%,rgba(125,150,181,0.16)_28%,transparent_62%)] pointer-events-none will-change-transform md:h-[1100px] md:w-[1100px]"
          />

          {/* Left Blueprint SVG Decoration */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.6, delay: 0.3, ease: SMOOTH_240 }}
            style={{ x: blueprintLeftX, opacity: blueprintOpacity }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[220px] md:w-[340px] lg:w-[420px] pointer-events-none hidden sm:block"
          >
            <svg viewBox="0 0 420 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.10]">
              {/* Flange / circular mechanical part */}
              <circle cx="210" cy="260" r="160" stroke="#5a5a60" strokeWidth="1.5" />
              <circle cx="210" cy="260" r="130" stroke="#5a5a60" strokeWidth="1" />
              <circle cx="210" cy="260" r="80" stroke="#5a5a60" strokeWidth="1.5" />
              <circle cx="210" cy="260" r="45" stroke="#5a5a60" strokeWidth="1" />
              <circle cx="210" cy="260" r="20" stroke="#5a5a60" strokeWidth="2" fill="#5a5a60" fillOpacity="0.08" />
              {/* Bolt holes */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const cx = 210 + 108 * Math.cos(rad);
                const cy = 260 + 108 * Math.sin(rad);
                return <circle key={angle} cx={cx} cy={cy} r="8" stroke="#5a5a60" strokeWidth="1" />;
              })}
              {/* Cross-hair lines */}
              <line x1="20" y1="260" x2="400" y2="260" stroke="#5a5a60" strokeWidth="0.5" strokeDasharray="6 4" />
              <line x1="210" y1="70" x2="210" y2="450" stroke="#5a5a60" strokeWidth="0.5" strokeDasharray="6 4" />
              {/* Dimension lines */}
              <line x1="50" y1="440" x2="370" y2="440" stroke="#5a5a60" strokeWidth="0.8" />
              <line x1="50" y1="435" x2="50" y2="445" stroke="#5a5a60" strokeWidth="0.8" />
              <line x1="370" y1="435" x2="370" y2="445" stroke="#5a5a60" strokeWidth="0.8" />
              <text x="210" y="458" textAnchor="middle" fill="#5a5a60" fontSize="10" fontFamily="monospace">Ø 320mm</text>
              {/* Detail callout */}
              <line x1="330" y1="160" x2="390" y2="100" stroke="#5a5a60" strokeWidth="0.7" />
              <circle cx="330" cy="160" r="3" fill="#5a5a60" />
              <text x="392" y="104" fill="#5a5a60" fontSize="8" fontFamily="monospace">DETAIL A</text>
              {/* Section indicator */}
              <rect x="40" y="510" width="340" height="60" rx="2" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <line x1="40" y1="540" x2="380" y2="540" stroke="#5a5a60" strokeWidth="0.5" strokeDasharray="4 3" />
              <text x="210" y="530" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">SECTION A-A</text>
              <text x="210" y="560" textAnchor="middle" fill="#5a5a60" fontSize="8" fontFamily="monospace">SCALE 1:2</text>
            </svg>
          </motion.div>

          {/* Right Blueprint SVG Decoration */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.6, delay: 0.3, ease: SMOOTH_240 }}
            style={{ x: blueprintRightX, opacity: blueprintOpacity }}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[220px] md:w-[340px] lg:w-[420px] pointer-events-none hidden sm:block"
          >
            <svg viewBox="0 0 420 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.10]">
              {/* T-pipe / cross-section */}
              <rect x="120" y="100" width="180" height="280" rx="3" stroke="#5a5a60" strokeWidth="1.5" fill="none" />
              <rect x="140" y="120" width="140" height="240" rx="2" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              {/* Internal pipe cross-section */}
              <circle cx="210" cy="240" r="55" stroke="#5a5a60" strokeWidth="1.5" />
              <circle cx="210" cy="240" r="40" stroke="#5a5a60" strokeWidth="0.8" />
              {/* Weld indicators */}
              <path d="M155 140 L165 150 L155 160" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <path d="M265 140 L255 150 L265 160" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              {/* Dimension annotations */}
              <line x1="100" y1="100" x2="100" y2="380" stroke="#5a5a60" strokeWidth="0.7" />
              <line x1="95" y1="100" x2="105" y2="100" stroke="#5a5a60" strokeWidth="0.7" />
              <line x1="95" y1="380" x2="105" y2="380" stroke="#5a5a60" strokeWidth="0.7" />
              <text x="90" y="244" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace" transform="rotate(-90 90 244)">280mm</text>
              <line x1="120" y1="400" x2="300" y2="400" stroke="#5a5a60" strokeWidth="0.7" />
              <line x1="120" y1="395" x2="120" y2="405" stroke="#5a5a60" strokeWidth="0.7" />
              <line x1="300" y1="395" x2="300" y2="405" stroke="#5a5a60" strokeWidth="0.7" />
              <text x="210" y="418" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">180mm</text>
              {/* Surface finish symbol */}
              <path d="M320 300 L330 290 L340 300 L350 290" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <text x="338" y="280" fill="#5a5a60" fontSize="8" fontFamily="monospace">Ra 1.6</text>
              {/* Title block */}
              <rect x="60" y="460" width="300" height="100" rx="2" stroke="#5a5a60" strokeWidth="1" fill="none" />
              <line x1="60" y1="485" x2="360" y2="485" stroke="#5a5a60" strokeWidth="0.5" />
              <line x1="60" y1="510" x2="360" y2="510" stroke="#5a5a60" strokeWidth="0.5" />
              <line x1="60" y1="535" x2="360" y2="535" stroke="#5a5a60" strokeWidth="0.5" />
              <line x1="210" y1="460" x2="210" y2="560" stroke="#5a5a60" strokeWidth="0.5" />
              <text x="135" y="478" textAnchor="middle" fill="#5a5a60" fontSize="8" fontFamily="monospace">MATERIAL</text>
              <text x="285" y="478" textAnchor="middle" fill="#5a5a60" fontSize="8" fontFamily="monospace">FINISH</text>
              <text x="135" y="502" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">SS 304</text>
              <text x="285" y="502" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">#4 Brushed</text>
              <text x="135" y="528" textAnchor="middle" fill="#5a5a60" fontSize="8" fontFamily="monospace">TOLERANCE</text>
              <text x="285" y="528" textAnchor="middle" fill="#5a5a60" fontSize="8" fontFamily="monospace">DRAWN BY</text>
              <text x="135" y="552" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">±0.5mm</text>
              <text x="285" y="552" textAnchor="middle" fill="#5a5a60" fontSize="9" fontFamily="monospace">RMV ENG.</text>
              {/* Corner triangle detail */}
              <path d="M340 120 L380 120 L380 160" stroke="#5a5a60" strokeWidth="0.6" fill="none" />
              <text x="385" y="142" fill="#5a5a60" fontSize="7" fontFamily="monospace">45°</text>
            </svg>
          </motion.div>

          {/* Bottom edge highlight */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          
          <motion.div
            style={{ y: heroContentY, opacity: heroContentOpacity, scale: heroContentScale }}
            className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center will-change-transform sm:px-6 md:mt-0"
          >
            {/* Chrome SVG heading for true metallic texture */}
            <motion.h1
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: SMOOTH_240 }}
              className="mb-4 py-2 text-center text-[2.6rem] font-bold leading-[0.95] tracking-tighter drop-shadow-[0_12px_30px_rgba(0,0,0,0.28)] sm:text-6xl md:mb-5 md:text-7xl lg:text-[108px] gpu-reveal"
            >
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #f8edd2 0%, #f2d491 16%, #9eb6cf 33%, #dfe8f2 48%, #b7863a 66%, #f7e7bf 82%, #eef5fb 100%)',
                }}
              >Precision</span><br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #e7edf4 0%, #9bb2c9 12%, #f5db9e 30%, #fcf2d9 45%, #c78d35 60%, #dbe5ef 76%, #f7ecd2 100%)',
                }}
              >Engineering.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: SMOOTH_240 }}
              className="mb-3 max-w-2xl px-2 text-lg font-medium tracking-tight text-[#e6edf4] gpu-reveal sm:text-xl md:mb-4 md:text-2xl"
            >
              Uncompromising quality in every weld.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: SMOOTH_240 }}
              className="mb-5 max-w-xl px-4 text-sm font-normal text-[#c5d0dc] gpu-reveal sm:text-base md:mb-6 md:text-lg"
            >
              Manage your fabrication project with clearer approvals, payment tracking, and progress updates from start to finish.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: SMOOTH_240 }}
              className="flex w-full flex-col gap-3 overflow-visible pb-3 gpu-reveal sm:w-auto sm:flex-row md:pb-4"
            >
              <Button asChild className="h-14 w-full rounded-full bg-[linear-gradient(135deg,#e2b566_0%,#c38a37_48%,#f1d49a_100%)] px-8 text-base font-semibold text-[#11161c] transition-all duration-300 active:scale-95 sm:w-auto md:h-16 md:px-10 shadow-[0_16px_40px_rgba(186,131,49,0.28)] hover:brightness-105 hover:bg-[linear-gradient(135deg,#ebc274_0%,#cf943f_48%,#f5ddb0_100%)] hover:text-[#11161c]">
                <Link to="/register" className="text-[#11161c] hover:text-[#11161c]">
                  Commission a Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild className="relative w-full overflow-hidden rounded-full border border-white/18 bg-white/8 px-8 text-base font-semibold text-[#f4f6f8] backdrop-blur-md transition-all duration-300 active:scale-95 hover:border-[#f0d498]/48 hover:bg-white/14 sm:w-auto md:h-16 md:px-10 shadow-[0_12px_30px_rgba(4,7,12,0.22)]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 12px 30px rgba(4,7,12,0.22)' }}>
                <a href="#capabilities" className="text-[#f4f6f8]">Explore Services</a>
              </Button>
            </motion.div>

          </motion.div>

          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(20,26,34,0)_0%,rgba(20,26,34,0.3)_100%)] pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 h-px w-[min(82vw,76rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f0d7a1]/70 to-transparent" />
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0d131a_0%,#17202b_26%,#263444_54%,#111820_100%)] py-16 md:py-24">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d9b36a]/50 to-transparent" />
          <div className="absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,150,181,0.18)_0%,transparent_68%)] blur-3xl" />
          <div className="absolute -right-16 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(241,212,154,0.18)_0%,transparent_72%)] blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.05, ease: SMOOTH_240 }}
              className="mb-8 text-center gpu-reveal md:mb-12"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e4bf79]/30 bg-[#e4bf79]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f5dca9]">
                <Sparkles className="h-3.5 w-3.5" />
                Client Portal
              </div>
              <h2 className="mx-auto max-w-4xl text-2xl font-bold tracking-tighter text-white sm:text-4xl md:text-6xl">
                Stay informed from drawing approval to final installation.
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-[15px] font-medium leading-7 text-[#bcc8d3] md:text-lg">
                The RMV client portal helps you review drawings, track payments, and follow project progress without relying on scattered messages or manual follow-ups.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 1.1, delay: 0.12, ease: SMOOTH_240 }}
              className="relative overflow-hidden rounded-[1.5rem] border border-white/14 bg-[linear-gradient(145deg,rgba(9,13,18,0.78)_0%,rgba(17,24,33,0.92)_36%,rgba(30,40,52,0.88)_68%,rgba(12,18,24,0.82)_100%)] p-3 shadow-[0_28px_90px_rgba(3,6,10,0.34)] backdrop-blur-xl sm:rounded-[2rem] sm:p-4 md:p-6 gpu-reveal"
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_18%,rgba(241,212,154,0.06)_50%,rgba(255,255,255,0.02)_82%,rgba(255,255,255,0.07)_100%)] opacity-80" />
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d8b26a]/60 to-transparent" />

              <div className="relative grid items-stretch gap-2.5 sm:gap-3 lg:grid-cols-[1fr,1.8fr] lg:gap-4">
                <div className="flex h-full flex-col justify-center rounded-[1.25rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[1.6rem] sm:p-5 md:p-6">
                  <h3 className="mx-auto max-w-md text-[1.55rem] font-bold tracking-tight text-white sm:text-lg md:text-[1.85rem]">
                    A clearer project experience for every client.
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-7 text-[#bcc8d3] sm:text-sm">
                    Instead of chasing updates manually, clients can review drawings, confirm payments, and monitor progress through each stage of the job.
                  </p>
                  <div className="mx-auto mt-4 grid w-full max-w-2xl gap-2.5 sm:mt-5 sm:gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-3 sm:rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8ea4bb]">Faster Decisions</p>
                      <p className="mt-1 text-sm font-semibold text-white">Review drawings without back-and-forth</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-3 sm:rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8c08c]">Clear Visibility</p>
                      <p className="mt-1 text-sm font-semibold text-white">See payments and progress in one place</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
                  {HERO_SIGNAL_CARDS.map((card, index) => (
                    <div
                      key={card.label}
                      className={`group relative flex min-h-[148px] flex-col overflow-hidden rounded-[1.1rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_100%)] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 hover:-translate-y-1 sm:min-h-[210px] sm:rounded-[1.6rem] sm:p-4 md:p-5 ${index === 2 ? 'col-span-2 md:col-span-1' : ''}`}
                    >
                      <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(243,214,154,0.12)_0%,rgba(243,214,154,0)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#91a4b8] sm:text-[10px] sm:tracking-[0.22em]">{card.label}</p>
                          <p className="mt-2 text-[1.05rem] font-bold leading-[1.05] tracking-tight text-white sm:text-xl md:text-[1.7rem]">{card.value}</p>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-[#dfbe86]/30 bg-[linear-gradient(145deg,rgba(226,181,102,0.16)_0%,rgba(125,150,181,0.14)_100%)] text-[#f3d79f] shadow-[0_10px_22px_rgba(0,0,0,0.18)] sm:h-11 sm:w-11 sm:rounded-2xl">
                          <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>
                      <p className="relative mt-3 hidden text-sm font-medium leading-7 text-[#c3ced8] sm:block">{card.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Built on Trust Section */}
        <section ref={aboutRef} id="about" className="relative z-10 -mt-10 overflow-hidden rounded-t-[40px] bg-[linear-gradient(180deg,#f4ead5_0%,#e8edf2_16%,#d9e1e8_44%,#cfd8e1_74%,#f2e1b7_100%)] pt-20 pb-16 md:-mt-16 md:rounded-t-[80px] md:pt-40 md:pb-32">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          {/* Blueprint corner decoration */}
          <div className="absolute top-8 right-8 w-[200px] md:w-[280px] pointer-events-none hidden md:block">
            <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.07]">
              <rect x="20" y="20" width="240" height="240" rx="2" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <rect x="40" y="40" width="200" height="200" rx="1" stroke="#5a5a60" strokeWidth="0.5" strokeDasharray="6 4" fill="none" />
              <line x1="140" y1="20" x2="140" y2="260" stroke="#5a5a60" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="20" y1="140" x2="260" y2="140" stroke="#5a5a60" strokeWidth="0.4" strokeDasharray="4 3" />
              <circle cx="140" cy="140" r="60" stroke="#5a5a60" strokeWidth="0.8" />
              <circle cx="140" cy="140" r="30" stroke="#5a5a60" strokeWidth="0.5" />
              <circle cx="140" cy="140" r="8" stroke="#5a5a60" strokeWidth="1" fill="#5a5a60" fillOpacity="0.06" />
              <text x="140" y="275" textAnchor="middle" fill="#5a5a60" fontSize="7" fontFamily="monospace">DETAIL B — SCALE 1:4</text>
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.1, ease: SMOOTH_240 }}
                className="gpu-reveal"
              >
                <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tighter sm:text-4xl md:text-6xl">
                  <span className="text-[#171b21] drop-shadow-[0_1px_0_rgba(255,255,255,0.24)]">Built on Trust,</span><br/>
                  <span className="text-[#5f6772] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">Delivered with Precision.</span>
                </h2>
                <p className="text-base md:text-xl text-[#6e6e73] font-medium mb-8 md:mb-10 leading-relaxed max-w-lg">
                  Founded in October 2018, RMV Stainless Steel Fabrication has grown into a trusted name in commercial kitchen fabrication. We combine traditional craftsmanship with modern technology to deliver outstanding results.
                </p>
                
                <ul className="space-y-6">
                  {[
                    'Real-time project tracking through your online portal',
                    'Transparent pricing with detailed cost breakdowns',
                    'Quality-assured with rigorous inspection protocols',
                    'Professional installation by certified technicians',
                    'On-time delivery with milestone-based updates'
                  ].map((text, i) => (
                     <li key={i} className="flex items-start gap-3 md:gap-4">
                       <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#d2d2d7] to-white flex items-center justify-center border border-[#c0c0c4] shadow-sm">
                         <CheckCircle className="h-4 w-4 text-[#1d1d1f]" />
                       </div>
                       <span className="text-[#1d1d1f] font-medium text-base md:text-lg tracking-tight">{text}</span>
                     </li>
                  ))}
                </ul>
              </motion.div>

              {/* Portal UI Mockup inside minimalist card — parallax float */}
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ rotateX: -3, rotateY: 4, z: 25, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.1, delay: 0.2, ease: SMOOTH_240 }}
                style={{ y: aboutCardY, transformPerspective: 800, transformStyle: 'preserve-3d' }}
                className="relative mx-auto w-full max-w-[500px] gpu-reveal will-change-transform"
              >
                <div className="relative overflow-hidden rounded-[2rem] border border-[#d4bc89]/24 bg-[linear-gradient(160deg,#0d141c_0%,#182231_42%,#243345_74%,#0d1620_100%)] p-5 shadow-[0_30px_80px_rgba(10,14,20,0.3)] md:rounded-[2.5rem] md:p-7">
                  <motion.div style={{ y: aboutBlobY }} className="pointer-events-none absolute inset-x-8 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_72%)] will-change-transform" />
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/8" />

                  <div className="relative flex items-center gap-4 pb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.05)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">RMV Portal</h4>
                      <p className="text-sm text-[#8e98a5]">Client Dashboard</p>
                    </div>
                  </div>

                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <span className="text-sm font-medium text-[#a5afba]">Project Status</span>
                      <span className="rounded-full bg-[linear-gradient(180deg,#f7f7f8_0%,#e6e7ea_100%)] px-3 py-1 text-xs font-bold text-[#101317] shadow-[0_8px_16px_rgba(0,0,0,0.14)]">Fabrication</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <span className="text-sm font-medium text-[#a5afba]">Completion</span>
                      <span className="text-[1.05rem] font-bold tracking-tight text-white">78%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <span className="text-sm font-medium text-[#a5afba]">Next Milestone</span>
                      <span className="text-sm font-bold text-white">Quality Check</span>
                    </div>
                  </div>

                  <div className="relative mt-7 border-t border-white/8 pt-6">
                     <div className="mb-3 flex justify-between text-xs font-medium text-[#8e98a5]">
                       <span>Overall Progress</span>
                       <span>78%</span>
                     </div>
                     <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                       <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,#f4f5f7_0%,#ffffff_100%)] shadow-[0_0_18px_rgba(255,255,255,0.16)]" />
                     </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Streamlined Workflow */}
        <section ref={workflowRef} id="workflow" className="relative py-16 md:py-32 bg-gradient-to-br from-[#1a1a1c] via-[#0f0f11] to-[#1d1d1f] text-white overflow-hidden">
          {/* Subtle silver light leaks — parallax drift */}
          <motion.div style={{ y: workflowGlowY }} className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(180,180,190,0.06)_0%,transparent_70%)] pointer-events-none will-change-transform" />
          <motion.div style={{ y: workflowGlow2Y }} className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(200,200,210,0.05)_0%,transparent_70%)] pointer-events-none will-change-transform" />
          {/* Blueprint technical decoration */}
          <div className="absolute top-8 right-8 w-[160px] md:w-[220px] pointer-events-none hidden lg:block">
            <svg viewBox="0 0 220 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.04]">
              <rect x="20" y="20" width="180" height="260" rx="2" stroke="#a0a0a6" strokeWidth="0.6" fill="none" />
              <line x1="20" y1="80" x2="200" y2="80" stroke="#a0a0a6" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="20" y1="150" x2="200" y2="150" stroke="#a0a0a6" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="20" y1="220" x2="200" y2="220" stroke="#a0a0a6" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="110" y1="20" x2="110" y2="280" stroke="#a0a0a6" strokeWidth="0.3" strokeDasharray="3 3" />
              <text x="60" y="55" fill="#a0a0a6" fontSize="7" fontFamily="monospace">STEP 01</text>
              <text x="60" y="120" fill="#a0a0a6" fontSize="7" fontFamily="monospace">STEP 02</text>
              <text x="60" y="190" fill="#a0a0a6" fontSize="7" fontFamily="monospace">STEP 03</text>
              <text x="60" y="255" fill="#a0a0a6" fontSize="7" fontFamily="monospace">STEP 04</text>
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-10 md:gap-16">
              
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 70 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 1.1, ease: SMOOTH_240 }}
                  className="sticky top-32 gpu-reveal"
                >
                  <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-full px-4 py-1.5 mb-8">
                    <Clock className="h-4 w-4 text-[#a1a1a6]" />
                    <span className="text-sm font-medium text-[#a1a1a6]">How It Works</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter leading-none mb-6">
                    <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(145deg, #7a7a80 0%, #e0e0e4 20%, #9a9a9f 40%, #c8c8cd 60%, #858589 80%, #d0d0d5 100%)' }}>Streamlined</span><br />
                    <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(145deg, #9e9ea3 0%, #c8c8cd 12%, #a0a0a5 22%, #e0e0e4 35%, #b0b0b5 45%, #8e8e93 55%, #d0d0d5 65%, #a8a8ad 78%, #c5c5ca 88%, #9a9a9f 100%)' }}>Workflow.</span>
                  </h2>
                  <p className="text-[#a1a1a6] text-lg font-medium mb-10 max-w-md leading-relaxed">
                    From initial consultation to final delivery — complete transparency at every step of your fabrication journey.
                  </p>
                  <Button asChild className="rounded-full bg-[linear-gradient(135deg,#f2d28d_0%,#d8a64c_52%,#f4ddb0_100%)] px-8 text-base font-semibold text-[#11161c] shadow-[0_14px_34px_rgba(178,128,46,0.22)] transition-all duration-300 hover:scale-105 hover:brightness-105 hover:bg-[linear-gradient(135deg,#f5daa0_0%,#dfae57_52%,#f7e3bb_100%)] hover:text-[#11161c] active:scale-95 h-14">
                    <Link to="/register" className="text-[#11161c] hover:text-[#11161c]">Get Started Now</Link>
                  </Button>
                </motion.div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                {[
                  { step: "01", title: "Consultation", desc: "Book online. We visit for measurements or meet to discuss your vision." },
                  { step: "02", title: "Design & Costing", desc: "Receive CAD blueprints and transparent cost breakdowns for approval." },
                  { step: "03", title: "Fabrication", desc: "Watch your project come to life with real-time progress updates." },
                  { step: "04", title: "Delivery", desc: "Professional installation with final quality check and handover." }
                ].map((item, idx) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 70 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={{ rotateX: -2, rotateY: 2, z: 15, transition: { type: 'spring', stiffness: 280, damping: 22 } }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 1, delay: 0.15 * idx, ease: SMOOTH_240 }}
                    style={{ transformPerspective: 800, transformStyle: 'preserve-3d' }}
                    className="group gpu-reveal"
                  >
                    <div className="bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-white/25 rounded-2xl md:rounded-3xl p-6 md:p-10 transition-[border-color,box-shadow] duration-500 flex flex-col md:flex-row gap-5 md:gap-10 hover:shadow-[0_8px_32px_rgba(255,255,255,0.03)]">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white via-[#e0e0e4] to-[#c8c8cc] text-black flex items-center justify-center text-xl font-bold tracking-tight shadow-lg shadow-white/10">
                          {item.step}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight mb-3 text-white group-hover:text-white transition-colors">{item.title}</h3>
                        <p className="text-[#86868b] text-base md:text-lg font-medium leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* Fabrication Collections */}
        <section ref={capabilitiesRef} id="capabilities" className="relative overflow-hidden bg-[linear-gradient(155deg,#0d1218_0%,#1a2430_20%,#d0b171_44%,#edf2f6_60%,#c0cad4_78%,#18202a_100%)] py-16 md:py-32">
          <div ref={projectsRef} id="projects" className="absolute inset-x-0 top-20 h-px" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="absolute -top-28 right-0 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_68%)] blur-3xl" />
          <div className="absolute -bottom-28 left-0 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(93,104,118,0.2)_0%,rgba(93,104,118,0)_70%)] blur-3xl" />
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9aa4b0] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9aa4b0] to-transparent" />

          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="mb-10 text-center md:mb-12 gpu-reveal"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f1d39d]/55 bg-[rgba(17,22,29,0.58)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#f4dcae] shadow-[0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Collections
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-6xl">
                <span className="text-[#1a212b] drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">Fabrication Collections</span>
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-sm font-medium leading-7 text-[#273544] md:text-lg">
                Each collection is presented like a premium portfolio track, so the landing page sells capability instead of feeling like a plain brochure.
              </p>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {SHOWCASE_COLLECTIONS.map((collection, index) => {
                  const isActiveCollection = index === activeCollectionIndex;

                  return (
                    <motion.button
                      key={collection.id}
                      type="button"
                      initial={{ opacity: 0, y: 60 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.12 }}
                      transition={{ duration: 0.9, delay: index * 0.08, ease: SMOOTH_240 }}
                      onClick={() => {
                        setActiveCollectionIndex(index);
                        setActiveProjectIndex(0);
                      }}
                      className={`group relative aspect-[16/11] overflow-hidden rounded-[2rem] border text-left shadow-[0_22px_50px_rgba(14,18,23,0.16)] transition-all duration-500 will-change-transform ${isActiveCollection ? 'border-[#f1f4f8]/70 ring-2 ring-white/55' : 'border-white/25 hover:-translate-y-1 hover:border-white/45'}`}
                    >
                      <img src={collection.coverImage} alt={collection.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] transform-gpu will-change-transform" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,18,23,0.04)_0%,rgba(14,18,23,0.1)_45%,rgba(14,18,23,0.48)_100%)]" />
                      <div className="absolute left-5 bottom-5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/92 backdrop-blur-sm md:left-6 md:bottom-6">
                        {collection.label}
                      </div>
                      <div className="absolute right-5 top-5 rounded-full border border-white/16 bg-white/10 p-2 text-white/85 backdrop-blur-sm md:right-6 md:top-6">
                        <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isActiveCollection ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
          </div>
        </section>

        <AnimatePresence initial={false}>
          {activeCollection && activeProject && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 lg:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: SMOOTH_240 }}
              onClick={() => {
                setActiveCollectionIndex(null);
                setActiveProjectIndex(null);
              }}
            >
              <motion.div className="absolute inset-0 bg-[rgba(6,8,12,0.78)] backdrop-blur-xl" />

              <motion.div
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.985 }}
                transition={{ duration: 0.3, ease: SMOOTH_240 }}
                onClick={(event) => event.stopPropagation()}
                className="modal-gallery-scroll relative z-10 flex max-h-[94vh] w-full max-w-[72rem] flex-col overflow-y-auto overflow-x-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(88,97,110,0.12),transparent_30%),linear-gradient(160deg,#12161c_0%,#090b10_48%,#171d26_100%)] shadow-[0_36px_120px_rgba(0,0,0,0.56)] transform-gpu will-change-transform"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveCollectionIndex(null);
                    setActiveProjectIndex(null);
                  }}
                  className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/34 text-white/88 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/50"
                  aria-label="Close image preview"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="relative aspect-[16/8.6] overflow-hidden bg-black">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeProject.image}
                      src={activeProject.image}
                      alt={activeProject.title}
                      className="absolute inset-0 h-full w-full object-cover transform-gpu will-change-transform"
                      initial={{ opacity: 0, scale: 1.018 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.992 }}
                      transition={{ duration: 0.28, ease: SMOOTH_240 }}
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,16,0.04)_0%,rgba(9,11,16,0.08)_44%,rgba(9,11,16,0.8)_100%)]" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/16 bg-black/22 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/88 backdrop-blur-md sm:left-6 sm:top-6">
                    {activeCollection.label}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0.01)_100%)] p-4 sm:p-5 lg:p-6">
                  <div className="mb-4 border-b border-white/8 pb-4">
                    <h3 className="text-[1.7rem] font-bold tracking-tight text-white sm:text-[1.95rem] lg:text-[2.1rem]">{activeProject.title}</h3>
                    <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-[#adb7c3]">
                      <MapPin className="h-4 w-4" />
                      {activeProject.location}
                    </p>
                    <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-[#d4dbe3] sm:text-[15px]">
                      {activeProject.description}
                    </p>
                  </div>

                  <div className="min-h-0">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#96a1ad]">Image carousel</p>
                      <p className="text-xs font-medium text-[#7f8a97]">Select an image to update the preview.</p>
                    </div>
                    <div className="grid auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto pb-1 snap-x snap-mandatory no-scrollbar sm:auto-cols-[33%] lg:auto-cols-[24%]">
                      {activeCollection.projects.map((project, index) => {
                        const isSelected = activeProjectIndex === index;

                        return (
                          <button
                            key={`${activeCollection.id}-${project.title}`}
                            type="button"
                            onClick={() => setActiveProjectIndex(index)}
                            className={`group relative snap-start overflow-hidden rounded-[1.35rem] border text-left transition-all duration-300 transform-gpu will-change-transform ${isSelected ? 'scale-[0.985] border-[#f3f6fb]/60 bg-white/[0.06] shadow-[0_18px_42px_rgba(0,0,0,0.4)] ring-1 ring-white/18' : 'border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/[0.04]'}`}
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img src={project.image} alt={project.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 transform-gpu will-change-transform" />
                              <div className={`absolute inset-0 transition-all duration-300 ${isSelected ? 'bg-[linear-gradient(180deg,rgba(9,11,16,0.02)_0%,rgba(9,11,16,0.5)_100%)]' : 'bg-[linear-gradient(180deg,rgba(9,11,16,0.08)_0%,rgba(9,11,16,0.64)_100%)]'}`} />
                              <div className={`absolute inset-0 ring-1 ring-inset transition-opacity duration-300 ${isSelected ? 'ring-white/30' : 'ring-white/0 group-hover:ring-white/12'}`} />
                              <div className="absolute inset-x-0 bottom-0 p-3">
                                <div className="flex items-end justify-between gap-3">
                                  <p className="text-[11px] font-semibold leading-4 text-white/92">{project.title}</p>
                                  <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]' : 'bg-white/40'}`} />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sectors We Serve */}
        <section ref={sectorsRef} className="relative overflow-hidden bg-[linear-gradient(145deg,#121821_0%,#1f2a37_18%,#d5b573_42%,#e7edf2_62%,#ccd5dd_78%,#19212b_100%)] py-16 md:py-24">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          {/* Blueprint grid decoration */}
          <div className="absolute -bottom-4 -right-4 w-[180px] md:w-[240px] pointer-events-none hidden md:block">
            <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.06]">
              <rect x="20" y="20" width="200" height="200" stroke="#5a5a60" strokeWidth="0.6" fill="none" />
              <line x1="20" y1="120" x2="220" y2="120" stroke="#5a5a60" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="120" y1="20" x2="120" y2="220" stroke="#5a5a60" strokeWidth="0.4" strokeDasharray="4 3" />
              <line x1="70" y1="20" x2="70" y2="220" stroke="#5a5a60" strokeWidth="0.3" strokeDasharray="3 3" />
              <line x1="170" y1="20" x2="170" y2="220" stroke="#5a5a60" strokeWidth="0.3" strokeDasharray="3 3" />
              <line x1="20" y1="70" x2="220" y2="70" stroke="#5a5a60" strokeWidth="0.3" strokeDasharray="3 3" />
              <line x1="20" y1="170" x2="220" y2="170" stroke="#5a5a60" strokeWidth="0.3" strokeDasharray="3 3" />
              <text x="120" y="235" textAnchor="middle" fill="#5a5a60" fontSize="7" fontFamily="monospace">GRID REF — 50mm</text>
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="mb-16 gpu-reveal"
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl"><span className="text-[#18202a] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">Sectors We Serve</span></h2>
              <p className="text-base font-medium text-[#253544] md:text-xl">Trusted by businesses across diverse industries in the food and hospitality sector.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Utensils, label: "Restaurants" },
                { icon: ShoppingBag, label: "Shopping Malls" },
                { icon: Store, label: "Food Courts" },
                { icon: Coffee, label: "Bakeries & Cafés" },
                { icon: Truck, label: "Fast Food Outlets" },
                { icon: HeartPulse, label: "Hospital Food Outlets" },
                { icon: Home, label: "Residentials" },
                { icon: Hotel, label: "Hotels & Resorts F&B" },
              ].map((sector, i) => (
                <motion.div
                  key={sector.label}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ rotateX: -4, rotateY: 4, z: 15, scale: 1.04, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.9, delay: 0.08 * i, ease: SMOOTH_240 }}
                  style={{ transformPerspective: 600, transformStyle: 'preserve-3d' }}
                  className="gpu-reveal flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/26 bg-[linear-gradient(145deg,rgba(255,255,255,0.82)_0%,rgba(240,227,197,0.92)_24%,rgba(213,223,232,0.9)_62%,rgba(255,255,255,0.78)_100%)] p-5 shadow-[0_18px_40px_rgba(13,18,24,0.14)] transition-[border-color,box-shadow,transform] duration-300 group hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(13,18,24,0.2)] md:rounded-3xl md:p-8"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5cb95]/55 bg-[linear-gradient(145deg,#121821_0%,#243243_100%)] text-[#f3d79f] shadow-[0_10px_26px_rgba(10,14,20,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:text-white md:h-12 md:w-12 md:rounded-2xl">
                    <sector.icon className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] text-center">{sector.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section ref={testimonialsRef} id="testimonials" className="relative py-16 md:py-32 bg-gradient-to-br from-[#1a1a1c] via-[#0d0d0f] to-[#1d1d1f] text-white overflow-hidden">
          <motion.div style={{ scale: testimonialsGlowScale }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(180,180,190,0.04)_0%,transparent_60%)] pointer-events-none will-change-transform" />
          {/* Blueprint circle decoration */}
          <div className="absolute bottom-8 left-8 w-[140px] md:w-[180px] pointer-events-none hidden lg:block">
            <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.04]">
              <circle cx="90" cy="90" r="80" stroke="#a0a0a6" strokeWidth="0.6" />
              <circle cx="90" cy="90" r="55" stroke="#a0a0a6" strokeWidth="0.4" />
              <circle cx="90" cy="90" r="30" stroke="#a0a0a6" strokeWidth="0.5" />
              <line x1="10" y1="90" x2="170" y2="90" stroke="#a0a0a6" strokeWidth="0.3" strokeDasharray="4 3" />
              <line x1="90" y1="10" x2="90" y2="170" stroke="#a0a0a6" strokeWidth="0.3" strokeDasharray="4 3" />
              <text x="90" y="178" textAnchor="middle" fill="#a0a0a6" fontSize="6" fontFamily="monospace">SEAL DETAIL</text>
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="text-center mb-20 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-4"><span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(145deg, #7a7a80 0%, #e0e0e4 15%, #9a9a9f 30%, #d0d0d5 45%, #c8c8cd 55%, #8e8e93 65%, #e0e0e4 80%, #a8a8ad 90%, #c5c5ca 100%)' }}>What Our Clients Say</span></h2>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-[#86868b]">Hear from business owners who trust RMV for their fabrication needs.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { 
                  text: "RMV delivered our complete kitchen setup ahead of schedule. The stainless steel work is top quality and the team was very professional throughout the entire process.",
                  author: "Restaurant Owner",
                  biz: "Korean Restaurant, Quezon City"
                },
                { 
                  text: "From planning to installation, everything was handled seamlessly. The kitchen layout they designed improved our workflow significantly. Highly recommended!",
                  author: "Hotel Manager",
                  biz: "Hotel F&B, Albay"
                },
                { 
                  text: "We had multiple stalls fabricated by RMV and every single one was done with excellent craftsmanship. Affordable pricing and on-time delivery.",
                  author: "Food Court Operator",
                  biz: "Food Stalls, Fairview Terraces"
                }
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 70 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ rotateX: -3, rotateY: 3, z: 20, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 1, delay: 0.15 * i, ease: SMOOTH_240 }}
                  style={{ transformPerspective: 800, transformStyle: 'preserve-3d' }}
                  className="gpu-reveal bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-10 flex flex-col justify-between hover:border-white/20 transition-[border-color] duration-500"
                >
                  <div>
                    <Quote className="h-8 w-8 md:h-10 md:w-10 text-[#86868b] mb-4 md:mb-6 opacity-30 fill-current" />
                    <p className="text-base md:text-lg text-white/90 leading-relaxed font-medium mb-8 md:mb-10">"{testimonial.text}"</p>
                  </div>
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[1,2,3,4,5].map(star => <Star key={star} className="h-4 w-4 fill-white text-white" />)}
                    </div>
                    <p className="font-semibold text-white tracking-tight mb-1">{testimonial.author}</p>
                    <p className="text-[#86868b] text-sm">{testimonial.biz}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Purpose */}
        <section ref={purposeRef} className="relative overflow-hidden bg-[linear-gradient(165deg,#f2e3bb_0%,#e9edf2_18%,#d8e0e7_50%,#cfd7df_74%,#17202a_100%)] py-16 md:py-24">
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          {/* Blueprint dimension decoration */}
          <div className="absolute top-6 left-6 w-[160px] md:w-[200px] pointer-events-none hidden md:block">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.06]">
              <path d="M10 190 L10 10 L190 10" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <line x1="10" y1="10" x2="190" y2="190" stroke="#5a5a60" strokeWidth="0.4" strokeDasharray="5 3" />
              <circle cx="100" cy="100" r="40" stroke="#5a5a60" strokeWidth="0.6" />
              <circle cx="100" cy="100" r="5" fill="#5a5a60" fillOpacity="0.08" stroke="#5a5a60" strokeWidth="0.5" />
              <text x="100" y="195" textAnchor="middle" fill="#5a5a60" fontSize="7" fontFamily="monospace">DATUM A</text>
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="mb-16 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-4"><span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(145deg, #4a4a4e 0%, #1d1d1f 15%, #6e6e73 30%, #2d2d2f 45%, #8e8e93 55%, #3a3a3e 65%, #1d1d1f 80%, #5a5a5e 90%, #2d2d2f 100%)' }}>Our Purpose</span></h2>
              <p className="text-base md:text-xl font-medium text-[#6e6e73]">What drives us every day in the workshop and on-site.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ rotateX: -3, rotateY: 3, z: 20, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1, ease: SMOOTH_240 }}
                style={{ transformPerspective: 800, transformStyle: 'preserve-3d' }}
                className="gpu-reveal rounded-2xl border border-white/24 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(243,227,191,0.86)_20%,rgba(224,232,239,0.9)_64%,rgba(255,255,255,0.84)_100%)] p-7 shadow-[0_18px_40px_rgba(12,16,22,0.12)] transition-[border-color,background,box-shadow] duration-300 hover:shadow-[0_24px_48px_rgba(12,16,22,0.18)] md:rounded-[2rem] md:p-10"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e2c587] bg-[linear-gradient(145deg,#11171f_0%,#253140_100%)] text-[#f4d79f] shadow-[0_12px_28px_rgba(10,14,20,0.18)]">
                    <Star className="h-5 w-5 text-[#f4d79f]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1d1d1f]">Our Mission</h3>
                </div>
                <p className="text-[#6e6e73] text-base md:text-lg font-medium leading-relaxed">
                  We are committed to delivering quality manufacturing services to our customers, fostering an environment of continuous growth for both our customers and investors.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ rotateX: -3, rotateY: 3, z: 20, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1, delay: 0.2, ease: SMOOTH_240 }}
                style={{ transformPerspective: 800, transformStyle: 'preserve-3d' }}
                className="gpu-reveal rounded-2xl border border-white/24 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(243,227,191,0.86)_20%,rgba(224,232,239,0.9)_64%,rgba(255,255,255,0.84)_100%)] p-7 shadow-[0_18px_40px_rgba(12,16,22,0.12)] transition-[border-color,background,box-shadow] duration-300 hover:shadow-[0_24px_48px_rgba(12,16,22,0.18)] md:rounded-[2rem] md:p-10"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e2c587] bg-[linear-gradient(145deg,#11171f_0%,#253140_100%)] text-[#f4d79f] shadow-[0_12px_28px_rgba(10,14,20,0.18)]">
                    <Layers className="h-5 w-5 text-[#f4d79f]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1d1d1f]">Our Vision</h3>
                </div>
                <p className="text-[#6e6e73] text-base md:text-lg font-medium leading-relaxed">
                  Aspiring to be a world-class manufacturer, we aim to produce quality, custom, precision parts and fabrications that surpass customer expectations. Our success lies in providing on-time or early deliveries, affordable prices, and innovative ideas, services, and solutions that enhance our customers' products and businesses.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section ref={ctaRef} className="relative overflow-hidden bg-[linear-gradient(145deg,#081019_0%,#13202d_18%,#243445_42%,#d4b16e_70%,#f1dfb5_100%)] py-20 md:py-32">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          {/* Blueprint corner decoration */}
          <div className="absolute bottom-4 left-4 w-[160px] md:w-[220px] pointer-events-none hidden md:block">
            <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto opacity-[0.06]">
              <path d="M20 200 L20 20 L200 20" stroke="#5a5a60" strokeWidth="0.8" fill="none" />
              <path d="M40 180 L40 40 L180 40" stroke="#5a5a60" strokeWidth="0.5" strokeDasharray="5 3" fill="none" />
              <circle cx="20" cy="20" r="10" stroke="#5a5a60" strokeWidth="0.6" />
              <line x1="10" y1="210" x2="210" y2="210" stroke="#5a5a60" strokeWidth="0.6" />
              <line x1="10" y1="207" x2="10" y2="213" stroke="#5a5a60" strokeWidth="0.6" />
              <line x1="210" y1="207" x2="210" y2="213" stroke="#5a5a60" strokeWidth="0.6" />
              <text x="110" y="220" textAnchor="middle" fill="#5a5a60" fontSize="7" fontFamily="monospace">200mm REF</text>
            </svg>
          </div>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,213,151,0.22)_0%,rgba(155,177,202,0.12)_34%,transparent_66%)] blur-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="gpu-reveal"
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tighter sm:text-4xl md:mb-6 md:text-7xl"><span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#f8edd2 0%,#e5edf6 16%,#9eb6cf 34%,#f3d89d 58%,#fff4da 78%,#dce7f1 100%)' }}>Start your build.</span></h2>
              <p className="mx-auto mb-8 max-w-2xl text-base font-medium text-[#e2e9f0] sm:text-xl md:mb-10 md:text-2xl">Access the portal to manage quotes, track projects, and communicate directly with the workshop.</p>
              <div className="mx-auto mb-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3 md:mb-10">
                {[
                  'Project milestones stay visible from approval to turnover.',
                  'Collections and sectors now read like a premium fabrication catalog.',
                  'The visual language aligns better with engineered stainless work.',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium leading-6 text-[#f0f4f8] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="h-14 rounded-full bg-[linear-gradient(135deg,#e2b566_0%,#c38a37_48%,#f1d49a_100%)] px-8 text-base font-semibold text-[#11161c] transition-all duration-300 hover:scale-105 hover:brightness-105 hover:bg-[linear-gradient(135deg,#ebc274_0%,#cf943f_48%,#f5ddb0_100%)] hover:text-[#11161c] active:scale-95 md:h-16 md:px-10 shadow-[0_16px_40px_rgba(186,131,49,0.28)]">
                  <Link to="/register" className="text-[#11161c] hover:text-[#11161c]">Create Account</Link>
                </Button>
                <Button asChild className="h-14 rounded-full border border-white/18 bg-white/10 px-8 text-base font-semibold text-[#f4f6f8] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/16 active:scale-95 md:h-16 md:px-10 shadow-[0_12px_30px_rgba(4,7,12,0.24)]">
                  <a href="mailto:rmvstainless@gmail.com" className="text-[#f4f6f8]">Contact Sales</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Global Footer based on exact details */}
        <footer id="contact" className="relative border-t border-white/10 bg-[linear-gradient(145deg,#0a1016_0%,#16202b_24%,#243445_48%,#101822_100%)] pt-16 pb-10 text-white md:pt-20 md:pb-12">
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
              
              <div className="space-y-4 md:space-y-6 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <BrandLogo className="h-7 w-7 text-[#f3f6f9] md:h-8 md:w-8" />
                  <span className="text-base font-bold tracking-tight text-[#f3f6f9] md:text-lg">RMV Stainless Steel Fabrication</span>
                </div>
                <p className="pr-4 text-sm font-medium leading-relaxed text-[#c3ced8]">
                  Precision stainless steel fabrication for residential and commercial industries.<br/>
                  Quality you can trust.
                </p>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#f6d69e] md:mb-6">Services</h4>
                <ul className="space-y-3 md:space-y-4">
                  {['Kitchen SS Fabrication', 'Kitchen Remodeling', 'LPG Gas Pipeline', 'Fire Suppression', 'Exhaust Systems', 'Railings'].map(link => (
                    <li key={link}><button type="button" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} className="cursor-pointer text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">{link}</button></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#f6d69e] md:mb-6">Company</h4>
                <ul className="space-y-3 md:space-y-4">
                  <li><button type="button" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="cursor-pointer text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">About Us</button></li>
                  <li><button type="button" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })} className="cursor-pointer text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">Projects</button></li>
                  <li><button type="button" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="cursor-pointer text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">Contact</button></li>
                  <li><Link to="/privacy" className="text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="text-sm font-medium text-[#c3ced8] transition-colors hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#f6d69e] md:mb-6">Contact</h4>
                <ul className="space-y-3 md:space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-[#f6d69e]" />
                    <span className="text-sm font-medium text-[#c3ced8]">BIR Village, Novaliches, Quezon City, Philippines 1118</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-[#f6d69e]" />
                    <span className="text-sm font-medium text-[#c3ced8]">02-9506187<br/>0945 285 2974</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-[#f6d69e]" />
                    <span className="text-sm font-medium text-[#c3ced8]">rmvstainless@gmail.com</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Interactive Google Map */}
            <div className="mb-10 h-[250px] w-full overflow-hidden rounded-2xl border border-white/12 shadow-[0_20px_48px_rgba(0,0,0,0.28)] transition-all duration-700 hover:grayscale-0 md:mb-12 md:h-[300px] md:rounded-3xl grayscale">
              <iframe
                title="RMV Stainless Steel Fabrication Location"
                src="https://maps.google.com/maps?q=Natanawan+Residence,+Dahlia+Ext,+Quezon+City,+Metro+Manila&z=17&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
              <p className="text-sm font-medium text-[#c3ced8]">
                &copy; {new Date().getFullYear()} RMV Stainless Steel Fabrication. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <Link to="/privacy" className="text-[#c3ced8] transition-colors hover:text-white">Privacy Policy</Link>
                  <Link to="/terms" className="text-[#c3ced8] transition-colors hover:text-white">Terms of Service</Link>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#c3ced8]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  All Systems Operational
                </div>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </LazyMotion>
  );
}
