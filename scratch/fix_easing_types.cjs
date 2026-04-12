const fs = require('fs');

const PATHS = [
    'src/components/shared/PublicNavbar.tsx',
    'src/pages/PrivacyPolicyPage.tsx',
    'src/pages/TermsOfServicePage.tsx'
];

function fixEasingType(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    
    // Replace untyped constant with typed tuple
    content = content.replace(
        'const SMOOTH_240 = [0.22, 1, 0.36, 1];',
        'const SMOOTH_240: [number, number, number, number] = [0.22, 1, 0.36, 1];'
    );
    
    fs.writeFileSync(path, content);
}

PATHS.forEach(fixEasingType);
console.log('Easing type errors fixed.');
