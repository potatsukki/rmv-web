import { Check, Monitor, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUpdateProfile } from '@/hooks/useUsers';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
  description: string;
}> = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Bright interface for well-lit workspaces.' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Darker native palette for the authenticated app.' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow the device theme automatically.' },
];

export function AccountAppearancePage() {
  const updateAppearance = useUpdateProfile();
  const { themePreference, resolvedTheme, setThemePreference } = useThemeStore();

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    const previousTheme = themePreference;

    setThemePreference(nextTheme);

    try {
      await updateAppearance.mutateAsync({ themePreference: nextTheme });
      toast.success(`${nextTheme.charAt(0).toUpperCase()}${nextTheme.slice(1)} mode enabled`);
    } catch {
      setThemePreference(previousTheme);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-[color:var(--color-border)]/60 bg-[var(--metal-panel-background)] text-[var(--color-card-foreground)] shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--color-card-foreground)]">
            {resolvedTheme === 'dark' ? <Moon className="h-5 w-5 text-[var(--color-accent)]" /> : <Sun className="h-5 w-5 text-[var(--color-warning)]" />}
            Appearance
          </CardTitle>
          <CardDescription className="text-[var(--text-metal-muted-color)]">
            Set how the authenticated app should look after you sign in. This preference is saved to your account and follows you across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--color-border)]/55 bg-[color:var(--color-card)]/70 p-4 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Theme preference</p>
              <p className="mt-1 text-base font-semibold text-[var(--color-card-foreground)]">
                {themePreference === 'system' ? 'Following your device theme' : `Using ${themePreference} mode`}
              </p>
              <p className="mt-2 text-sm text-[var(--text-metal-muted-color)]">
                Pick a mode here instead of changing it from the Profile page. The active selection updates the app immediately and remains attached to your account.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)]/55 bg-[color:var(--color-card)]/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Current output</p>
              <p className="mt-1 text-base font-semibold capitalize text-[var(--color-card-foreground)]">{resolvedTheme} palette</p>
              <p className="mt-2 text-sm text-[var(--text-metal-muted-color)]">
                The interface resolves to {resolvedTheme} right now based on your stored preference.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = themePreference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateAppearance.isPending || isActive}
                  onClick={() => handleThemeChange(option.value)}
                  className={[
                    'group relative flex min-h-[176px] flex-col justify-between rounded-2xl border p-5 text-left transition-all',
                    isActive
                      ? 'border-[var(--color-card-foreground)] bg-[color:var(--color-card)] text-[var(--color-card-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.22)]'
                      : 'border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/60 text-[var(--text-metal-muted-color)] hover:-translate-y-0.5 hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-card)]/82 hover:text-[var(--color-card-foreground)]',
                  ].join(' ')}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-current">
                        <Icon className="h-5 w-5" />
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/12 dark:text-emerald-200">
                          <Check className="h-3.5 w-3.5" />
                          Active
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em]">{option.label}</p>
                      <p className="mt-2 text-sm leading-6 text-current/80">{option.description}</p>
                    </div>
                  </div>

                  <p className="mt-5 text-xs text-current/65">
                    {isActive ? 'This is your saved account preference.' : 'Click to switch the app to this mode.'}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}