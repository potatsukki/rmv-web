import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Menu,
  X,
  LayoutDashboard,
  CheckCircle,
  Clock,
  Settings,
  PenTool,
  Flame,
  ShieldCheck,
  Wind,
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
  Eye,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { motion, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';

// Ultra-smooth 240Hz-optimized ease — gentle acceleration, long organic deceleration
const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface ProjectData {
  title: string;
  loc: string;
  tag: string;
  img: string;
  description: string;
  highlights: string[];
}

const PROJECTS: ProjectData[] = [
  {
    title: "Le Grand Prei",
    loc: "General Santos City",
    tag: "Full Kitchen Fabrication",
    img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2932&auto=format&fit=crop",
    description: "Complete commercial kitchen fabrication for Le Grand Prei, featuring custom stainless steel countertops, exhaust hoods, and full kitchen equipment layout designed for high-volume restaurant operations.",
    highlights: ["Custom SS Countertops", "Exhaust Hood System", "Full Equipment Layout", "High-Volume Design"]
  },
  {
    title: "Kko Kko Korean Restaurant",
    loc: "Cubao, Quezon City",
    tag: "Kitchen Stainless Steel",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop",
    description: "Full stainless steel kitchen fit-out for Kko Kko Korean Restaurant. Includes grilling stations, prep tables, cold storage units, and ventilation systems specifically designed for Korean BBQ operations.",
    highlights: ["Grilling Stations", "Prep Tables", "Cold Storage Units", "Ventilation Systems"]
  },
  {
    title: "Primo's Restaurant",
    loc: "Ligao, Albay",
    tag: "Kitchen Equipment & Layout",
    img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=2874&auto=format&fit=crop",
    description: "End-to-end kitchen design and stainless steel fabrication for Primo's Restaurant. The space-optimized layout maximizes workflow efficiency while maintaining premium build quality throughout the kitchen.",
    highlights: ["Space-Optimized Layout", "Workflow Efficiency", "Premium Build Quality", "End-to-End Design"]
  },
  {
    title: "8 Danji Korean Resto",
    loc: "Araneta, Cubao",
    tag: "Full Kitchen Setup",
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop",
    description: "Complete kitchen setup for 8 Danji Korean Resto at Araneta, Cubao. Custom fabrication includes specialized kimchi prep stations, dual-purpose cooking areas, and integrated drainage systems.",
    highlights: ["Specialized Prep Stations", "Dual-Purpose Cooking", "Integrated Drainage", "Custom Fabrication"]
  },
  {
    title: "Elkan Hotel",
    loc: "Ligao, Albay",
    tag: "Hotel Kitchen Fabrication",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2940&auto=format&fit=crop",
    description: "Large-scale hotel kitchen fabrication for Elkan Hotel. Designed to handle banquet-level food production with separate prep, cooking, plating, and wash zones all built in premium stainless steel.",
    highlights: ["Banquet-Level Production", "Zone Separation", "Premium Stainless Steel", "Large-Scale Build"]
  },
  {
    title: "Food Stall Works",
    loc: "Fairview, Quezon City",
    tag: "Multiple Food Stalls",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2874&auto=format&fit=crop",
    description: "Multiple food stall fabrication projects across Fairview, Quezon City. Each stall features compact yet highly functional SS setups with serving counters, storage, and cooking stations.",
    highlights: ["Compact Functional Design", "Serving Counters", "Storage Solutions", "Cooking Stations"]
  }
];

export function LandingPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

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

  // Lock body scroll & handle Escape for project modal
  useEffect(() => {
    if (!selectedProject) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProject(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedProject]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#e0e0e5] font-sans text-[#1d1d1f] selection:bg-[#1d1d1f] selection:text-white">
        
        {/* Navigation */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: SMOOTH_240 }}
          className="fixed top-0 z-50 w-full bg-gradient-to-b from-[#ececf0]/92 to-[#dcdce0]/85 backdrop-blur-2xl border-b border-[#b0b0b6]/40 shadow-[0_1px_6px_rgba(0,0,0,0.06)] gpu-reveal"
        >
          <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2 group">
              <BrandLogo className="h-6 w-6 text-[#1d1d1f] transition-transform duration-500 group-hover:scale-110" />
              <span className="text-sm font-bold tracking-tight text-[#1d1d1f]">
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
                  className="text-[13px] font-medium text-[#6e6e73] transition-colors hover:text-[#1d1d1f] relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-[#1d1d1f] after:transition-all after:duration-300"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              {isLoggedIn ? (
                <Button asChild variant="ghost" className="text-[13px] font-medium text-[#1d1d1f] hover:bg-[#e8e8ed] rounded-full px-5 h-9">
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Link to="/login" className="text-[13px] font-medium text-[#6e6e73] transition-colors hover:text-[#1d1d1f] px-3 py-2">
                    Sign In
                  </Link>
                  <Button asChild className="bg-[#1d1d1f] hover:bg-black text-white text-[13px] font-semibold rounded-full px-6 h-9 transition-all hover:scale-105 active:scale-95 duration-300 shadow-md shadow-black/10">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            <button
              type="button"
              className="lg:hidden p-2.5 -mr-1 text-[#1d1d1f] rounded-xl hover:bg-black/5 transition-colors"
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
            className="fixed inset-0 z-40 bg-gradient-to-b from-white via-[#f0f0f3] to-[#e8e8ed] pt-20 px-6 lg:hidden overflow-y-auto"
          >
            <nav className="flex flex-col gap-1 mt-4">
               {[
                 { label: 'Home', href: '#hero' },
                 { label: 'About', href: '#about' },
                 { label: 'Services', href: '#capabilities' },
                 { label: 'Projects', href: '#projects' },
                 { label: 'Contact', href: '#contact' },
               ].map((item) => (
                 <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-semibold tracking-tight text-[#1d1d1f] py-4 border-b border-[#d2d2d7]/50 hover:pl-2 transition-all">
                   {item.label}
                 </a>
               ))}
               <div className="pt-8 flex flex-col gap-4">
                 {isLoggedIn ? (
                   <Button asChild className="bg-[#1d1d1f] text-white text-base font-semibold rounded-2xl h-14 w-full">
                     <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                   </Button>
                 ) : (
                   <>
                     <Button asChild className="bg-[#1d1d1f] text-white text-base font-semibold rounded-2xl h-14 w-full">
                       <Link to="/register" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                     </Button>
                     <Button asChild variant="outline" className="text-[#1d1d1f] border-[#c8c8cc] text-base font-semibold rounded-2xl h-14 w-full">
                       <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                     </Button>
                   </>
                 )}
               </div>
            </nav>
          </motion.div>
        )}

        {/* Hero Section */}
        <section id="hero" className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden bg-gradient-to-br from-[#e8e8ed] via-[#d4d4d8] to-[#c0c0c6]">
          {/* Brushed-metal noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          {/* Metallic dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#9a9a9e_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_100%)] opacity-20" />
          {/* Silver radial accent */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[1000px] md:h-[1000px] bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,transparent_60%)] pointer-events-none" />
          {/* Bottom edge highlight */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          
          <div className="relative z-10 px-4 sm:px-6 text-center max-w-5xl mx-auto flex flex-col items-center mt-8 md:mt-0">
            <motion.h1
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: SMOOTH_240 }}
              className="text-[2.75rem] sm:text-6xl md:text-8xl lg:text-[140px] font-bold tracking-tighter leading-[0.9] text-center mb-4 md:mb-6 gpu-reveal"
            >
              <span className="bg-gradient-to-b from-[#1d1d1f] via-[#3a3a3e] to-[#1d1d1f] bg-clip-text text-transparent">Precision</span><br />
              <span className="bg-gradient-to-r from-[#8e8e93] via-[#c8c8cd] to-[#8e8e93] bg-clip-text text-transparent drop-shadow-sm">Engineering.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: SMOOTH_240 }}
              className="text-base sm:text-xl md:text-2xl lg:text-3xl font-medium tracking-tight text-[#6e6e73] max-w-2xl mb-8 md:mb-12 px-2 gpu-reveal"
            >
              Uncompromising quality in every weld. Designed for longevity, built for the standards of tomorrow.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.45, ease: SMOOTH_240 }}
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto gpu-reveal"
            >
              <Button asChild className="bg-[#1d1d1f] hover:bg-black text-white text-base font-semibold rounded-full px-8 h-14 md:px-10 md:h-16 transition-all hover:scale-105 active:scale-95 duration-300 shadow-xl shadow-black/15 w-full sm:w-auto">
                <Link to="/register">
                  Commission a Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild className="bg-gradient-to-b from-white/80 to-[#e0e0e4]/80 hover:from-white hover:to-[#e8e8ed] text-[#1d1d1f] border border-[#b0b0b6] text-base font-semibold rounded-full px-8 h-14 md:px-10 md:h-16 transition-all hover:scale-105 active:scale-95 duration-300 shadow-md shadow-black/8 backdrop-blur-sm w-full sm:w-auto">
                <a href="#capabilities">Explore Services</a>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Built on Trust Section */}
        <section id="about" className="relative py-16 md:py-32 bg-gradient-to-br from-[#dcdce2] via-[#e8e8ed] to-[#d4d4d9] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.1, ease: SMOOTH_240 }}
                className="gpu-reveal"
              >
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter text-[#1d1d1f] leading-tight mb-6">
                  Built on Trust,<br/>
                  Delivered with <span className="bg-gradient-to-r from-[#8e8e93] via-[#c5c5ca] to-[#8e8e93] bg-clip-text text-transparent">Precision.</span>
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

              {/* Portal UI Mockup inside minimalist card */}
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.1, delay: 0.2, ease: SMOOTH_240 }}
                className="relative mx-auto w-full max-w-[500px] gpu-reveal"
              >
                {/* Decorative radial gradients replacing the original orange blobs */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#d2d2d7] rounded-full blur-3xl opacity-50 mix-blend-multiply" />
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-80 mix-blend-multiply" />
                
                <div className="relative bg-gradient-to-br from-[#2c2c2e] via-[#1d1d1f] to-[#0a0a0a] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white/10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">RMV Portal</h4>
                      <p className="text-[#86868b] text-sm">Client Dashboard</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                      <span className="text-[#a1a1a6] text-sm font-medium">Project Status</span>
                      <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">Fabrication</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                      <span className="text-[#a1a1a6] text-sm font-medium">Completion</span>
                      <span className="text-white font-bold">78%</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                      <span className="text-[#a1a1a6] text-sm font-medium">Next Milestone</span>
                      <span className="text-white text-sm font-bold">Quality Check</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10">
                     <div className="flex justify-between text-xs font-medium text-[#86868b] mb-3">
                       <span>Overall Progress</span>
                       <span>78%</span>
                     </div>
                     <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-white w-[78%] rounded-full" />
                     </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Streamlined Workflow */}
        <section id="workflow" className="relative py-16 md:py-32 bg-gradient-to-br from-[#1a1a1c] via-[#0f0f11] to-[#1d1d1f] text-white overflow-hidden">
          {/* Subtle silver light leak on dark bg */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(180,180,190,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(200,200,210,0.05)_0%,transparent_70%)] pointer-events-none" />
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
                    Streamlined<br />
                    <span className="bg-gradient-to-r from-[#7a7a80] via-[#d0d0d6] to-[#7a7a80] bg-clip-text text-transparent">Workflow.</span>
                  </h2>
                  <p className="text-[#a1a1a6] text-lg font-medium mb-10 max-w-md leading-relaxed">
                    From initial consultation to final delivery — complete transparency at every step of your fabrication journey.
                  </p>
                  <Button asChild className="bg-white hover:bg-[#e8e8ed] text-black text-base font-semibold rounded-full px-8 h-14 transition-all hover:scale-105 active:scale-95 duration-300">
                    <Link to="/register">Get Started Now</Link>
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
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 1, delay: 0.15 * idx, ease: SMOOTH_240 }}
                    className="group gpu-reveal"
                  >
                    <div className="bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-white/25 rounded-2xl md:rounded-3xl p-6 md:p-10 transition-all duration-500 flex flex-col md:flex-row gap-5 md:gap-10 hover:shadow-[0_8px_32px_rgba(255,255,255,0.03)]">
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

        {/* Fabrication Capabilities (Bento) */}
        <section id="capabilities" className="relative py-16 md:py-32 bg-gradient-to-br from-[#e4e4e9] via-[#eeeef2] to-[#d8d8de]">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b0b0b6] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b0b0b6] to-transparent" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="text-center mb-20 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter text-[#1d1d1f] mb-4">Fabrication Capabilities</h2>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-[#6e6e73]">Complete stainless steel fabrication services from design to installation.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Layers, title: "Kitchen Stainless Steel Fabrication", desc: "Custom food-grade stainless steel counters, sinks, shelving, and equipment for restaurants, hotels, and food courts.", tags: ["Food Grade", "Custom Fit", "Durable"] },
                { icon: PenTool, title: "Kitchen Planning & Remodeling", desc: "End-to-end kitchen layout planning and remodeling designed for optimal workflow and compliance.", tags: ["Layout Design", "Remodeling", "Compliant"] },
                { icon: Flame, title: "LPG Gas Pipeline", desc: "Professional LPG gas pipeline installation for commercial kitchens with strict safety standards.", tags: ["Safety First", "Commercial", "Certified"] },
                { icon: ShieldCheck, title: "Fire Suppression System", desc: "Kitchen fire suppression system installation to keep your commercial establishment safe and up to code.", tags: ["Fire Safety", "Compliant", "Reliable"] },
                { icon: Wind, title: "Exhaust & Fresh Air System", desc: "Mechanical works for exhaust hoods, ductwork, and fresh air systems for proper kitchen ventilation.", tags: ["Ventilation", "Ductwork", "Airflow"] },
                { icon: Maximize, title: "Railings & Custom Fabrication", desc: "Custom-designed stainless steel railings and bespoke fabrication for residential and commercial projects.", tags: ["Residential", "Commercial", "Custom"] }
              ].map((cap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 70 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 1, delay: 0.12 * i, ease: SMOOTH_240 }}
                  className="gpu-reveal bg-gradient-to-br from-[#f0f0f4] via-[#e6e6eb] to-[#d8d8dd] border border-[#bbbbc0]/70 rounded-2xl md:rounded-[2rem] p-6 md:p-8 hover:from-[#eaeaef] hover:via-[#e0e0e5] hover:to-[#d2d2d7] transition-all duration-500 group flex flex-col hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 shadow-sm shadow-black/5"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-white via-[#e8e8ed] to-[#c8c8cd] border border-[#b0b0b5] rounded-full flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500 shadow-md shadow-black/8">
                    <cap.icon className="h-5 w-5 md:h-6 md:w-6 text-[#1d1d1f]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1d1d1f] mb-3 md:mb-4 leading-tight">{cap.title}</h3>
                  <p className="text-[#6e6e73] font-medium leading-relaxed mb-6 md:mb-8 flex-grow text-sm md:text-base">{cap.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {cap.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#555558] bg-gradient-to-r from-white/90 to-[#e0e0e4] border border-[#b8b8bd] px-3 py-1.5 rounded-full shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Sectors We Serve */}
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-[#d0d0d6] via-[#dcdce2] to-[#c8c8ce]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="mb-16 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-[#1d1d1f] mb-4">Sectors We Serve</h2>
              <p className="text-base md:text-xl font-medium text-[#6e6e73]">Trusted by businesses across diverse industries in the food and hospitality sector.</p>
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
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.9, delay: 0.08 * i, ease: SMOOTH_240 }}
                  className="gpu-reveal bg-gradient-to-br from-white/90 via-[#ececf0] to-[#d8d8de] border border-[#b4b4ba]/60 rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4 hover:shadow-lg hover:shadow-black/8 transition-all duration-300 group hover:-translate-y-0.5 shadow-sm"
                >
                  <div className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-white via-[#e8e8ed] to-[#c8c8cd] rounded-xl md:rounded-2xl flex items-center justify-center text-[#1d1d1f] group-hover:bg-[#1d1d1f] group-hover:text-white transition-all duration-300 shadow-md shadow-black/6 border border-[#b8b8bd]/50">
                    <sector.icon className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] text-center">{sector.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section id="projects" className="relative py-16 md:py-32 bg-gradient-to-br from-[#e0e0e6] via-[#ebebf0] to-[#d6d6dc]">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="text-center mb-20 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter text-[#1d1d1f] mb-4">Featured Projects</h2>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-[#6e6e73]">A selection of completed works across restaurants, hotels, and food establishments.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROJECTS.map((proj, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 70 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 1, delay: 0.12 * i, ease: SMOOTH_240 }}
                  className="gpu-reveal group relative h-64 sm:h-80 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl shadow-black/10 border border-[#b8b8bd]/30 cursor-pointer"
                  onClick={() => setSelectedProject(proj)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProject(proj); } }}
                >
                  <img src={proj.img} alt={proj.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[50%] group-hover:grayscale-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1d1d1f] via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                  
                  {/* Expand hint */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-100 scale-75">
                    <Eye className="h-4 w-4 text-white" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#d2d2d7] mb-1.5 sm:mb-2">{proj.tag}</p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 sm:mb-2">{proj.title}</h3>
                    <p className="text-[#a1a1a6] text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {proj.loc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PROJECT MODAL ===== */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              key="project-modal-backdrop"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: SMOOTH_240 }}
              onClick={() => setSelectedProject(null)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

              {/* Modal Content */}
              <motion.div
                key="project-modal-content"
                className="gpu-reveal relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-[#1a1a1c] via-[#111113] to-[#0d0d0f] border border-[#3a3a3e]/60 shadow-2xl shadow-black/60"
                initial={{ opacity: 0, y: 80, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 60, scale: 0.95 }}
                transition={{ duration: 0.5, ease: SMOOTH_240 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Hero Image */}
                <div className="relative w-full h-56 sm:h-72 md:h-96 overflow-hidden rounded-t-2xl md:rounded-t-[2rem]">
                  <motion.img
                    src={selectedProject.img}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                    initial={{ scale: 1.15 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: SMOOTH_240 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1c] via-transparent to-transparent" />
                  
                  {/* Floating tag */}
                  <motion.div
                    className="absolute bottom-6 left-6 sm:left-8"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: SMOOTH_240 }}
                  >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-widest text-[#d2d2d7]">
                      <Layers className="h-3 w-3" />
                      {selectedProject.tag}
                    </span>
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 md:p-10 space-y-6 md:space-y-8">
                  {/* Title & Location */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15, ease: SMOOTH_240 }}
                  >
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-white mb-3">
                      {selectedProject.title}
                    </h2>
                    <p className="text-[#86868b] font-medium flex items-center gap-2 text-sm sm:text-base">
                      <MapPin className="h-4 w-4 text-[#6e6e73]" />
                      {selectedProject.loc}
                    </p>
                  </motion.div>

                  {/* Divider */}
                  <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-[#3a3a3e] to-transparent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: SMOOTH_240 }}
                  />

                  {/* Description */}
                  <motion.p
                    className="text-[#a1a1a6] text-sm sm:text-base md:text-lg leading-relaxed font-medium"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: SMOOTH_240 }}
                  >
                    {selectedProject.description}
                  </motion.p>

                  {/* Highlights */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35, ease: SMOOTH_240 }}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#6e6e73] mb-4">Project Highlights</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProject.highlights.map((h, idx) => (
                        <motion.div
                          key={idx}
                          className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-[#2a2a2e]/80 hover:border-[#4a4a4e]/60 transition-colors duration-300"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 + idx * 0.08, ease: SMOOTH_240 }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a2a2e] to-[#1d1d1f] border border-[#3a3a3e]/60 flex items-center justify-center flex-shrink-0">
                            <ChevronRight className="h-3.5 w-3.5 text-[#86868b]" />
                          </div>
                          <span className="text-sm font-semibold text-[#d2d2d7] tracking-tight">{h}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Footer CTA */}
                  <motion.div
                    className="flex flex-col sm:flex-row items-center gap-3 pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5, ease: SMOOTH_240 }}
                  >
                    <a
                      href="#contact"
                      onClick={() => setSelectedProject(null)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#1d1d1f] font-semibold text-sm tracking-tight hover:bg-[#e8e8ed] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
                    >
                      Inquire About This Project
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-transparent border border-[#3a3a3e] text-[#86868b] font-medium text-sm tracking-tight hover:text-white hover:border-[#5a5a5e] transition-all duration-300"
                    >
                      Close
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Testimonials */}
        <section id="testimonials" className="relative py-16 md:py-32 bg-gradient-to-br from-[#1a1a1c] via-[#0d0d0f] to-[#1d1d1f] text-white overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(180,180,190,0.04)_0%,transparent_60%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="text-center mb-20 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-white">What Our Clients Say</h2>
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
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 1, delay: 0.15 * i, ease: SMOOTH_240 }}
                  className="gpu-reveal bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-10 flex flex-col justify-between hover:border-white/20 transition-colors duration-500"
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
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-[#dcdce2] via-[#e8e8ed] to-[#d0d0d6]">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="mb-16 gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-[#1d1d1f] mb-4">Our Purpose</h2>
              <p className="text-base md:text-xl font-medium text-[#6e6e73]">What drives us every day in the workshop and on-site.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 70 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1, ease: SMOOTH_240 }}
                className="gpu-reveal bg-gradient-to-br from-[#f0f0f4] via-[#e6e6eb] to-[#d4d4da] border border-[#b8b8be]/60 rounded-2xl md:rounded-[2rem] p-7 md:p-10 hover:from-[#eaeaef] hover:via-[#e0e0e5] hover:to-[#cecece] transition-all duration-300 hover:shadow-lg hover:shadow-black/8 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-white via-[#e8e8ed] to-[#c8c8cd] rounded-full border border-[#b0b0b5] flex items-center justify-center shadow-md shadow-black/6">
                    <Star className="h-5 w-5 text-[#1d1d1f]" />
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
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1, delay: 0.2, ease: SMOOTH_240 }}
                className="gpu-reveal bg-gradient-to-br from-[#f0f0f4] via-[#e6e6eb] to-[#d4d4da] border border-[#b8b8be]/60 rounded-2xl md:rounded-[2rem] p-7 md:p-10 hover:from-[#eaeaef] hover:via-[#e0e0e5] hover:to-[#cecece] transition-all duration-300 hover:shadow-lg hover:shadow-black/8 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-white via-[#e8e8ed] to-[#c8c8cd] rounded-full border border-[#b0b0b5] flex items-center justify-center shadow-md shadow-black/6">
                    <Layers className="h-5 w-5 text-[#1d1d1f]" />
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
        <section className="relative py-20 md:py-32 bg-gradient-to-br from-[#d4d4da] via-[#e0e0e6] to-[#c8c8ce]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a0a0a6] to-transparent" />
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 1.1, ease: SMOOTH_240 }}
              className="gpu-reveal"
            >
              <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold tracking-tighter text-[#1d1d1f] mb-4 md:mb-6">Start your build.</h2>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-[#6e6e73] mb-8 md:mb-10 max-w-2xl mx-auto">Access the portal to manage quotes, track projects, and communicate directly with the workshop.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-[#1d1d1f] hover:bg-black text-white text-base font-semibold rounded-full px-8 h-14 md:px-10 md:h-16 transition-all hover:scale-105 active:scale-95 duration-300">
                  <Link to="/register">Create Account</Link>
                </Button>
                <Button asChild className="bg-white hover:bg-[#e8e8ed] text-[#1d1d1f] border border-[#d2d2d7] text-base font-semibold rounded-full px-8 h-14 md:px-10 md:h-16 transition-all hover:scale-105 active:scale-95 duration-300 shadow-sm">
                  <a href="mailto:rmvstainless@gmail.com">Contact Sales</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Global Footer based on exact details */}
        <footer id="contact" className="relative bg-gradient-to-br from-[#e8e8ed] via-[#f0f0f4] to-[#dcdce2] border-t border-[#b0b0b6]/40 pt-16 md:pt-20 pb-10 md:pb-12">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
              
              <div className="space-y-4 md:space-y-6 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <BrandLogo className="h-7 w-7 md:h-8 md:w-8 text-[#1d1d1f]" />
                  <span className="text-base md:text-lg font-bold tracking-tight text-[#1d1d1f]">RMV Stainless Steel Fabrication</span>
                </div>
                <p className="text-[#6e6e73] font-medium leading-relaxed pr-4 text-sm">
                  Precision stainless steel fabrication for residential and commercial industries.<br/>
                  Quality you can trust.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#1d1d1f] mb-4 md:mb-6">Services</h4>
                <ul className="space-y-3 md:space-y-4">
                  {['Kitchen SS Fabrication', 'Kitchen Remodeling', 'LPG Gas Pipeline', 'Fire Suppression', 'Exhaust Systems', 'Railings'].map(link => (
                    <li key={link}><a href="#" className="text-[#6e6e73] hover:text-[#1d1d1f] font-medium transition-colors text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#1d1d1f] mb-4 md:mb-6">Company</h4>
                <ul className="space-y-3 md:space-y-4">
                  {['About Us', 'Projects', 'Careers', 'Privacy Policy'].map(link => (
                    <li key={link}><a href="#" className="text-[#6e6e73] hover:text-[#1d1d1f] font-medium transition-colors text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#1d1d1f] mb-4 md:mb-6">Contact</h4>
                <ul className="space-y-3 md:space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#6e6e73] shrink-0" />
                    <span className="text-[#6e6e73] text-sm font-medium">BIR Village, Novaliches, Quezon City, Philippines 1118</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-[#6e6e73] shrink-0" />
                    <span className="text-[#6e6e73] text-sm font-medium">02-9506187<br/>0945 285 2974</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#6e6e73] shrink-0" />
                    <span className="text-[#6e6e73] text-sm font-medium">rmvstainless@gmail.com</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Interactive Google Map */}
            <div className="w-full h-[250px] md:h-[300px] border border-[#c8c8cc]/60 rounded-2xl md:rounded-3xl overflow-hidden mb-10 md:mb-12 grayscale hover:grayscale-0 transition-all duration-700 shadow-sm">
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

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[#c8c8cc]/40">
              <p className="text-sm font-medium text-[#6e6e73]">
                &copy; {new Date().getFullYear()} RMV Stainless Steel Fabrication. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-[#6e6e73]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                All Systems Operational
              </div>
            </div>
          </div>
        </footer>

      </div>
    </LazyMotion>
  );
}
