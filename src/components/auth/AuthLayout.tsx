import type { ReactNode } from 'react';
import { BadgeCheck, Headphones, LockKeyhole, ShieldCheck, Wrench } from 'lucide-react';

type AuthVariant = 'login' | 'register';

interface AuthLayoutProps {
  variant: AuthVariant;
  children: ReactNode;
}

const visualContent = {
  login: {
    image: '/landing/services/railings/04-indoor-stainless-stair-railing.png',
    imagePosition: 'center center',
  },
  register: {
    image: '/landing/about-legacy-welder.png',
    imagePosition: 'left center',
  },
} as const;

function AuthLogo() {
  return (
    <div className="auth-logo">
      <img src="/RMV_circle_true_transparent_v2.png" alt="RMV Stainless Steel Fabrication" />
      <span>
        <strong>RMV</strong>
        <small>STAINLESS STEEL<br />FABRICATION</small>
      </span>
    </div>
  );
}

function AuthVisualPanel({ variant }: { variant: AuthVariant }) {
  const visual = visualContent[variant];
  const isLogin = variant === 'login';

  return (
    <aside className={`auth-visual auth-visual--${variant}`} aria-label="RMV Stainless Steel Fabrication">
      <div
        className="auth-visual__image"
        style={{ backgroundImage: `url(${visual.image})`, backgroundPosition: visual.imagePosition }}
        aria-hidden="true"
      />
      <div className="auth-visual__wash" aria-hidden="true" />
      <div className="auth-visual__content">
        <AuthLogo />
        {isLogin ? (
          <div className="auth-visual__login-copy">
            <p className="auth-kicker">RMV Stainless Steel Fabrication</p>
            <h1>BUILT WITH<br /><em>PRECISION.</em><br />MADE TO LAST.</h1>
            <p className="auth-visual__description">
              High-quality stainless steel fabrication for residential, commercial, and industrial projects.
            </p>
            <div className="auth-visual__proofs" aria-label="RMV service strengths">
              <span><ShieldCheck aria-hidden="true" />Premium Quality Materials</span>
              <span><Wrench aria-hidden="true" />Expert Fabrication</span>
              <span><BadgeCheck aria-hidden="true" />On-Time Delivery</span>
            </div>
            <p className="auth-visual__est">EST. 2018</p>
          </div>
        ) : (
          <div className="auth-visual__brand-frame">
            <img src="/RMV_circle_true_transparent_v2.png" alt="" aria-hidden="true" />
            <p><strong>RMV</strong> FABRICATION</p>
            <span>EST. 2018</span>
            <small>HIGH-GRADE INDUSTRIAL SOLUTIONS<br />PRECISION ENGINEERED</small>
          </div>
        )}
      </div>
    </aside>
  );
}

function AuthTrustStrip() {
  const items = [
    { icon: LockKeyhole, title: 'Secure Access', copy: 'Your account access is protected' },
    { icon: ShieldCheck, title: 'Trusted Process', copy: 'Built for reliability' },
    { icon: Headphones, title: 'Dedicated Support', copy: 'We’re here to help' },
  ];

  return (
    <section className="auth-trust-strip" aria-label="Account trust information">
      <div className="auth-trust-strip__inner">
        {items.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="auth-trust-strip__item">
            <Icon aria-hidden="true" />
            <span><strong>{title}</strong><small>{copy}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuthFooter() {
  return (
    <footer className="auth-footer">
      <p>© {new Date().getFullYear()} RMV Stainless Steel Fabrication. All rights reserved.</p>
      <nav aria-label="Legal links">
        <a href="/privacy">Privacy Policy</a>
        <span aria-hidden="true">•</span>
        <a href="/terms">Terms of Service</a>
      </nav>
    </footer>
  );
}

export function AuthLayout({ variant, children }: AuthLayoutProps) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <main className="auth-shell__main">
        <div className="auth-shell__frame">
          <AuthVisualPanel variant={variant} />
          <section className="auth-form-panel" aria-label={variant === 'login' ? 'Sign in' : 'Create account'}>
            <div className="auth-form-panel__inner">{children}</div>
          </section>
        </div>
      </main>
      <AuthTrustStrip />
      <AuthFooter />
    </div>
  );
}
