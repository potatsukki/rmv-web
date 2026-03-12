import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { X } from 'lucide-react';
import App from './App';
import './index.css';
import { bootstrapThemePreference } from './stores/theme.store';

bootstrapThemePreference();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/* ── Industrial / Fabrication-style toast base ── */
const toastBase: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
  fontSize: '13.5px',
  fontWeight: 500,
  lineHeight: 1.5,
  padding: '0',
  borderRadius: '14px',
  background: '#1d1d1f',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow:
    '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
  maxWidth: '420px',
  overflow: 'hidden',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 24 }}
        toastOptions={{
          duration: 3500,
          style: toastBase,
          success: {
            duration: 3000,
            style: toastBase,
            iconTheme: { primary: '#34c759', secondary: '#1d1d1f' },
          },
          error: {
            duration: 5000,
            style: toastBase,
            iconTheme: { primary: '#ff453a', secondary: '#1d1d1f' },
          },
          loading: {
            style: toastBase,
            iconTheme: { primary: '#0a84ff', secondary: '#1d1d1f' },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t} style={{ ...toastBase, ...(t.style || {}) }}>
            {({ icon, message }) => {
              // Accent color strip on the left
              const accentColor =
                t.type === 'success' ? '#34c759'
                : t.type === 'error'   ? '#ff453a'
                : t.type === 'loading' ? '#0a84ff'
                : '#6e6e73';

              return (
                <div className="flex items-stretch w-full">
                  {/* Accent bar */}
                  <div
                    className="shrink-0"
                    style={{
                      width: '4px',
                      background: accentColor,
                      borderRadius: '14px 0 0 14px',
                    }}
                  />
                  {/* Icon */}
                  <div className="flex items-center pl-3.5 pr-1 py-3.5 shrink-0">
                    {icon}
                  </div>
                  {/* Message */}
                  <div className="flex-1 py-3.5 pr-2 text-[13.5px]" style={{ color: '#f5f5f7' }}>
                    {message}
                  </div>
                  {/* Dismiss button */}
                  {t.type !== 'loading' && (
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="shrink-0 flex items-center px-3 hover:bg-white/10 transition-colors rounded-r-[14px]"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5 text-[#86868b] hover:text-white transition-colors" />
                    </button>
                  )}
                </div>
              );
            }}
          </ToastBar>
        )}
      </Toaster>
    </QueryClientProvider>
  </StrictMode>,
);
