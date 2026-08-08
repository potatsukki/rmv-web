import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Menu, Phone, X } from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { SERVICE_CATALOG } from '@/lib/service-catalog';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '/#hero' },
  { label: 'Projects', href: '/#projects' },
  { label: 'About Us', href: '/about' },
  { label: 'Materials', href: '/#materials' },
  { label: 'Contact', href: '/#contact' },
];

export function LandingNavbar() {
  const { user } = useAuthStore();
  const quoteTarget = user ? '/appointments/book' : '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setServicesOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled || menuOpen
          ? 'border-white/10 bg-[#090B0D] shadow-[0_12px_30px_rgba(0,0,0,0.24)]'
          : 'border-white/[0.08] bg-[#090B0D]/72 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 w-[min(calc(100%_-_32px),1440px)] items-center justify-between gap-4 lg:h-[72px] lg:w-[min(calc(100%_-_48px),1440px)]">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5B400]"
          aria-label="RMV Stainless Steel Fabrication home"
        >
          <img
            src="/RMV_circle_true_transparent_v2.png"
            alt=""
            className="h-10 w-10 shrink-0 object-contain lg:h-11 lg:w-11"
          />
          <span className="hidden min-[390px]:block">
            <span className="block font-['Sora',sans-serif] text-[0.88rem] font-extrabold leading-none tracking-[-0.03em] text-white">
              RMV
            </span>
            <span className="mt-1 block text-[0.48rem] font-bold uppercase leading-none tracking-[0.2em] text-white/58">
              Stainless Fabrication
            </span>
          </span>
        </Link>

        <nav className="hidden items-stretch self-stretch lg:flex" aria-label="Primary navigation">
          {NAV_ITEMS.slice(0, 1).map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                'group relative flex min-w-[84px] items-center justify-center px-3 text-[0.68rem] font-bold uppercase tracking-[0.09em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F5B400] xl:min-w-[96px]',
                index === 0 ? 'text-[#F5B400]' : 'text-white/78 hover:text-white',
              )}
            >
              {item.label}
              <span
                className={cn(
                  'absolute inset-x-4 bottom-0 h-0.5 origin-left bg-[#F5B400] transition-transform duration-200',
                  index === 0 ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                )}
              />
            </a>
          ))}

          <div className="relative flex items-stretch">
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-controls="landing-services-menu"
              className="group relative flex min-w-[84px] items-center justify-center gap-1 px-3 text-[0.68rem] font-bold uppercase tracking-[0.09em] text-white/78 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F5B400] xl:min-w-[96px]"
              onClick={() => setServicesOpen((open) => !open)}
            >
              Services
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', servicesOpen && 'rotate-180 text-[#F5B400]')} aria-hidden="true" />
              <span className="absolute inset-x-4 bottom-0 h-0.5 origin-left bg-[#F5B400] transition-transform duration-200 group-hover:scale-x-100" />
            </button>

            {servicesOpen && (
              <div
                id="landing-services-menu"
                role="menu"
                className="absolute left-1/2 top-full z-10 w-[min(calc(100vw_-_32px),660px)] -translate-x-1/2 border border-white/10 bg-[#101417] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.42)]"
              >
                <div className="grid grid-cols-2 gap-1">
                  {SERVICE_CATALOG.map((service) => (
                    <Link
                      key={service.id}
                      to={`/services/${service.id}`}
                      role="menuitem"
                      onClick={() => setServicesOpen(false)}
                      className="rounded-sm px-4 py-3 transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5B400]"
                    >
                      <span className="block text-xs font-extrabold uppercase tracking-[0.1em] text-white">{service.label}</span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-white/55">{service.shortDescription}</span>
                    </Link>
                  ))}
                </div>
                <a
                  href="/#services"
                  role="menuitem"
                  onClick={() => setServicesOpen(false)}
                  className="mt-1 flex items-center border-t border-white/10 px-4 py-3 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-[#F5B400] transition-colors hover:text-[#FFD047] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5B400]"
                >
                  View all services
                </a>
              </div>
            )}
          </div>

          {NAV_ITEMS.slice(1).map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative flex min-w-[84px] items-center justify-center px-3 text-[0.68rem] font-bold uppercase tracking-[0.09em] text-white/78 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F5B400] xl:min-w-[96px]"
            >
              {item.label}
              <span className="absolute inset-x-4 bottom-0 h-0.5 origin-left bg-[#F5B400] transition-transform duration-200 scale-x-0 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 lg:gap-4">
          <a
            href="tel:029506187"
            className="hidden min-h-11 items-center gap-2 text-[0.69rem] font-bold text-white/82 transition-colors hover:text-[#F5B400] xl:flex"
          >
            <Phone className="h-4 w-4 text-[#F5B400]" aria-hidden="true" />
            02-9506187
          </a>
          <Link
            to={quoteTarget}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#F5B400] bg-[#F5B400] px-3 text-[0.61rem] font-extrabold uppercase tracking-[0.08em] text-[#090B0D] transition duration-200 hover:-translate-y-0.5 hover:border-[#FFD047] hover:bg-[#FFD047] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400] min-[430px]:px-4 lg:px-5"
          >
            <span className="min-[390px]:hidden">Quote</span>
            <span className="hidden min-[390px]:inline">Request a Quote</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-white transition hover:border-[#F5B400] hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400] lg:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="landing-mobile-menu" className="border-t border-white/10 bg-[#090B0D] lg:hidden">
          <nav
            className="mx-auto grid max-h-[calc(100dvh_-_64px)] w-[min(calc(100%_-_32px),720px)] overflow-y-auto py-4"
            aria-label="Mobile navigation"
          >
            {NAV_ITEMS.slice(0, 1).map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex min-h-12 items-center border-b border-white/[0.08] text-sm font-bold uppercase tracking-[0.12em] transition-colors hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F5B400]',
                  index === 0 ? 'text-[#F5B400]' : 'text-white/78',
                )}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              className="flex min-h-12 items-center justify-between border-b border-white/[0.08] text-left text-sm font-bold uppercase tracking-[0.12em] text-white/78 transition-colors hover:text-[#F5B400]"
              aria-expanded={mobileServicesOpen}
              onClick={() => setMobileServicesOpen((open) => !open)}
            >
              Services
              <ChevronDown className={cn('h-4 w-4 transition-transform', mobileServicesOpen && 'rotate-180 text-[#F5B400]')} />
            </button>
            {mobileServicesOpen && (
              <div className="grid border-b border-white/[0.08] py-2">
                {SERVICE_CATALOG.map((service) => (
                  <Link key={service.id} to={`/services/${service.id}`} onClick={() => { setMenuOpen(false); setMobileServicesOpen(false); }} className="px-4 py-2.5 text-sm font-semibold text-white/62 hover:text-[#F5B400]">
                    {service.label}
                  </Link>
                ))}
              </div>
            )}
            {NAV_ITEMS.slice(1).map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 items-center border-b border-white/[0.08] text-sm font-bold uppercase tracking-[0.12em] text-white/78 transition-colors hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F5B400]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="tel:029506187"
              className="mt-4 flex min-h-12 items-center gap-3 rounded-md border border-white/12 px-4 text-sm font-semibold text-white/78"
            >
              <Phone className="h-4 w-4 text-[#F5B400]" aria-hidden="true" />
              02-9506187
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
