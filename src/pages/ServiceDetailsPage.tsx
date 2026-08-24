import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Mail, MapPin, Phone, X } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { LANDING_SERVICE_VARIANTS, toCustomerFacingServiceNote } from '@/pages/LandingPage';
import { useAuthStore } from '@/stores/auth.store';
import {
  LEGACY_SERVICE_REDIRECTS,
  SERVICE_CATALOG,
  getServiceById,
  getServiceProjectId,
  type ServiceProject,
} from '@/lib/service-catalog';
import { buildBookingIntentPath } from '@/lib/booking-intent';
import { setStoredAuthContinuationPath } from '@/lib/auth-session';

const OFFICE = {
  tel: '02-9506187',
  mobile: '0945 285 2974',
  email: 'rmvstainless@gmail.com',
  address: 'BIR Village, Novaliches, Quezon City, Metro Manila 1118',
  hours: 'Mon - Sat: 8:00 AM - 6:00 PM',
  directionsUrl: 'https://www.google.com/maps?q=14.6995125,121.053703125',
};

const PROCESS = ['Consultation & site review', 'Custom fabrication', 'Quality check', 'Installation support'];

const RAILING_PRICE_GUIDANCE: Record<string, { estimate: string; note: string }> = {
  'Commercial stainless guardrail': { estimate: '₱3,500 – ₱9,500 per linear meter', note: 'Final cost depends on length, post spacing, rail count, tube size, stainless grade, mounting surface, and installation difficulty.' },
  'Outdoor stainless stair railing': { estimate: '₱4,000 – ₱10,500 per linear meter', note: 'Final cost depends on stair slope, number of steps, total rail length, post placement, stainless grade, tube size, and outdoor exposure.' },
  'Terrace stainless railing': { estimate: '₱3,800 – ₱10,000 per linear meter', note: 'Final cost depends on total terrace length, corner sections, post spacing, stainless grade, rail count, tube size, and mounting condition.' },
  'Indoor stainless stair railing': { estimate: '₱3,500 – ₱9,000 per linear meter', note: 'Final cost depends on stair length, stair angle, landing sections, post count, rail count, tube size, finish, and mounting style.' },
  'Glass stainless balcony railing': { estimate: '₱7,500 – ₱16,500 per linear meter', note: 'Final cost depends on glass thickness, glass panel size, stainless grade, post spacing, clamp type, top rail, and installation complexity.' },
  'Wall-mounted stainless handrail': { estimate: '₱2,800 – ₱7,500 per linear meter', note: 'Final cost depends on total length, bracket count, wall material, tube size, stainless grade, bends, end caps, and installation access.' },
  'Balcony horizontal stainless railing': { estimate: '₱3,500 – ₱9,500 per linear meter', note: 'Final cost depends on balcony length, post spacing, rail count, tube size, stainless grade, corner sections, and installation condition.' },
};

const ADDITIONAL_PROJECT_PRICE_GUIDANCE: Record<string, string> = {
  'Double swing gate': '₱35,000 – ₱120,000+',
  'Modern metal gate': '₱45,000 – ₱150,000+',
  'Commercial security gate': '₱40,000 – ₱160,000+',
  'Pedestrian gate': '₱12,000 – ₱45,000+',
  'Corner counter with open shelf': '₱30,000 – ₱85,000+',
  'Sink and drainer workstation': '₱25,000 – ₱65,000+',
  'Island preparation table': '₱15,000 – ₱55,000+',
  'Drawer base workstation': '₱35,000 – ₱95,000+',
  'Walkway canopy': '₱4,500 – ₱12,000 per square meter',
  'Garage carport canopy': '₱55,000 – ₱250,000+',
  'Storefront canopy': '₱25,000 – ₱120,000+',
  'Entrance canopy': '₱18,000 – ₱85,000+',
  'Tall storage cabinet': '₱28,000 – ₱85,000+',
  'Drawer and shelf cabinet': '₱35,000 – ₱95,000+',
  'Overhead cabinet': '₱22,000 – ₱70,000+',
  'Full cabinet system': '₱80,000 – ₱220,000+',
  'Stainless storage cabinet': '₱18,000 – ₱95,000+',
  'Food cart kiosk frame': '₱35,000 – ₱180,000+',
  'Utility frame': '₱15,000 – ₱120,000+',
  'Stainless work table': '₱10,000 – ₱65,000+',
  'Indoor stair railing': '₱3,500 – ₱9,000 per linear meter',
  'Outdoor stair railing': '₱4,000 – ₱10,500 per linear meter',
  'Commercial guardrail': '₱3,500 – ₱9,500 per linear meter',
  'Decorative stainless gate': '₱35,000 – ₱140,000+',
  'Modern mixed metal gate': '₱45,000 – ₱150,000+',
};

const STANDARD_PRICE_NOTE = 'Final quotation depends on actual measurements, material grade and thickness, finish, and installation requirements.';

const SERVICE_DETAIL_NOTES: Record<string, string[]> = {
  gates: ['Measurements: confirm clear opening width, height, swing or sliding clearance, and panel count', 'Material & finish: choose stainless, painted steel, or mixed metal frame; confirm panel style and lock hardware', 'Installation & quote: send opening photos, post-to-post size, ground slope, and preferred operation'],
  'kitchen-counter': ['Measurements: confirm length, depth, height, backsplash, and all sink or appliance cutouts', 'Material & finish: SS304 food-grade typical; confirm gauge, brushed finish, and edge style', 'Installation & quote: send site photos, a rough sketch, sink specifications, plumbing points, and dimensions'],
  canopy: ['Measurements: confirm width, projection, clearance height, and required support posts', 'Material & finish: select polycarbonate, metal, or glass roofing with the required structural frame and drainage', 'Installation & quote: send facade photos, wall material, drainage route, and mounting-point details'],
  staircase: ['Measurements: confirm total rise, run, stair width, landing sizes, and access route', 'Material & finish: confirm structural frame, tread material, railing style, and finish', 'Installation & quote: send site photos, a rough layout, floor-to-floor height, and intended use'],
  'kitchen-cabinet': ['Measurements: confirm cabinet length, depth, height, module count, and shelf spacing', 'Material & finish: choose SS201 or SS304, gauge, finish, door type, handles, and locks', 'Installation & quote: send module layout, photos, dimensions, door direction, shelf needs, and wall support details'],
  fences: ['Measurements: confirm perimeter length, required height, post locations, gate connection, and ground condition', 'Material & finish: confirm frame type, panel or slat layout, coating, and visibility or privacy level', 'Installation & quote: send boundary photos, dimensions, desired layout, and mounting or footing conditions'],
  custom: ['Measurements: confirm primary dimensions, quantity, component count, and load or use requirement', 'Material & finish: select stainless, steel, GI, aluminum, or mixed metal with the required gauge and finish', 'Installation & quote: send purpose, dimensions, material, finish, photos, and a sketch or reference design'],
};

export function ServiceDetailsPage() {
  const { serviceId } = useParams();
  const { user } = useAuthStore();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const service = getServiceById(serviceId);
  const sharedVariants = service ? LANDING_SERVICE_VARIANTS[service.serviceType] : undefined;
  const projectCount = sharedVariants?.length ?? service?.projects.length ?? 0;

  useEffect(() => {
    if (!service) return;
    document.title = `${service.label} | RMV Stainless Steel Fabrication`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', service.shortDescription);
  }, [service]);

  useEffect(() => {
    if (selectedProject === null || !service) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setSelectedProject((current) => current === null ? null : (current - 1 + projectCount) % projectCount);
      if (event.key === 'ArrowRight') setSelectedProject((current) => current === null ? null : (current + 1) % projectCount);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [projectCount, selectedProject, service]);

  if (serviceId && LEGACY_SERVICE_REDIRECTS[serviceId]) return <Navigate to={`/services/${LEGACY_SERVICE_REDIRECTS[serviceId]}`} replace />;

  if (!service) {
    return (
      <div className="min-h-screen bg-[#090B0D] text-white"><LandingNavbar /><main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#F5B400]">Service not found</p><h1 className="mt-4 font-['Sora',sans-serif] text-4xl font-extrabold uppercase">Choose a service to explore</h1><Link to="/#services" className="mt-8 inline-flex items-center gap-3 rounded-md bg-[#F5B400] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#090B0D]"><ArrowLeft className="h-4 w-4" />Back to services</Link></main></div>
    );
  }

  const projects: ServiceProject[] = sharedVariants?.map((variant) => ({
    title: variant.title,
    image: variant.image,
    alt: variant.title,
    description: variant.description,
    estimatedPrice: variant.estimatedPrice,
    priceNote: variant.priceNote,
    detailGroups: variant.confirmationGroups.map((group) => ({
      title: group.title,
      items: group.items.map((item) => {
        const customerNote = toCustomerFacingServiceNote(item.note);
        return `${item.label}: ${item.value}${customerNote ? ` — ${customerNote}` : ''}`;
      }),
    })),
  })) ?? service.projects;
  const currentProject = selectedProject === null ? null : projects[selectedProject];
  const currentVariant = selectedProject === null ? undefined : sharedVariants?.[selectedProject];
  const quoteBookingTarget = buildBookingIntentPath({
    serviceType: service.serviceType,
    serviceId: service.id,
  });
  const designBookingTarget = currentProject
    ? buildBookingIntentPath({
        serviceType: service.serviceType,
        serviceId: service.id,
        designId: currentVariant?.id ?? getServiceProjectId(service.id, currentProject.title),
        design: currentProject.title,
        designImage: currentProject.image,
      })
    : quoteBookingTarget;
  const quoteTarget = user ? quoteBookingTarget : '/login';
  const designRequestTarget = user ? designBookingTarget : '/login';
  const rememberGuestBooking = (target: string) => {
    if (!user) setStoredAuthContinuationPath(target);
  };
  const priceGuidance = currentProject ? RAILING_PRICE_GUIDANCE[currentProject.title] : undefined;
  const priceEstimate = currentProject ? currentProject.estimatedPrice ?? priceGuidance?.estimate ?? ADDITIONAL_PROJECT_PRICE_GUIDANCE[currentProject.title] : undefined;
  const serviceFallbackNotes = SERVICE_DETAIL_NOTES[service.id]
    ?? service.measurementNotes
    ?? ['Final dimensions are confirmed after site measurement and design review.'];
  const projectNotes = currentProject?.detailGroups?.flatMap((group) => group.items.map((item) => `${group.title}: ${item}`))
    ?? (currentProject?.measurements?.length
      ? currentProject.measurements
      : serviceFallbackNotes);
  const measurementNotes = priceEstimate
    ? [`Estimated price: ${priceEstimate}`, `Price factors: ${currentProject?.priceNote ?? priceGuidance?.note ?? STANDARD_PRICE_NOTE}`, ...projectNotes]
    : projectNotes;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#090B0D] text-white selection:bg-[#F5B400]/30">
      <LandingNavbar />
      <main>
        <section className="relative isolate min-h-[640px] overflow-hidden pt-16 lg:min-h-[720px] lg:pt-[72px]">
          <img src={service.coverImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,8,0.98)_0%,rgba(5,7,8,0.88)_42%,rgba(5,7,8,0.38)_74%,rgba(5,7,8,0.7)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#090B0D] via-transparent to-black/35" />
          <div className="relative mx-auto flex min-h-[576px] w-[min(calc(100%_-_32px),1320px)] items-center py-12 sm:w-[min(calc(100%_-_48px),1320px)] lg:min-h-[648px] lg:py-16">
            <Link to="/#services" className="absolute top-10 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 transition hover:text-[#F5B400]"><ArrowLeft className="h-4 w-4" />All services</Link>
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#F5B400]">{service.eyebrow}</p>
              <h1 className="mt-4 font-['Sora',sans-serif] text-[clamp(2.7rem,7vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em]">{service.label}</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">{service.shortDescription}</p>
              <div className="mt-8 flex"><Link to={quoteTarget} state={user ? undefined : { from: quoteBookingTarget }} onClick={() => rememberGuestBooking(quoteBookingTarget)} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-md bg-[#F5B400] px-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#090B0D] transition hover:-translate-y-0.5 hover:bg-[#FFD047]">Avail Service<ArrowRight className="h-4 w-4" /></Link></div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#12161A]"><div className="mx-auto grid w-[min(calc(100%_-_32px),1320px)] grid-cols-2 sm:w-[min(calc(100%_-_48px),1320px)] lg:grid-cols-4">{PROCESS.map((step, index) => <div key={step} className="border-white/10 px-5 py-7 text-center lg:border-l lg:first:border-l-0"><span className="text-xs font-extrabold text-[#F5B400]">0{index + 1}</span><p className="mt-2 text-xs font-bold uppercase leading-5 tracking-[0.08em] text-white/84">{step}</p></div>)}</div></section>

        <section className="bg-[#F7F7F5] py-16 text-[#111417] sm:py-20 lg:py-28"><div className="mx-auto grid w-[min(calc(100%_-_32px),1240px)] gap-12 sm:w-[min(calc(100%_-_48px),1240px)] lg:grid-cols-[1.2fr_0.8fr] lg:gap-20"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#D99C00]">What we do</p><h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,4rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">Designed for the way your space works.</h2><p className="mt-7 max-w-2xl text-base leading-8 text-[#535B62] sm:text-lg">{service.capabilityDescription}</p><div className="mt-9 grid gap-3 sm:grid-cols-3">{service.tags.map((tag) => <div key={tag} className="flex items-start gap-3 border-t border-[#D7DADF] py-4 text-sm font-bold leading-6 text-[#272D32]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E7A800]" />{tag}</div>)}</div></div><aside className="self-start border border-[#D7DADF] bg-white p-7 shadow-[0_18px_45px_rgba(12,16,20,0.08)] sm:p-8"><service.icon className="h-8 w-8 text-[#E7A800]" /><p className="mt-6 text-xs font-extrabold uppercase tracking-[0.17em] text-[#D99C00]">Best for</p><p className="mt-3 text-lg font-bold leading-8">{service.bestFor}</p><div className="mt-7 border-t border-[#E4E6E8] pt-6"><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#D99C00]">Project scope</p><p className="mt-3 text-sm leading-7 text-[#535B62]">{service.scopeNote}</p></div></aside></div></section>

        <section className="bg-[#101417] py-16 sm:py-20 lg:py-28"><div className="mx-auto w-[min(calc(100%_-_32px),1320px)] sm:w-[min(calc(100%_-_48px),1320px)]"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Selected work</p><h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,4rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">Project gallery</h2></div><p className="max-w-md text-sm leading-7 text-white/60">Select an image to inspect the completed work in more detail.</p></div><div className="mt-10 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[270px]">{projects.map((project, index) => <button key={project.image} type="button" onClick={() => setSelectedProject(index)} className={`group relative overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5B400] ${index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}><img src={project.image} alt={project.alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading={index > 1 ? 'lazy' : undefined} /><span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" /><span className="absolute inset-x-0 bottom-0 p-5"><span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#F5B400]">View project</span><span className="mt-2 block font-['Sora',sans-serif] text-lg font-bold text-white">{project.title}</span></span></button>)}</div></div></section>

        <section className="bg-[#F7F7F5] py-16 text-[#111417] sm:py-20"><div className="mx-auto grid w-[min(calc(100%_-_32px),1240px)] gap-10 sm:w-[min(calc(100%_-_48px),1240px)] lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#D99C00]">Service systems</p><h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.5rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">Built around your requirements.</h2><p className="mt-6 text-base leading-8 text-[#535B62]">Every project is confirmed against its site conditions, intended use, and approved fabrication scope.</p></div><div className="grid gap-3 sm:grid-cols-2">{service.systems.map((system) => <div key={system} className="flex min-h-24 items-center gap-4 border border-[#D7DADF] bg-white p-5 text-sm font-bold"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5B400] text-[#090B0D]"><CheckCircle2 className="h-5 w-5" /></span>{system}</div>)}</div></div></section>

        <section className="relative overflow-hidden bg-[#F5B400] py-14 text-[#090B0D]"><img src={service.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-multiply" /><div className="relative mx-auto grid w-[min(calc(100%_-_32px),1240px)] gap-8 sm:w-[min(calc(100%_-_48px),1240px)] lg:grid-cols-[1fr_0.8fr_auto] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em]">Start your project</p><h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]">Talk to RMV about your {service.label.toLowerCase()} project.</h2></div><div className="grid gap-3 text-sm font-semibold"><a href="tel:029506187" className="flex items-center gap-3"><Phone className="h-5 w-5" />{OFFICE.tel} / {OFFICE.mobile}</a><a href={`mailto:${OFFICE.email}`} className="flex items-center gap-3"><Mail className="h-5 w-5" />{OFFICE.email}</a><a href={OFFICE.directionsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3"><MapPin className="h-5 w-5" />Workshop directions</a><p className="flex items-center gap-3"><Clock3 className="h-5 w-5" />{OFFICE.hours}</p></div><Link to={quoteTarget} state={user ? undefined : { from: quoteBookingTarget }} onClick={() => rememberGuestBooking(quoteBookingTarget)} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-md bg-[#090B0D] px-7 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5">Avail Service<ArrowRight className="h-4 w-4" /></Link></div></section>

        <section className="bg-[#12161A] py-16 sm:py-20"><div className="mx-auto w-[min(calc(100%_-_32px),1320px)] sm:w-[min(calc(100%_-_48px),1320px)]"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Explore more</p><h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.5rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">Other services</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{SERVICE_CATALOG.filter((item) => item.id !== service.id).slice(0, 4).map((item) => <Link key={item.id} to={`/services/${item.id}`} className="group border border-white/10 bg-[#191E23] p-6 transition hover:-translate-y-1 hover:border-[#F5B400]"><item.icon className="h-6 w-6 text-[#F5B400]" /><h3 className="mt-10 font-['Sora',sans-serif] text-lg font-bold">{item.label}</h3><p className="mt-3 text-sm leading-6 text-white/58">{item.shortDescription}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5B400]">Explore<ArrowRight className="h-4 w-4" /></span></Link>)}</div></div></section>
      </main>
      <PublicFooter />

      <Dialog open={selectedProject !== null} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-6xl overflow-hidden border border-white/10 bg-[#090B0D] p-0 text-white"><DialogTitle className="sr-only">{currentProject?.title ?? 'Project image'}</DialogTitle>{currentProject && <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]"><div className="relative bg-black"><img src={currentProject.image} alt={currentProject.alt} className="h-full max-h-[78dvh] w-full object-contain" /><button type="button" onClick={() => setSelectedProject((current) => current === null ? 0 : (current - 1 + projects.length) % projects.length)} aria-label="Previous project image" className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 transition hover:border-[#F5B400]"><ChevronLeft className="h-6 w-6" /></button><button type="button" onClick={() => setSelectedProject((current) => current === null ? 0 : (current + 1) % projects.length)} aria-label="Next project image" className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 transition hover:border-[#F5B400]"><ChevronRight className="h-6 w-6" /></button><button type="button" onClick={() => setSelectedProject(null)} aria-label="Close project image" className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 transition hover:border-[#F5B400]"><X className="h-5 w-5" /></button></div><div className="flex max-h-[78dvh] flex-col overflow-y-auto p-6 sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5B400]">{String((selectedProject ?? 0) + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')} · Design reference</p><h3 className="mt-3 font-['Sora',sans-serif] text-2xl font-extrabold">{currentProject.title}</h3><p className="mt-5 text-sm leading-7 text-white/68">{currentProject.description ?? service.capabilityDescription}</p><div className="mt-7 border-t border-white/10 pt-6"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5B400]">Measurements to confirm</p><ul className="mt-4 grid gap-3 text-sm leading-6 text-white/72">{measurementNotes.map((note) => <li key={note} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" />{note}</li>)}</ul></div><Link to={designRequestTarget} state={user ? undefined : { from: designBookingTarget }} onClick={() => rememberGuestBooking(designBookingTarget)} className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#F5B400] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#090B0D] transition hover:bg-[#FFD047]">Avail This Design<ArrowRight className="h-4 w-4" /></Link><p className="mt-3 text-xs leading-5 text-white/45">Final dimensions and pricing are confirmed after site measurement and design review.</p></div></div>}</DialogContent>
      </Dialog>
    </div>
  );
}
