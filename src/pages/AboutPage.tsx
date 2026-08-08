import {
  Award,
  Building2,
  Clock,
  Flame,
  HardHat,
  Home,
  PackageCheck,
  PenTool,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wind,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { useAuthStore } from '@/stores/auth.store';

type StoryItem = {
  label: string;
  title: string;
  description: string;
};

type IconCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const storyItems: StoryItem[] = [
  {
    label: 'Foundation',
    title: 'Hands-on fabrication leadership',
    description:
      'Mr. Reden M. Verdadero began his steel fabrication journey as a Project Manager, building practical experience in how projects move from measurement to finished work.',
  },
  {
    label: 'ANRO',
    title: 'ANRO Stainless Steel Fabrication',
    description:
      'His early role at ANRO Stainless Steel Fabrication shaped his discipline in project handling, coordination, and stainless fabrication work.',
  },
  {
    label: 'Kitchen works',
    title: 'IB COM Kitchen Equipments Manila Inc.',
    description:
      'He continued to refine his skills at IB COM Kitchen Equipments Manila Inc., focusing on stainless kitchen equipment fabrication.',
  },
  {
    label: 'Industry depth',
    title: 'MERIT Stainless Steel Inc.',
    description:
      'Experience with reputable companies such as MERIT Stainless Steel Inc. strengthened his technical background and industry knowledge.',
  },
  {
    label: 'Oct 2018',
    title: 'RM Verdadero Steel Fabrication',
    description:
      "Drawing from years of experience, Mr. Verdadero founded RM Verdadero Steel Fabrication in October 2018 with a goal to become one of the country's leading fabricators.",
  },
];

const services: IconCard[] = [
  {
    title: 'Kitchen Stainless Steel Fabrication',
    description:
      'Custom stainless equipment and fabricated kitchen components for commercial food-service environments.',
    icon: Utensils,
  },
  {
    title: 'Kitchen Planning & Remodeling',
    description:
      'Planning and remodeling support for restaurants, malls, bakeries, cafes, canteens, hospitals, hotels, and resort F&B spaces.',
    icon: PenTool,
  },
  {
    title: 'LPG Gas Pipeline',
    description:
      'Gas pipeline works for food-service and commercial kitchen operations that need practical site-ready installation.',
    icon: Flame,
  },
  {
    title: 'Fire Suppression System',
    description:
      'Fire suppression support for kitchen and facility requirements where protection is part of the build.',
    icon: ShieldCheck,
  },
  {
    title: 'Exhaust & Fresh Air Systems',
    description:
      'Mechanical works for exhaust and fresh air systems supporting cleaner, more functional kitchen spaces.',
    icon: Wind,
  },
  {
    title: 'Railings',
    description:
      'Stainless railing fabrication for projects that need durable, fitted metalwork.',
    icon: Building2,
  },
  {
    title: 'Other Custom Stainless Fabrication',
    description:
      'Custom stainless fabrication for project-specific requirements beyond standard kitchen and railing work.',
    icon: Wrench,
  },
];

const advantages: IconCard[] = [
  {
    title: 'Experienced Fabrication Team',
    description: 'Built from years of hands-on stainless fabrication and project management experience.',
    icon: Award,
  },
  {
    title: 'Quality Stainless Materials',
    description: 'Focused on manufacturing services that meet practical customer requirements.',
    icon: Sparkles,
  },
  {
    title: 'Custom Built Solutions',
    description: 'Project-specific fabrication for kitchens, railings, pipelines, and other stainless needs.',
    icon: Wrench,
  },
  {
    title: 'Commercial & Residential Projects',
    description: 'Service coverage spans food-service businesses, facilities, and custom site work.',
    icon: Home,
  },
  {
    title: 'On-Time Delivery',
    description: 'The company vision emphasizes on-time or early deliveries for customers.',
    icon: Clock,
  },
  {
    title: 'Professional Installation',
    description: 'Site work is handled with measurement, installation, and project completion in mind.',
    icon: HardHat,
  },
];

const missionVision = [
  {
    title: 'Mission',
    text: 'We are committed to delivering quality manufacturing services to our customers, fostering an environment of continuous growth for both our customers and investors.',
  },
  {
    title: 'Vision',
    text: "Aspiring to be a world-class manufacturer, we aim to produce quality, custom, precision parts and fabrications that surpass customer expectations. Our success lies in providing on-time or early deliveries, affordable prices, and innovative ideas, services, and solutions that enhance our customers' products and businesses.",
  },
];

export function AboutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const bookingTarget = user ? '/appointments/book' : '/login';

  const goToBooking = () => {
    navigate(bookingTarget);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PublicNavbar />

      <main>
        <section className="relative isolate flex min-h-[560px] items-center overflow-hidden pt-20 sm:min-h-[600px]">
          <img
            src="/landing/hero/hero-stainless-railing-bg.png"
            alt="Stainless railing fabrication background"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#000_0%,rgba(0,0,0,0.9)_32%,rgba(0,0,0,0.28)_72%,rgba(0,0,0,0.55)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-black to-transparent" />

          <div className="mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <p className="label-font text-[11px] font-bold uppercase tracking-[0.32em] text-[#FFD700]">
                ABOUT RMV FABRICATION
              </p>
              <div className="mx-auto mt-5 h-0.5 w-16 bg-[#FFD700]" />
              <h1 className="headline-font mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[60px]">
                Built from experience. Focused on precision fabrication.
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                RMV Fabrication grew from Mr. Reden M. Verdadero&apos;s hands-on work in stainless
                steel fabrication, kitchen equipment, and project management. Today, the company
                serves customers with custom stainless and steel fabrication built around real site
                requirements.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8" id="story">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="label-font text-[11px] font-bold uppercase tracking-[0.3em] text-[#FFD700]">
                Company Story
              </p>
              <h2 className="headline-font mt-4 text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
                A fabrication company shaped by real project experience.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/62">
                The RMV story starts with industry work, stainless kitchen equipment fabrication,
                and a founder who turned that background into his own fabrication company.
              </p>
            </div>

            <div className="relative">
              <div className="absolute bottom-8 left-5 top-8 hidden w-px bg-white/10 sm:block" />
              <div className="space-y-5">
                {storyItems.map((item, index) => (
                  <article
                    key={item.title}
                    className="relative rounded-[18px] border border-white/10 bg-[#070808]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:ml-12"
                  >
                    <div className="absolute -left-[39px] top-7 hidden h-4 w-4 rounded-full border-2 border-black bg-[#FFD700] shadow-[0_0_0_8px_rgba(255,215,0,0.12)] sm:block" />
                    <div className="flex items-center gap-3">
                      <span className="label-font rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD700]">
                        {String(index + 1).padStart(2, '0')} / {item.label}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/62">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="label-font text-[11px] font-bold uppercase tracking-[0.3em] text-[#FFD700]">
                What We Do
              </p>
              <h2 className="headline-font mt-4 text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
                Stainless, kitchen, mechanical, and custom fabrication services.
              </h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.title}
                    className="group rounded-[18px] border border-white/10 bg-[#080909] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFD700]/40 hover:bg-[#10100a]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFD700]/10 text-[#FFD700] ring-1 ring-[#FFD700]/25">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-white">{service.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/60">{service.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-2">
              {missionVision.map((item) => (
                <article
                  key={item.title}
                  className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#080909] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:p-10"
                >
                  <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#FFD700]/10 blur-3xl" />
                  <p className="label-font text-[11px] font-bold uppercase tracking-[0.3em] text-[#FFD700]">
                    {item.title}
                  </p>
                  <p className="mt-6 text-xl font-semibold leading-9 text-white/82">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="label-font text-[11px] font-bold uppercase tracking-[0.3em] text-[#FFD700]">
                  Why Choose RMV
                </p>
                <h2 className="headline-font mt-4 text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
                  Built for customers who need practical, fitted metalwork.
                </h2>
                <p className="mt-5 text-base leading-8 text-white/62">
                  RMV combines fabrication experience, service-focused project handling, and custom
                  stainless solutions for business and site-specific needs.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {advantages.map((advantage) => {
                  const Icon = advantage.icon;

                  return (
                    <article
                      key={advantage.title}
                      className="rounded-[18px] border border-white/10 bg-[#080909] p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD700]/10 text-[#FFD700] ring-1 ring-[#FFD700]/25">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{advantage.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-white/56">{advantage.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-[#FFD700]/20 bg-[#FFD700] p-8 text-black shadow-[0_30px_90px_rgba(255,215,0,0.18)] sm:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label-font text-[11px] font-black uppercase tracking-[0.28em] text-black/58">
                  Start a Project
                </p>
                <h2 className="headline-font mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                  Ready to start your project?
                </h2>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-black/68">
                  Book an appointment so RMV can review your service needs, measurements, and
                  project requirements.
                </p>
              </div>
              <button
                type="button"
                onClick={goToBooking}
                className="label-font inline-flex h-14 cursor-pointer items-center justify-center gap-5 rounded-[10px] bg-black px-8 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-900 active:translate-y-0"
              >
                Book Project Visit
                <PackageCheck className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
