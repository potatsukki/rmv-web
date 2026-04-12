const fs = require('fs');

function overhaulVerifyOTPPage() {
    const path = 'src/pages/auth/VerifyOTPPage.tsx';
    let content = fs.readFileSync(path, 'utf8');

    // Update main container
    content = content.replace(
        'className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4"',
        'className="landing-atelier relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white/90"'
    );

    // Update Card
    content = content.replace(
        'className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,30,0.94)_0%,rgba(7,10,14,0.98)_100%)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"',
        'className="relative mx-auto w-full max-w-md border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl sm:p-10"'
    );

    // Update OTP Input classes
    content = content.replace(
        /const otpInputClasses =\s+'auth-input h-14 w-12 rounded-xl border-white\/10 bg-white\/\[0\.05\] text-center text-xl font-bold text-\[#f5f7fa\] shadow-none placeholder:text-\[#7f8895\] focus-visible:ring-\[#d6b36a\]\/35';/,
        "const otpInputClasses = 'label-font h-16 w-12 rounded-none border border-white/10 bg-white/[0.03] text-center text-2xl font-black tracking-tighter text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0';"
    );

    // Update primary button
    content = content.replace(
        'className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%)] font-semibold text-[#14181d] shadow-[0_20px_40px_rgba(148,112,47,0.28)] hover:bg-[linear-gradient(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%)]"',
        'className="label-font brass-gradient h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"'
    );

    // Update Heading fonts
    content = content.replace(
        'className="text-xl font-bold text-[#f5f7fa]"',
        'className="headline-font text-2xl font-bold tracking-tight text-white"'
    );
    content = content.replace(
        'className="mt-2 text-sm text-[#98a3b2]"',
        'className="label-font mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#919097]"'
    );

    // Sidebar panels removal/update
    content = content.replace('className="pointer-events-none absolute left-[10%] top-1/2 hidden w-[15rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block"', 'className="pointer-events-none absolute left-[8%] top-1/2 hidden w-[18rem] -translate-y-1/2 border border-white/5 bg-white/[0.01] p-8 text-left backdrop-blur-xl xl:block"');
    content = content.replace('className="pointer-events-none absolute right-[9%] top-1/2 hidden w-[14rem] -translate-y-1/2 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-md xl:block"', 'className="pointer-events-none absolute right-[8%] top-1/2 hidden w-[18rem] -translate-y-1/2 border border-white/5 bg-white/[0.01] p-8 text-left backdrop-blur-xl xl:block"');

    // Remove noise svg from lines
    content = content.replace('<div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: \'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")\' }} />', '<div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />');

    fs.writeFileSync(path, content);
}

overhaulVerifyOTPPage();
console.log('VerifyOTPPage overhauled.');
