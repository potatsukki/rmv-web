import type { ReactNode } from 'react';
import { Headphones, LockKeyhole, ShieldCheck } from 'lucide-react';

type AuthVariant = 'login' | 'register';

interface AuthLayoutProps {
  variant: AuthVariant;
  children: ReactNode;
}

function AuthLogo() {
  return (
    <div className="auth-logo">
      {/* Decorative: the brand name is the visible text beside it. */}
      <img src="/rmv-logo-256.png" alt="" />
      <span>
        <strong>RMV</strong>
        <small>STAINLESS STEEL<br />FABRICATION</small>
      </span>
    </div>
  );
}

function AuthVisualPanel() {
  return (
    <aside className="auth-visual" aria-label="RMV Stainless Steel Fabrication">
      <div className="auth-visual__image" aria-hidden="true" />
      <div className="auth-visual__wash" aria-hidden="true" />
      <div className="auth-visual__content">
        <AuthLogo />
        <div className="auth-visual__brand-frame">
          <img src="/rmv-logo-256.png" alt="" aria-hidden="true" />
          <p><strong>RMV</strong> FABRICATION</p>
          <span>EST. 2018</span>
          <small>HIGH -GRADED INDUSTRIAL SOLUTIONS<br />&amp; PRECISION ENGINEERED</small>
        </div>
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
          <AuthVisualPanel />
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
