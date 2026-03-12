import { BrandLogo } from '@/components/shared/BrandLogo';

export function AuthBrandPanel() {
  return (
    <div className="relative hidden w-0 flex-1 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(38,61,84,0.58)_0%,transparent_32%),radial-gradient(circle_at_bottom_right,rgba(176,133,68,0.18)_0%,transparent_24%),linear-gradient(160deg,#080b10_0%,#0c1016_44%,#121821_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        }}
      />
      <div className="absolute inset-y-0 left-0 w-px bg-white/6" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,12,0.04)_0%,rgba(5,8,12,0.26)_100%)]" />

      <div className="absolute inset-0 flex items-center justify-center px-12 py-16 lg:px-16">
        <div className="flex w-full max-w-[24rem] flex-col items-center text-center">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,25,33,0.78)_0%,rgba(10,13,18,0.88)_100%)] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <BrandLogo
              className="mx-auto h-28 w-28 ring-4 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
              alt="RMV Stainless Steel Fabrication logo"
            />
            <div className="mt-6 space-y-2">
              <p className="text-2xl font-bold tracking-tight text-[#f5f7fa]">RMV Stainless Steel</p>
              <p className="text-2xl font-bold tracking-tight text-[#f5f7fa]">Fabrication</p>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8692a1]">
                Management System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}