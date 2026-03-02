import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/* ── Shared glass-morphism base for every toast ── */
const toastBase: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: 1.5,
  padding: '14px 18px',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  color: '#1d1d1f',
  border: '1px solid rgba(200, 200, 210, 0.45)',
  boxShadow:
    '0 8px 32px rgba(0, 0, 0, 0.10), 0 1.5px 6px rgba(0, 0, 0, 0.06)',
  maxWidth: '400px',
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
            style: {
              ...toastBase,
              borderLeft: '4px solid #34c759',
            },
            iconTheme: { primary: '#34c759', secondary: '#fff' },
          },
          error: {
            duration: 4500,
            style: {
              ...toastBase,
              borderLeft: '4px solid #ff3b30',
            },
            iconTheme: { primary: '#ff3b30', secondary: '#fff' },
          },
          loading: {
            style: {
              ...toastBase,
              borderLeft: '4px solid #0071e3',
            },
            iconTheme: { primary: '#0071e3', secondary: '#fff' },
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
