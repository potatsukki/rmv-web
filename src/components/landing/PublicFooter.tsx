import { Clock3, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router';

import { SERVICE_CATALOG } from '@/lib/service-catalog';

const OFFICE = {
  address: 'BIR Village, Novaliches, Quezon City, Metro Manila 1118',
  tel: '02-9506187',
  mobile: '0945 285 2974',
  email: 'rmvstainless@gmail.com',
  hours: 'Mon - Sat: 8:00 AM - 6:00 PM',
  directionsUrl: 'https://www.google.com/maps?q=14.6995125,121.053703125',
};

export function PublicFooter() {
  return (
    <footer id="contact" className="scroll-mt-16 bg-[#090B0D] lg:scroll-mt-[72px]">
      <div className="mx-auto grid w-[min(calc(100%_-_32px),1440px)] gap-10 py-14 sm:w-[min(calc(100%_-_48px),1440px)] sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_1.35fr_0.9fr] lg:gap-8 lg:py-16">
        <div>
          <div className="flex items-center gap-3">
            <img src="/RMV_circle_true_transparent_v2.png" alt="" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-['Sora',sans-serif] text-lg font-extrabold text-white">RMV</p>
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/55">Stainless Fabrication</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/58">Custom stainless and metal fabrication for residential, commercial, and industrial project requirements.</p>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Quick Links</h3>
          <nav className="mt-5 grid gap-3 text-sm text-white/58" aria-label="Footer navigation">
            <a href="/#hero" className="hover:text-[#F5B400]">Home</a>
            <a href="/#services" className="hover:text-[#F5B400]">Services</a>
            <a href="/#projects" className="hover:text-[#F5B400]">Projects</a>
            <Link to="/about" className="hover:text-[#F5B400]">About Us</Link>
            <a href="/#materials" className="hover:text-[#F5B400]">Materials</a>
            <a href="#contact" className="hover:text-[#F5B400]">Contact</a>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Our Services</h3>
          <nav className="mt-5 grid gap-3 text-sm text-white/58" aria-label="Service pages">
            {SERVICE_CATALOG.map((service) => <Link key={service.id} to={`/services/${service.id}`} className="hover:text-[#F5B400]">{service.label}</Link>)}
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Contact Us</h3>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-white/58">
            <a href="tel:029506187" className="flex items-start gap-3 hover:text-[#F5B400]"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" />{OFFICE.tel} / {OFFICE.mobile}</a>
            <a href={`mailto:${OFFICE.email}`} className="flex items-start gap-3 hover:text-[#F5B400]"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" />{OFFICE.email}</a>
            <a href={OFFICE.directionsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-[#F5B400]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" />{OFFICE.address}</a>
            <p className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" />{OFFICE.hours}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Service Areas</h3>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-white/58"><p>Quezon City</p><p>Metro Manila</p><p>Project coverage confirmed during consultation.</p></div>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex w-[min(calc(100%_-_32px),1440px)] flex-col gap-3 py-5 text-xs text-white/42 sm:w-[min(calc(100%_-_48px),1440px)] sm:flex-row sm:items-center sm:justify-between"><p>© 2026 RMV Stainless Steel Fabrication. All rights reserved.</p><div className="flex gap-5"><Link to="/privacy" className="hover:text-[#F5B400]">Privacy Policy</Link><Link to="/terms" className="hover:text-[#F5B400]">Terms of Service</Link></div></div></div>
    </footer>
  );
}
