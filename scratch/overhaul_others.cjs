const fs = require('fs');

const PATHS = [
    'src/pages/auth/ResetPasswordPage.tsx',
    'src/pages/auth/VerifyTwoFactorPage.tsx',
    'src/pages/auth/CompleteProfilePage.tsx'
];

function overhaulGeneric(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');

    // Update main container
    content = content.replace(
        'className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4"',
        'className="landing-atelier relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white/90"'
    );

    // Update Card
    content = content.replace(
        /className="(relative mx-auto w-full max-w-md rounded-\[2rem\] border border-white\/10 bg-\[linear-gradient\(180deg,rgba\(17,23,30,0\.94\)_0%,rgba\(7,10,14,0\.98\)_100%\)\] p-8 shadow-\[0_30px_80px_rgba\(0,0,0,0\.45\),inset_0_1px_0_rgba\(255,255,255,0\.06\)\] backdrop-blur-xl|rounded-\[2rem\] border border-white\/10 bg-\[linear-gradient\(180deg,rgba\(17,23,30,0\.94\)_0%,rgba\(7,10,14,0\.98\)_100%\)\] p-8 shadow-\[0_30px_80px_rgba\(0,0,0,0\.45\),inset_0_1px_0_rgba\(255,255,255,0\.06\)\] backdrop-blur-xl)"/,
        'className="relative mx-auto w-full max-w-md border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl sm:p-10"'
    );

    // Update input classes
    content = content.replace(
        /const inputClasses =\s+'auth-input h-11 rounded-xl border-white\/10 bg-white\/\[0\.05\] text-\[#f5f7fa\] placeholder:text-\[#7f8895\] shadow-none focus-visible:ring-\[#d6b36a\]\/35';/,
        "const inputClasses = 'label-font h-12 rounded-none border-white/5 bg-white/[0.03] text-sm tracking-widest text-white placeholder:text-[#5a5a60] focus-visible:border-[#FFD700]/30 focus-visible:ring-0';"
    );

    // Update primary button
    content = content.replace(
        /className="h-11 w-full rounded-xl bg-\[linear-gradient\(135deg,#e2c98f_0%,#c69b4e_45%,#8f6a2f_100%\)\] font-semibold text-\[#14181d\] shadow-\[0_20px_40px_rgba\(148,112,47,0\.28\)\] hover:bg-\[linear-gradient\(135deg,#ead39d_0%,#d2ab60_45%,#9f7739_100%\)\]"/,
        'className="label-font brass-gradient h-12 w-full rounded-none border-none text-[11px] font-black uppercase tracking-[0.3em] text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"'
    );

    // Update Heading fonts
    content = content.replace(
        'className="text-xl font-bold text-[#f5f7fa]"',
        'className="headline-font text-2xl font-bold tracking-tight text-white"'
    );
     content = content.replace(
        'className="text-2xl font-bold tracking-tight text-[#f5f7fa]"',
        'className="headline-font text-3xl font-bold tracking-tight text-white"'
    );

    // Update Label styles
    content = content.replace(/className="text-\[13px\] font-medium text-\[#d8dee6\]"/g, 'className="label-font text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] gold-glow"');

    // Remove noise svg from lines
    content = content.replace('<div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: \'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")\' }} />', '<div className="blueprint-grid absolute inset-0 opacity-20 pointer-events-none" />');

    fs.writeFileSync(path, content);
}

PATHS.forEach(overhaulGeneric);
console.log('Other auth pages overhauled.');
