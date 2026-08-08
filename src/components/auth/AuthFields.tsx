import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  icon?: LucideIcon;
  error?: string;
  labelAction?: ReactNode;
}

export function AuthField({ id, label, registration, icon: Icon, error, labelAction, className, ...inputProps }: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      <div className="auth-field__label-row">
        <Label htmlFor={id} className="auth-field__label">{label}</Label>
        {labelAction}
      </div>
      <div className="auth-field__control">
        {Icon ? <Icon className="auth-field__icon" aria-hidden="true" /> : null}
        <Input
          id={id}
          className={`auth-field__input${Icon ? ' auth-field__input--icon' : ''}${className ? ` ${className}` : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
          {...registration}
        />
      </div>
      {error ? <p id={errorId} className="auth-field__error">{error}</p> : null}
    </div>
  );
}

interface PasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'icon'> {}

export function PasswordField({ id, label, registration, error, labelAction, className, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      <div className="auth-field__label-row">
        <Label htmlFor={id} className="auth-field__label">{label}</Label>
        {labelAction}
      </div>
      <div className="auth-field__control">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`auth-field__input auth-field__input--password${className ? ` ${className}` : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
          {...registration}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error ? <p id={errorId} className="auth-field__error">{error}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="auth-google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleAuthButton({ label, loading, disabled, onClick }: { label: string; loading: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="auth-google-button" onClick={onClick} disabled={disabled || loading} aria-label={label}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleMark />}
      {loading ? 'CONNECTING…' : label}
    </Button>
  );
}
