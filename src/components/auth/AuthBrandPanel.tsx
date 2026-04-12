import { BrandLogo } from '@/components/shared/BrandLogo';

export function AuthBrandPanel() {
  return (
    <div className="landing-atelier relative hidden w-0 flex-1 lg:block">
      <div className="absolute inset-0 bg-[#0a0a0b]" />
      <div className="blueprint-grid absolute inset-0 opacity-20" />
      
      {/* Dynamic Gold Glow */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] translate-x-1/2 translate-y-1/2 bg-[radial-gradient(circle,rgba(160,160,166,0.05)_0%,transparent_70%)] blur-3xl" />

      <div className="absolute inset-0 flex items-center justify-center px-16">
        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <div className="group relative">
            {/* Double Frame Effect */}
            <div className="absolute -inset-4 border border-[#FFD700]/10" />
            <div className="absolute -inset-8 border border-[#FFD700]/5 transition-all duration-700 group-hover:scale-105" />
            
            <div className="relative border-[1.5px] border-[#FFD700]/30 bg-black/40 p-12 backdrop-blur-xl">
              <BrandLogo
                className="mx-auto h-32 w-32 grayscale brightness-[0.9] contrast-[1.1] transition-all duration-700 group-hover:grayscale-0 group-hover:brightness-100"
                alt="RMV Stainless & Steel Fabrication logo"
              />
              <div className="mt-10 space-y-4">
                <h1 className="text-shimmer headline-font text-3xl font-black uppercase tracking-[0.2em] text-white">
                  RMV FABRICATION
                </h1>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-[#FFD700]/30" />
                  <p className="label-font text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700] gold-glow">
                    Est. 2026
                  </p>
                  <div className="h-px w-8 bg-[#FFD700]/30" />
                </div>
                <p className="label-font mt-6 text-[11px] font-medium uppercase tracking-[0.25em] text-[#919097] leading-loose">
                  High-Grade Industrial Solutions<br />
                  Precision Engineered
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Technical annotation */}
      <div className="absolute bottom-12 left-12 label-font text-[9px] font-bold uppercase tracking-[0.4em] text-[#FFD700]/30">
        System Node: Auth_Primary
      </div>
    </div>
  );
}