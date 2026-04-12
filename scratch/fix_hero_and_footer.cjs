const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import and remove internal header bits
content = "import { PublicNavbar } from '@/components/shared/PublicNavbar';\n" + content;

// Remove the old header from line ~273 to ~371
const headerStart = '<motion.header';
const headerEnd = '{/* Hero Section */}';
const headerStartIndex = content.indexOf(headerStart);
const headerEndIndex = content.indexOf(headerEnd);

if (headerStartIndex !== -1 && headerEndIndex !== -1) {
    content = content.substring(0, headerStartIndex) + '<PublicNavbar />\n\n        ' + content.substring(headerEndIndex);
}

// 2. Center Hero
content = content.replace(
    'className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 pt-24 text-left will-change-transform lg:px-12"',
    'className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 pt-24 text-center items-center will-change-transform lg:px-12"'
);

content = content.replace(
    'className="headline-font mb-10 py-2 text-[clamp(3rem,10.2vw,8.3rem)] font-bold leading-[0.86] tracking-[-0.02em] sm:max-w-4xl gpu-reveal"',
    'className="headline-font mb-12 py-2 text-[clamp(3rem,10.2vw,8.3rem)] font-bold leading-[0.86] tracking-[-0.02em] gpu-reveal"'
);

// 3. Fix Footer Links
const footerLinksOld = `                  {['About Us', 'Projects', 'Contact'].map((item) => (
                    <li key={item}>
                      <button 
                        type="button" 
                        onClick={() => document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })} 
                        className="label-font cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white"
                      >
                        {item}
                      </button>
                    </li>
                  ))}`;

const footerLinksNew = `                  {[
                    { label: 'About Us', id: 'about' },
                    { label: 'Projects', id: 'projects' },
                    { label: 'Contact', id: 'contact' }
                  ].map((item) => (
                    <li key={item.label}>
                      <button 
                        type="button" 
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })} 
                        className="label-font cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:text-white"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}`;

content = content.replace(footerLinksOld, footerLinksNew);

fs.writeFileSync(path, content);
console.log('Hero centered, Navbar extracted, and Footer links fixed.');
