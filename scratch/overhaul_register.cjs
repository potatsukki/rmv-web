const fs = require('fs');

function overhaulRegisterPage() {
    const path = 'src/pages/auth/RegisterPage.tsx';
    let content = fs.readFileSync(path, 'utf8');

    // Update main container
    content = content.replace(
        'className="relative flex min-h-screen overflow-hidden bg-[#05070a]"',
        'className="landing-atelier relative flex min-h-screen overflow-hidden bg-black text-white/90"'
    );

    // Update form column
    content = content.replace(
        'className="relative z-10 flex w-full flex-1 flex-col justify-center bg-[radial-gradient(circle_at_top_left,#1a2430_0%,#0d1218_50%,#05070a_100%)] px-6 py-8 lg:w-[54%] lg:flex-none lg:px-14 lg:py-6 xl:px-20 xl:py-8"',
        'className="relative z-10 flex w-full flex-1 flex-col justify-center bg-black px-6 py-8 lg:w-[54%] lg:flex-none lg:px-14 lg:py-6 xl:px-20 xl:py-8"'
    );

    // Update inner card container
    content = content.replace(
        'className="relative mx-auto w-full max-w-[520px] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-8 lg:max-w-[540px]"',
        'className="relative mx-auto w-full max-w-[520px] border border-white/5 bg-white/[0.02] p-7 backdrop-blur-3xl sm:p-8 lg:max-w-[540px]"'
    );

    // Update input classes
    content = content.replace(
        /const inputClasses =\s+'auth-input h-10 rounded-xl border-white\/10 bg-white\/\[0\.05\] text-sm text-\[#f5f7fa\] placeholder:text-\[#7f8895\] shadow-none focus-visible:ring-\[#d6b36a\]\/35';/,
        "const inputClasses = 'label-font h-11 rounded-none border-white/5 bg-white/[0.03] text-sm tracking-widest text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0';"
    );

    // Update primary button
    content = content.replace(
        'className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] transition-all hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)] active:scale-[0.98]"',
        'className="label-font brass-gradient mt-1 h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"'
    );

    // Update secondary button (Google)
    content = content.replace(
        'className="h-11 w-full rounded-xl border-[#d6dde6]/80 bg-white font-medium text-[#14181d] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_12px_24px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-[#b8c4d1] hover:bg-white hover:text-[#14181d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_16px_28px_rgba(0,0,0,0.16)] active:scale-[0.98] disabled:border-[#d6dde6]/60 disabled:bg-[#eef2f6] disabled:text-[#7d8794]"',
        'className="label-font h-12 w-full rounded-none border border-white/10 bg-white px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-zinc-100 hover:text-black"'
    );

    // Update Label styles
    content = content.replace(/className="text-\[13px\] font-medium text-\[#d8dee6\]"/g, 'className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow"');

    // Update Heading
    content = content.replace(
        'className="text-2xl font-bold tracking-tight text-[#f5f7fa]"',
        'className="headline-font text-3xl font-bold tracking-tight text-white"'
    );
    content = content.replace(
        'className="mt-1 text-sm text-[#98a3b2]"',
        'className="label-font mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#919097]"'
    );

    // Strength Meter cleanup
    content = content.replace('className="mt-2 rounded-xl border border-white/8 bg-white/[0.04] p-3"', 'className="mt-4 border border-white/5 bg-white/[0.01] p-4"');

    // Remove noise svg from lines
    content = content.replace('<div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: \'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")\' }} />', '');
    content = content.replace('<div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.18)_0%,transparent_70%)]" />', '<div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />');

    fs.writeFileSync(path, content);
}

overhaulRegisterPage();
console.log('RegisterPage overhauled.');
