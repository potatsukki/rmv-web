import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PublicNavbar() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: SMOOTH_240 }}
      className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl transition-all duration-500"
    >
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold tracking-tighter text-[#FFD700] headline-font uppercase gold-glow">
          RMV FABRICATION
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-10 label-font tracking-widest text-[10px] uppercase">
          {[
            { label: 'Studio', href: '/#hero' },
            { label: 'Legacy', href: '/#about' },
            { label: 'Gallery', href: '/#projects' },
            { label: 'Inquiry', href: '/#contact' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-neutral-400 transition-colors duration-300 hover:text-[#FFD700]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center space-x-6">
          {isLoggedIn ? (
            <Button asChild className="label-font brass-gradient h-9 rounded-none border-none px-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-950 transition-transform hover:scale-105 active:scale-95 shadow-[0_5px_15px_rgba(255,215,0,0.15)]">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="label-font text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white">
                Sign In
              </Link>
              <Button asChild className="label-font brass-gradient h-9 rounded-none border-none px-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-950 transition-transform hover:scale-105 active:scale-95 shadow-[0_5px_15px_rgba(255,215,0,0.15)]">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="text-white/70 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden absolute top-full left-0 w-full bg-neutral-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex flex-col space-y-4"
        >
          <nav className="flex flex-col space-y-4">
            {[
              { label: 'Studio', href: '/#hero' },
              { label: 'Legacy', href: '/#about' },
              { label: 'Gallery', href: '/#projects' },
              { label: 'Inquiry', href: '/#contact' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-white/70 transition-colors hover:text-[#FFD700]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="border-t border-white/10 pt-6 flex flex-col space-y-4">
            {isLoggedIn ? (
              <Button asChild className="label-font brass-gradient h-12 w-full rounded-none border-none text-[10px] font-black uppercase tracking-[0.2em] text-neutral-950">
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link 
                  to="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="label-font text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 py-2"
                >
                  Sign In
                </Link>
                <Button asChild className="label-font brass-gradient h-12 w-full rounded-none border-none text-[10px] font-black uppercase tracking-[0.2em] text-neutral-950">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
