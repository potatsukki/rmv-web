import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { Link } from 'react-router-dom';
import {
  Factory,
  Building2,
  ArrowRight,
  X,
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Store,
  Hotel,
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Quote,
  Maximize,
  Layers,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, LazyMotion, domAnimation, AnimatePresence, useScroll, useTransform } from 'framer-motion';

// Ultra-smooth 240Hz-optimized ease — gentle acceleration, long organic deceleration
const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SECTION_TRANSITION = { duration: 0.9, ease: SMOOTH_240 };

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

const SHOWCASE_COLLECTIONS: CollectionData[] = [
  {
    id: 'completed-works',
    label: 'Completed Works',
    headline: 'Commercial Kitchens & HVAC Systems',
    shortDescription: 'Professional stainless steel fabrication for kitchens, ductwork, and overhead ventilation systems.',
    capabilityDescription: 'Complete commercial kitchen installations featuring custom fabrication, professional-grade ductwork, and full HVAC integration for restaurants and commercial food operations.',
    bestFor: 'Restaurants, commercial kitchens, and hospitality establishments.',
    scopeNote: 'From design through installation, including stainless counters, exhaust systems, and integrated ventilation.',
    coverImage: '/landing/completed-works/cover.png',
    tags: ['Commercial Grade', 'Ventilation Ready', 'Installation Included'],
    systems: ['Stainless counters', 'Ductwork fabrication', 'Exhaust hoods', 'Ventilation integration'],
    icon: Layers,
    projects: [
      {
        title: 'Professional Exhaust & Ducting',
        location: 'Commercial Kitchen',
        image: '/landing/completed-works/cover.png',
        description: 'Comprehensive overhead ventilation and ductwork installation, featuring custom-fabricated stainless steel hoods and professional-grade air extraction systems.',
      },
      {
        title: 'Commercial Kitchen Workstations',
        location: 'Metro Manila',
        image: '/landing/completed-works/project-1.jpg',
        description: 'Complete commercial kitchen layout featuring heavy-duty stainless steel shelving, custom workstations, and integrated stove units for high-efficiency food production.',
      },
      {
        title: 'Ceiling & Ventilation Infrastructure',
        location: 'Quezon City',
        image: '/landing/completed-works/project-2.png',
        description: 'Advanced kitchen ventilation setup featuring professional-grade exhaust hoods, ceiling-integrated ductwork, and specialized air filtration systems.',
      },
      {
        title: 'Stainless Steel Kitchen Build',
        location: 'Laguna',
        image: '/landing/completed-works/project-3.png',
        description: 'Full-scale stainless steel fabrication for industrial kitchens, including custom preparation tables, wall shelving, and integrated safety equipment.',
      },
    ],
  },
  {
    id: 'food-stall-works',
    label: 'Food Stall Works',
    headline: 'Food Stalls & Retail Food Service',
    shortDescription: 'Compact, efficient stainless steel food service counters and stall systems for food courts and retail operations.',
    capabilityDescription: 'Purpose-built food stall and kiosk solutions featuring branded signage, display cases, serving counters, and storage integration for maximum functionality in minimal space.',
    bestFor: 'Food courts, shopping malls, street vendors, and small food service operations.',
    scopeNote: 'Complete stall setup including counter fabrication, branding, and customer-facing design.',
    coverImage: '/landing/food-stall-works/cover.png',
    tags: ['Retail Ready', 'Branded Design', 'Compact Layout'],
    systems: ['Service counters', 'Display cases', 'Stainless fabrication', 'Custom signage'],
    icon: Store,
    projects: [
      {
        title: 'Hungry Bik Food Stall',
        location: 'Food Court',
        image: '/landing/food-stall-works/cover.png',
        description: 'Complete branded food stall featuring vibrant signage, professional serving counter with integrated storage, and custom stainless steel food preparation areas.',
      },
      {
        title: 'Mango on the Go Kiosk',
        location: 'Shopping Mall',
        image: '/landing/food-stall-works/project-1.png',
        description: 'Vibrant branded kiosk featuring custom serving counters, integrated display areas, and stainless steel preparation surfaces for specialty beverage service.',
      },
      {
        title: 'Pamiyan\'s Burmese Food Stall',
        location: 'Food Center',
        image: '/landing/food-stall-works/project-2.png',
        description: 'Professional retail food stall featuring high-contrast branding, custom-fabricated stainless service counters, and integrated overhead lighting for maximum visibility.',
      },
      {
        title: 'Ranile\'s Best Bulaluhan',
        location: 'Retail Location',
        image: '/landing/food-stall-works/project-3.png',
        description: 'Full-service food stall setup featuring an expansive menu board system, custom stainless workstations, and integrated storage for high-volume retail environments.',
      },
    ],
  },
  {
    id: 'gasline-fire-suppression',
    label: 'Gasline & Fire Suppression',
    headline: 'Gasline, Fire Suppression & Industrial Installation',
    shortDescription: 'Expert fabrication and installation of gas systems, fire suppression equipment, and specialized industrial piping.',
    capabilityDescription: 'Complete utility infrastructure solutions including certified gasline installations, fire suppression system setup, and industrial piping fabrication for commercial and industrial facilities.',
    bestFor: 'Commercial buildings, restaurants, kitchens, and industrial facilities requiring safety systems.',
    scopeNote: 'Certified installations meeting all safety codes and regulations for gas and fire suppression systems.',
    coverImage: '/landing/gasline-fire-suppression/cover.png',
    tags: ['Safety Certified', 'Industrial Grade', 'Code Compliant'],
    systems: ['Gasline installation', 'Fire suppression setup', 'Pressure piping', 'Safety systems'],
    icon: Maximize,
    projects: [
      {
        title: 'Internal Gasline Distribution',
        location: 'Commercial Kitchen',
        image: '/landing/gasline-fire-suppression/cover.png',
        description: 'Precision-engineered internal gas distribution system featuring low-profile piping, professional surface mounting, and integrated safety shut-off controls.',
      },
      {
        title: 'Exterior Gasline Installation',
        location: 'Industrial Site',
        image: '/landing/gasline-fire-suppression/project-1.png',
        description: 'Professional-grade exterior gasline fabrication using heavy-duty piping and certified mounting systems, ensuring full compliance with safety standards.',
      },
      {
        title: 'Industrial Pressure Testing',
        location: 'Testing Phase',
        image: '/landing/gasline-fire-suppression/project-2.png',
        description: 'Rigorous pressure testing and calibration for gas and liquid distribution systems, using certified gauges to ensure system integrity and safety.',
      },
      {
        title: 'Automated Fire Suppression',
        location: 'Operational Area',
        image: '/landing/gasline-fire-suppression/project-3.png',
        description: 'Specialized fire suppression system featuring high-capacity pressure vessels, professional mounting, and integrated piping for high-risk commercial environments.',
      },
    ],
  }
];

/** Labels match on-page headings (Design Collections cards, workflow, sectors). */
const FOOTER_SERVICE_LINKS: { label: string; href: string }[] = [
  ...SHOWCASE_COLLECTIONS.map((c) => ({ label: c.label, href: `#${c.id}` })),
  { label: 'Streamlined Workflow', href: '#workflow' },
  { label: 'Sectors We Serve', href: '#sectors' },
];

export function LandingPage() {
  useAuthStore();
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

  // About section anchor
  const aboutRef = useRef<HTMLDivElement>(null);

  // Workflow section parallax
  const workflowRef = useRef<HTMLDivElement>(null);

  // Section refs for scroll anchoring
  const capabilitiesRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  // Testimonials section parallax
  const testimonialsRef = useRef<HTMLDivElement>(null);

  const ctaRef = useRef<HTMLDivElement>(null);
  
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
      <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a202a] font-sans text-white/90 selection:bg-white/20 selection:text-white">
        
        {/* Navigation */}
        <PublicNavbar />

        {/* Hero Section */}
        <section ref={heroWrapperRef} id="hero" className="blueprint-grid relative flex min-h-screen items-center overflow-hidden border-b border-white/10 bg-[#0a0a0b]">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(245,232,196,0.18)_0%,rgba(245,232,196,0)_100%)] pointer-events-none" />
          <div className="absolute inset-y-0 left-[12%] w-px bg-[linear-gradient(180deg,transparent_0%,rgba(233,194,115,0.3)_16%,rgba(233,194,115,0.08)_82%,transparent_100%)] pointer-events-none hidden xl:block" />
          <div className="absolute inset-y-0 right-[12%] w-px bg-[linear-gradient(180deg,transparent_0%,rgba(173,194,217,0.26)_16%,rgba(173,194,217,0.08)_82%,transparent_100%)] pointer-events-none hidden xl:block" />
          {/* Soft center glow — parallax layer */}
          <motion.div
            style={{ scale: heroGlowScale, opacity: heroGlowOpacity }}
            className="absolute right-[-8%] top-[44%] h-[760px] w-[760px] -translate-y-1/2 bg-[radial-gradient(circle,rgba(241,212,154,0.16)_0%,rgba(187,142,59,0.07)_28%,transparent_62%)] pointer-events-none will-change-transform md:h-[1100px] md:w-[1100px]"
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
            className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 pt-24 text-center items-center will-change-transform lg:px-12"
          >
            <motion.h1
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: SMOOTH_240 }}
              className="headline-font mb-12 py-2 text-[clamp(2.5rem,10.2vw,8.3rem)] font-bold leading-[0.86] tracking-[-0.02em] gpu-reveal"
            >
              <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-sm">Precision</span><br />
              <span className="text-shimmer italic font-light">Engineering</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: SMOOTH_240 }}
              className="mb-3 max-w-2xl px-2 text-[18px] md:text-[22px] font-medium tracking-normal text-white/90 gpu-reveal"
            >
              Uncompromising quality in every weld.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: SMOOTH_240 }}
              className="mb-8 max-w-xl px-4 text-[15px] md:text-[16px] font-normal text-white/70 gpu-reveal"
            >
              Manage your fabrication project with clearer approvals, payment tracking, and progress updates from start to finish.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: SMOOTH_240 }}
              className="flex w-full flex-col gap-4 overflow-visible pb-10 gpu-reveal sm:w-auto sm:flex-row"
            >
              <Button asChild style={{ background: 'linear-gradient(135deg, #c9a96f 0%, #e2cba1 50%, #b89552 100%)' }} className="label-font brass-gradient group relative h-14 w-full overflow-hidden rounded-none border-none px-12 text-[11px] font-black uppercase tracking-[0.3em] text-[#1A1600] transition-transform hover:translate-x-1 active:scale-95 sm:w-auto md:h-14">
                <Link to="/register">
                  <span className="relative z-10 flex items-center">
                    Commission a Project
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
              <Button asChild style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' }} className="label-font h-14 w-full rounded-none border border-white/20 bg-transparent px-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white shadow-none transition-colors hover:bg-white/5 active:scale-95 sm:w-auto md:h-14">
                <a href="#capabilities">Explore Services</a>
              </Button>
            </motion.div>

          </motion.div>

          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(20,26,34,0)_0%,rgba(20,26,34,0.3)_100%)] pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 h-px w-[min(82vw,76rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f0d7a1]/70 to-transparent" />
        </section>

        <section className="relative border-y border-white/5 bg-[#141416] py-32">
          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: SMOOTH_240 }}
              className="grid gap-0 border border-white/10 md:grid-cols-3"
            >
              {[
                {
                  id: '01 / Technical',
                  title: 'Blueprint Approvals',
                  detail: 'Review technical CAD drawings and sign off digitally before first strike. Precision starts at the draft.',
                },
                {
                  id: '02 / Financial',
                  title: 'Payment Tracking',
                  detail: 'Milestone-based billing with full transparency. Every project phase documented for absolute fiscal clarity.',
                },
                {
                  id: '03 / Visibility',
                  title: 'Real-time Progress',
                  detail: 'Continuous status updates from the fabrication floor. Watch your vision take form in real-time.',
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`group p-12 transition-colors hover:bg-white/[0.02] ${index < 2 ? 'border-b border-white/10 md:border-b-0 md:border-r' : ''}`}
                >
                  <p className="label-font mb-12 text-[10px] font-bold uppercase tracking-[0.42em] text-[#FFD700] gold-glow">{item.id}</p>
                  <h3 className="headline-font mb-6 text-3xl font-bold tracking-tight text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/55">{item.detail}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
                {/* Built on Trust — reference: gold dual-frame image, gold label, 2×2 feature grid with gold rules */}
        <section ref={aboutRef} id="about" className="relative overflow-hidden border-t border-[#d4af37]/15 bg-black py-24 md:py-32 lg:py-36">
          <div className="mx-auto max-w-[86rem] px-6 lg:px-8">
            <div className="grid items-center gap-14 md:grid-cols-2 md:gap-16 lg:gap-24">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="relative mx-auto w-full max-w-[32rem] md:mx-0"
              >
                <div className="relative w-full overflow-visible">
                  <div
                    className="pointer-events-none absolute inset-0 z-0 border border-[#c9a227]/30"
                    style={{ transform: 'translate(-32px, 32px)' }}
                    aria-hidden
                  />
                  {/* Inner Frame with Image */}
                  <div className="relative z-10 aspect-[4/5] overflow-hidden border-[1.5px] border-[#d4af37] bg-black shadow-2xl">
                    <img
                      src="/image.png"
                      alt="RMV stainless fabrication showcase"
                      className="block h-full w-full object-cover object-center grayscale brightness-[0.82] contrast-[1.12]"
                      loading="lazy"
                    />
                    {/* Depth Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="relative min-w-0"
              >
                <p className="label-font mb-8 text-[10px] font-black uppercase tracking-[0.58em] text-[#d4af37]">
                  The Legacy of RMV
                </p>
                <h2 className="headline-font mb-10 text-5xl font-bold leading-[1.05] tracking-tighter text-white md:text-7xl">
                  Built on Trust, Delivered with <br />
                  <span className="text-shimmer italic font-light">
                    Precision
                  </span>
                </h2>
                <p className="mb-12 max-w-[54ch] text-base leading-[1.85] text-white/50 md:text-lg md:leading-[1.8]">
                  Established in 2018, RMV Fabrication has redefined the standard for heavy-duty manufacturing. Our shop is a
                  nexus where heritage craftsmanship meets cutting-edge automation, ensuring every project—from simple ducting to
                  complex HVAC systems—is a masterpiece of structural integrity.
                </p>

                <div className="grid grid-cols-2 border border-[#d4af37]/35">
                  {[
                    { title: 'Real-time tracking', note: 'Full visibility 24/7' },
                    { title: 'Transparent pricing', note: 'No hidden costs' },
                    { title: 'Quality inspections', note: 'ISO 9001 Standards' },
                    { title: 'Expert master team', note: 'Vetted professionals' },
                  ].map((item, index) => (
                    <div
                      key={item.title}
                      className={`px-5 py-6 sm:px-6 sm:py-8 ${index % 2 === 0 ? 'border-r border-[#d4af37]/35' : ''} ${index < 2 ? 'border-b border-[#d4af37]/35' : ''}`}
                    >
                      <p className="label-font text-[11px] font-black uppercase tracking-[0.26em] text-white">{item.title}</p>
                      <p className="mt-2 text-xs font-medium tracking-wide text-white/45">{item.note}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Sectors Marquee — Infinite loop showcasing served industries */}
        <section className="bg-black py-24 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={SECTION_TRANSITION}
            >
              <p className="label-font mb-6 text-[10px] font-bold uppercase tracking-[0.42em] text-[#FFD700] gold-glow">Industrial Reach</p>
              <h2 className="headline-font text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">Sectors We Serve</h2>
              <p className="max-w-2xl mx-auto text-lg leading-relaxed text-[#919097] font-light">
                Engineering a new standard for high-grade fabrication. We combine master-level machining with architectural vision to create structures that serve critical sectors.
              </p>
            </motion.div>
          </div>

          <div className="marquee-container py-4">
            <div className="marquee-content">
            {[...Array(3)].map((_, setIndex) => (
              <div key={setIndex} className="flex items-center gap-20 md:gap-32">
                {[
                  { icon: 'Utensils', label: 'Cuisine' },
                  { icon: 'ShoppingBag', label: 'Retail Centers' },
                  { icon: 'Hotel', label: 'Hospitality' },
                  { icon: 'Factory', label: 'Industrial' },
                  { icon: 'Building2', label: 'Corporate' },
                ].map((sector, i) => {
                  const Icon = ({ Utensils, ShoppingBag, Hotel, Factory, Building2 } as any)[sector.icon];
                  if (!Icon) return null;
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-6 group cursor-default">
                      <Icon className="h-8 w-8 text-[#FFD700] gold-glow transition-transform duration-500 group-hover:scale-110" />
                      <span className="label-font text-[9px] font-black uppercase tracking-[0.45em] text-white/50 transition-colors duration-300 group-hover:text-[#FFD700] group-hover:opacity-100">
                        {sector.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* Streamlined Workflow */}
        <section ref={workflowRef} id="workflow" className="relative overflow-hidden border-y border-white/5 bg-[#1d1d21] py-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={SECTION_TRANSITION}
              className="mb-20"
            >
              <p className="label-font mb-6 text-[10px] font-bold uppercase tracking-[0.42em] text-[#FFD700] gold-glow">Methodology</p>
              <h2 className="headline-font text-4xl font-bold tracking-tight text-white sm:text-5xl">The Engineered Workflow</h2>
            </motion.div>

            <div className="relative grid gap-6 md:grid-cols-4 md:items-start">
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-[#d4af37]/10 md:block" />
              {[
                { step: '01', title: 'Consultation', desc: 'Defining technical requirements and structural constraints for the build.' },
                { step: '02', title: 'Design & Costing', desc: 'Precision CAD drafting and detailed budgetary breakdowns for approval.' },
                { step: '03', title: 'Fabrication', desc: 'Execution on the shop floor with continuous quality control checks.' },
                { step: '04', title: 'Delivery', desc: 'Secure logistics and expert on-site installation by our master team.' },
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.08 * idx, ease: SMOOTH_240 }}
                  className={`group relative z-10 border border-[#d4af37]/25 bg-[#0f0f11] p-8 shadow-none transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#FFD700] hover:shadow-[0_0_24px_rgba(255,215,0,0.14)] ${idx % 2 === 1 ? 'md:mt-12' : ''}`}
                >
                  <span className="absolute right-4 top-4 text-4xl font-black text-[#c9a227] opacity-20 transition-all duration-300 group-hover:text-[#5c4f12] group-hover:opacity-90">
                    {item.step}
                  </span>
                  <h3 className="label-font mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors duration-300 group-hover:text-[#FFD700]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#a0a0a0] transition-colors duration-300 group-hover:text-[#b8b8b8]">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        {/* Design Collections — asymmetric portfolio grid (featured + stack + strip) */}
        <section ref={capabilitiesRef} id="capabilities" className="relative border-t border-[#d4af37]/15 bg-black py-24 md:py-32 lg:py-40">
          <div ref={projectsRef} id="projects" className="absolute inset-x-0 top-20 h-px" />

          <div className="mx-auto max-w-[86rem] px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-10 grid gap-8 md:mb-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,21rem)] lg:items-end lg:justify-between"
            >
              <div>
                <p className="label-font mb-5 text-[10px] font-black uppercase tracking-[0.48em] text-[#d4af37]">Portfolio</p>
                <h2 className="headline-font leading-[0.95]">
                  <span className="block text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">Design</span>
                  <span className="text-shimmer mt-1 block text-4xl font-light italic tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                    Collections
                  </span>
                </h2>
              </div>
              <p className="max-w-[26rem] text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-white/75 lg:justify-self-end lg:text-right lg:leading-snug">
                A curated exhibition of our technical capabilities and material mastery.
              </p>
            </motion.div>

            {(() => {
              const [featuredCollection, ...stackCollections] = SHOWCASE_COLLECTIONS;
              if (!featuredCollection) return null;
              const featuredIndex = 0;

              const collectionCardClasses = (isActive: boolean) =>
                `group relative w-full overflow-hidden border text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 ${
                  isActive
                    ? 'border-[#FFD700] shadow-[0_0_28px_rgba(255,215,0,0.12)]'
                    : 'border-[#d4af37]/70 hover:border-[#d4af37] hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                }`;

              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1.12fr)_minmax(0,0.88fr)] md:gap-6 md:min-h-[560px] lg:min-h-[620px]" data-layout-version="asym-v4">
                  <div className="flex h-full flex-col gap-4 md:col-start-1 md:row-span-2 md:row-start-1">
                    <div key={featuredCollection.id} id={featuredCollection.id} className="scroll-mt-24 md:scroll-mt-28 flex-1">
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.75 }}
                        onClick={() => {
                          setActiveCollectionIndex(featuredIndex);
                          setActiveProjectIndex(0);
                        }}
                        className={`${collectionCardClasses(featuredIndex === activeCollectionIndex)} relative h-full min-h-[300px] md:min-h-0`}
                      >
                        <img
                          src={featuredCollection.coverImage}
                          alt={featuredCollection.label}
                          className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                          <p className="label-font mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#d4af37]">Featured installation</p>
                          <h3 className="mb-5 max-w-[20ch] text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl lg:text-4xl">
                            {featuredCollection.headline}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {featuredCollection.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="border border-[#d4af37] bg-black/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      {[
                        { label: 'CAD Specs', icon: LayoutDashboard },
                        { label: 'Materiality', icon: Layers },
                        { label: 'QC Report', icon: Star },
                      ].map((cell) => (
                        <div
                          key={cell.label}
                          className="flex min-h-[5.5rem] flex-col justify-between border border-white/[0.08] bg-[#0a0a0a] p-4 md:min-h-[6.25rem] md:p-5"
                        >
                          <cell.icon className="h-4 w-4 text-[#d4af37] md:h-5 md:w-5" aria-hidden />
                          <p className="label-font text-[10px] font-bold uppercase tracking-[0.2em] text-white">{cell.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {stackCollections.map((collection, stackIdx) => {
                    const index = stackIdx + 1;
                    const isActiveCollection = index === activeCollectionIndex;
                    const subtitle =
                      collection.tags[0]?.toUpperCase() ?? collection.systems[0]?.toUpperCase() ?? 'Custom build';
                    const stackCardMinHeight = stackIdx === 0 ? 'min-h-[280px]' : 'min-h-[180px]';

                    return (
                      <div
                        key={collection.id}
                        id={collection.id}
                        className={`scroll-mt-24 md:scroll-mt-28 md:col-start-2 ${stackIdx === 0 ? 'md:row-start-1' : 'md:row-start-2'}`}
                      >
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.75, delay: 0.06 * stackIdx }}
                          onClick={() => {
                            setActiveCollectionIndex(index);
                            setActiveProjectIndex(0);
                          }}
                          className={`${collectionCardClasses(isActiveCollection)} relative ${stackCardMinHeight} h-full md:min-h-0`}
                        >
                          <img
                            src={collection.coverImage}
                            alt={collection.label}
                            className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/15 to-transparent" />
                          <div className="absolute bottom-0 left-0 p-5 md:p-6">
                            <p className="text-lg font-bold tracking-tight text-white md:text-xl">{collection.label}</p>
                            <p className="label-font mt-2 max-w-[28ch] text-[10px] font-semibold uppercase leading-snug tracking-[0.18em] text-white/65">
                              {subtitle}
                            </p>
                          </div>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>

        <AnimatePresence initial={false}>
          {activeCollection && activeProject && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setActiveCollectionIndex(null);
                setActiveProjectIndex(null);
              }}
            >
              <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                onClick={(event) => event.stopPropagation()}
                className="relative z-10 flex max-h-[92vh] w-full max-w-[82rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0b0d] shadow-[0_0_100px_rgba(0,0,0,0.8)] lg:max-h-[88vh]"
              >
                {/* Visual Header / Hero Area */}
                <div className="relative h-[45vh] min-h-[320px] w-full shrink-0 overflow-hidden bg-[#050505] lg:h-[62vh]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeProject.image}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center p-4 lg:p-8"
                    >
                      <img
                        src={activeProject.image}
                        alt={activeProject.title}
                        className="h-full w-full object-contain object-center brightness-[1.02] contrast-[1.02]"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Gentle Ambient Overlays */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0b0d]" />

                  {/* Top Bar Actions */}
                  <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-6 lg:p-10">
                    <div className="flex items-center gap-3">
                      <div className="h-px w-8 bg-[#c9a96f]" />
                      <span className="label-font text-[10px] font-black uppercase tracking-[0.4em] text-[#c9a96f]">
                        {activeCollection.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCollectionIndex(null);
                        setActiveProjectIndex(null);
                      }}
                      className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl transition-all hover:bg-[#c9a96f] hover:text-black"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0b0d] px-6 py-10 lg:px-14 lg:py-16">
                  <div className="mx-auto max-w-5xl space-y-16">
                    {/* Primary Details Row */}
                    <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-20">
                      <div className="space-y-10">
                        <div>
                          <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="headline-font text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl"
                          >
                            {activeProject.title}
                          </motion.h3>
                          <div className="mt-6 flex items-center gap-3 text-[#c9a96f]">
                            <MapPin className="h-4 w-4" />
                            <span className="label-font text-[11px] font-bold uppercase tracking-[0.2em]">
                              {activeProject.location}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="h-px w-20 bg-white/10" />
                          <p className="text-lg leading-relaxed text-white/50 md:text-xl lg:leading-[1.7]">
                            {activeProject.description}
                          </p>
                        </div>
                      </div>

                      {/* Technical Specs Tags in sidebar row */}
                      <div className="flex flex-wrap gap-3 lg:max-w-[240px] lg:flex-row">
                        {activeCollection.tags.map((tag) => (
                          <span key={tag} className="border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Landscape Gallery */}
                    <div className="space-y-8 pt-8">
                      <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <p className="label-font text-[10px] font-black uppercase tracking-[0.5em] text-[#c9a96f]">
                          Gallery Selection
                        </p>
                        <span className="text-[10px] font-medium text-white/20">
                          {activeProjectIndex! + 1} / {activeCollection.projects.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-4 lg:gap-6">
                        {activeCollection.projects.map((project, index) => {
                          const isSelected = activeProjectIndex === index;

                          return (
                            <button
                              key={`${activeCollection.id}-${project.title}`}
                              type="button"
                              onClick={() => setActiveProjectIndex(index)}
                              className={`group relative aspect-video w-full overflow-hidden border transition-all duration-500 rounded-lg ${
                                isSelected 
                                  ? 'border-[#c9a96f] ring-1 ring-[#c9a96f]/40' 
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              <img 
                                src={project.image} 
                                alt={project.title} 
                                className={`h-full w-full object-cover transition-all duration-700 ${
                                  isSelected ? 'scale-105' : 'scale-100 opacity-60 group-hover:opacity-100'
                                }`} 
                              />
                              <div className={`absolute inset-0 transition-opacity duration-500 ${isSelected ? 'bg-transparent' : 'bg-black/40 group-hover:bg-transparent'}`} />
                              
                              {/* Selection Indicator */}
                              {isSelected && (
                                <div className="absolute inset-x-0 bottom-0 h-1 w-full bg-[#c9a96f]" />
                              )}
                              
                              <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100">
                                <p className="label-font text-[9px] font-bold uppercase tracking-widest text-white text-center drop-shadow-md">
                                  View
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Testimonials */}
        <section ref={testimonialsRef} id="testimonials" className="bg-[#141416] relative border-t border-white/5 py-40">
          
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16 md:mb-24"
            >
              <h2 className="headline-font text-5xl font-bold tracking-tight text-white mb-4">
                Voices of <span className="text-shimmer italic font-light">Partnership</span>
              </h2>
              <p className="landing-copy text-lg">Hear from business owners who trust RMV for their fabrication needs.</p>
            </motion.div>

            <div className="grid gap-16 md:grid-cols-3">
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
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 * i }}
                  className="group relative flex flex-col justify-between"
                >
                  <div className="space-y-12">
                    <Quote className="h-10 w-10 text-[#d4af37] opacity-40 transition-opacity group-hover:opacity-100" />
                    
                    <p className="text-lg leading-relaxed text-white/90 font-light italic tracking-tight min-h-[120px]">
                      {testimonial.text}
                    </p>
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center gap-4">

                      <div className="flex flex-col">
                        <span className="label-font text-[10px] font-black uppercase tracking-[0.2em] text-white">
                          {testimonial.author}
                        </span>
                        <span className="label-font mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                          {testimonial.biz}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Mission & Vision — Technical Grid Layout */}
        <section ref={purposeRef} id="mission" className="blueprint-grid relative border-t border-white/5 bg-[#0a0a0b] py-32 md:py-48">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-24 lg:grid-cols-2 lg:gap-32">
              
              {/* Mission */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="group relative"
              >
                <div className="mb-10 h-1 w-12 bg-[#FFD700] gold-glow transition-all duration-500 group-hover:w-20" />
                <h3 className="headline-font mb-8 text-4xl font-bold tracking-tight text-white sm:text-5xl">Our Mission</h3>
                <p className="max-w-xl text-lg leading-relaxed text-[#919097] font-light">
                  We are committed to delivering quality manufacturing services to our customers, fostering an environment of continuous growth for both our customers and investors.
                </p>
              </motion.div>

              {/* Vision */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={SECTION_TRANSITION}
                className="group relative"
              >
                <div className="mb-10 h-1 w-12 bg-[#FFD700] gold-glow transition-all duration-500 group-hover:w-20" />
                <h3 className="headline-font mb-8 text-4xl font-bold tracking-tight text-white sm:text-5xl">Our Vision</h3>
                <p className="max-w-xl text-lg leading-relaxed text-[#919097] font-light">
                  Aspiring to be a world-class manufacturer, we aim to produce quality, custom, precision parts and fabrications that surpass customer expectations. Our success lies in providing on-time or early deliveries, affordable prices, and innovative ideas.
                </p>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Call to Action — High Contrast Conversion */}
        <section ref={ctaRef} className="bg-[#141412] relative overflow-hidden border-t border-white/5 py-40 md:py-56">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: SMOOTH_240 }}
            >
              <p className="label-font mb-10 text-[10px] font-black uppercase tracking-[0.5em] text-[#FFD700] gold-glow">
                Ready to Build
              </p>
              
              <h2 className="label-font mb-16 text-6xl font-bold tracking-tight text-white sm:text-8xl lg:text-9xl">
                Start your build
              </h2>
              
              <div className="flex justify-center">
                <Button asChild className="label-font brass-gradient h-16 rounded-none border-none px-12 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 shadow-[0_10px_40px_rgba(255,215,0,0.2)] transition-all hover:scale-105 hover:shadow-[0_15px_60px_rgba(255,215,0,0.35)] active:scale-95">
                  <Link to="/register">Create Account</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Global Footer — Technical Precision Style */}
        <footer id="contact" className="relative border-t border-white/5 bg-[#0a0a0b] py-24 text-[#919097] md:pb-16 md:pt-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-20 grid grid-cols-2 gap-12 md:grid-cols-4 md:gap-16">
              
              <div className="col-span-2 space-y-10 md:col-span-1">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <BrandLogo className="h-6 w-6 text-white" />
                    <span className="text-shimmer headline-font text-xl font-black uppercase tracking-widest text-white">
                      RMV FABRICATION
                    </span>
                  </div>
                  <p className="max-w-xs text-xs font-light leading-relaxed tracking-wide text-[#919097]">
                    Engineered for Excellence. Specialized in high-grade industrial fabrication and precision metal works.
                  </p>
                </div>

                <div className="flex gap-6">
                  <Globe 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="h-4 w-4 cursor-pointer text-[#FFD700]/40 transition-all hover:scale-110 hover:text-[#FFD700]" 
                  />
                  <Mail 
                    onClick={() => window.location.href = 'mailto:rmvstainless@gmail.com'}
                    className="h-4 w-4 cursor-pointer text-[#FFD700]/40 transition-all hover:scale-110 hover:text-[#FFD700]" 
                  />
                  <a 
                    href="https://www.facebook.com/profile.php?id=61564847510309"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-4 w-4 cursor-pointer text-[#FFD700]/40 transition-all hover:scale-110 hover:text-[#FFD700]"
                  >
                    <Facebook className="h-full w-full" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="label-font mb-10 text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Services</h4>
                <ul className="space-y-4">
                  {FOOTER_SERVICE_LINKS.map(({ label, href }) => (
                    <li key={label}>
                      <a href={href} className="label-font text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="label-font mb-10 text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Company</h4>
                <ul className="space-y-4">
                  {[
                    { label: 'About Us', id: 'about' },
                    { label: 'Projects', id: 'projects' },
                    { label: 'Contact', id: 'contact' }
                  ].map((item) => (
                    <li key={item.label}>
                      <button 
                        type="button" 
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })} 
                        className="label-font cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                  <li><Link to="/privacy" className="label-font text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="label-font text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1">
                <h4 className="label-font mb-10 text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700]">Contact</h4>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4 transition-all hover:text-white">
                    <MapPin className="h-4 w-4 shrink-0 text-[#FFD700]/60" />
                    <span className="label-font text-[11px] font-medium uppercase leading-relaxed tracking-wider">
                      BIR Village, Novaliches, QC, PH 1118
                    </span>
                  </li>
                  <li className="flex items-start gap-4 transition-all hover:text-white">
                    <Phone className="h-4 w-4 shrink-0 text-[#FFD700]/60" />
                    <span className="label-font text-[11px] font-medium uppercase leading-relaxed tracking-wider">
                      02-9506187<br/>0945 285 2974
                    </span>
                  </li>
                  <li className="flex items-center gap-4 transition-all hover:text-white">
                    <Mail className="h-4 w-4 shrink-0 text-[#FFD700]/60" />
                    <span className="label-font text-[11px] font-medium uppercase leading-relaxed tracking-wider">
                      rmvstainless@gmail.com
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Interactive Google Map — Localized Mono Style */}
            <div className="group relative mb-16 h-[300px] w-full overflow-hidden border border-white/5 grayscale transition-all duration-700 hover:grayscale-0">
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
              <div className="pointer-events-none absolute inset-0 bg-[#0a0a0b]/10 mix-blend-color" />
            </div>

            <div className="flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-12 md:flex-row">
              <p className="label-font text-[10px] font-medium uppercase tracking-[0.3em]">
                &copy; 2026 RMV Stainless Steel Fabrication & Construction Services
              </p>
              
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 label-font text-[10px] font-black uppercase tracking-[0.2em]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FFD700] gold-glow" />
                  Systems Operational
                </div>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </LazyMotion>
  );
}
