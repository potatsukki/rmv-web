import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Phone, Mail, Layers, Maximize, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SERVICE_CATALOG, getServiceById } from '@/lib/service-catalog';

export function ServiceDetailsPage() {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const service = getServiceById(serviceId);

  if (!service) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Service not found</h1>
        <p className="mt-4 text-base text-white/60">The service you are looking for is not available. Please return to the home page and choose a service.</p>
        <div className="mt-8">
          <Link to="/" className="text-sm font-semibold text-white hover:text-white/80">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050608] text-white min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Service Detail</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{service.label}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/70">{service.shortDescription}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-none border-none bg-[#1f2937] text-white hover:bg-slate-800">
              <Link to="/appointments/book" state={{ from: { pathname: '/appointments/book' } }}>
                Book Appointment
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-none">
              <Link to="/">Back to Landing</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 text-white/80">
                <service.icon className="h-6 w-6 text-amber-700" aria-hidden="true" />
                <p className="text-sm uppercase tracking-[0.24em] text-white/50">{service.headline}</p>
              </div>
              <p className="mt-6 text-lg leading-8 text-white/80">{service.capabilityDescription}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Best for</p>
                  <p className="mt-3 text-base leading-7 text-white/80">{service.bestFor}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Scope</p>
                  <p className="mt-3 text-base leading-7 text-white/80">{service.scopeNote}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle>Service Features</CardTitle>
                    <CardDescription>Our standard offering for this fabrication category.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {service.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-amber-600" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle>Service Systems</CardTitle>
                    <CardDescription>Typical systems included in this work package.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {service.systems.map((system) => (
                        <div key={system} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/80">
                          {system}
                        </div>
                      ))}
                    </div>
                  </CardContent>
              </Card>
            </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-white/50">Project Portfolio</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Recent completed projects</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    <Layers className="h-4 w-4" /> Service category
                  </div>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {service.projects.map((project) => (
                    <article key={project.title} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm">
                      <img src={project.image} alt={project.title} className="h-44 w-full object-cover" />
                      <div className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">{project.location}</p>
                        <h3 className="mt-3 text-lg font-semibold text-white">{project.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">{project.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border-white/10 bg-white/5 p-8 shadow-sm">
              <CardHeader>
                <CardTitle>Quick Contact</CardTitle>
                <CardDescription>Speak with our team or book directly from the service detail page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 text-slate-700">
                  <Phone className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">Call us</p>
                    <p className="text-sm text-white/60">(+63) 917-000-0000</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">Email</p>
                    <p className="text-sm text-white/60">info@rmvfabrication.app</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-slate-700">
                  <MapPin className="mt-1 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">Workshop</p>
                    <p className="text-sm leading-6 text-white/60">123 Fabrication Road, Industrial City, Metro Manila</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-white/5 p-8 shadow-sm">
              <CardHeader>
                <CardTitle>Ready to proceed?</CardTitle>
                <CardDescription>Book a consultation and start your project with confidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/60">
                  <p className="font-semibold text-white">Why choose RMV?</p>
                  <p className="mt-2">Transparent costing, experienced fabricators, and project updates every step of the way.</p>
                </div>
                <Button asChild className="h-14 w-full rounded-none border-none bg-[#1f2937] text-white hover:bg-slate-800">
                  <Link to={`/appointments/book?serviceType=${service.serviceType ?? 'custom'}`}>
                    Avail Service
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <Maximize className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold">Focused outcome</p>
                  <p className="text-sm text-white/60">We take your priorities and turn them into a project plan with budget clarity.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Browse other services</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Explore our full service catalogue</h2>
            </div>
            <Button asChild variant="outline" className="h-12 rounded-none">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SERVICE_CATALOG.filter((item) => item.id !== service.id).map((item) => (
              <Link key={item.id} to={`/services/${item.id}`} className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 transition hover:border-amber-500 hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-slate-900">{item.label}</p>
                </div>
                <p className="mt-3 leading-6 text-white/60">{item.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
