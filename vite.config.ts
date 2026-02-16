import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom')
          ) {
            return 'vendor-react';
          }

          if (
            id.includes('@tanstack/react-query') ||
            id.includes('/axios/') ||
            id.includes('\\axios\\') ||
            id.includes('/zustand/') ||
            id.includes('\\zustand\\')
          ) {
            return 'vendor-data';
          }

          if (
            id.includes('/react-hook-form/') ||
            id.includes('\\react-hook-form\\') ||
            id.includes('@hookform/resolvers') ||
            id.includes('/zod/') ||
            id.includes('\\zod\\')
          ) {
            return 'vendor-forms';
          }

          if (id.includes('/recharts/') || id.includes('\\recharts\\')) {
            return 'vendor-charts';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('react-hot-toast') ||
            id.includes('class-variance-authority') ||
            id.includes('/clsx/') ||
            id.includes('\\clsx\\') ||
            id.includes('tailwind-merge')
          ) {
            return 'vendor-ui';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
});
