
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env.API_KEY is available in the bundled code
    // and correctly polyfilled for both local dev and production build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env': {
       API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
