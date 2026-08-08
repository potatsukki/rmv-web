import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](?:react|react-dom|react-router)[\\/]/ },
            { name: 'vendor-data', test: /node_modules[\\/](?:@tanstack[\\/]react-query|axios|zustand)[\\/]/ },
            { name: 'vendor-forms', test: /node_modules[\\/](?:react-hook-form|@hookform[\\/]resolvers|zod)[\\/]/ },
            { name: 'vendor-charts', test: /node_modules[\\/]recharts[\\/]/ },
            { name: 'vendor-motion', test: /node_modules[\\/]framer-motion[\\/]/ },
            { name: 'vendor-maps', test: /node_modules[\\/](?:leaflet|react-leaflet)[\\/]/ },
            { name: 'vendor-ui', test: /node_modules[\\/](?:@radix-ui|lucide-react|react-hot-toast|class-variance-authority|clsx|tailwind-merge)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
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
