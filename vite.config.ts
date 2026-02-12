import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path '/' adalah default, tapi eksplisit lebih aman untuk Vercel.
  // Jangan gunakan './' karena akan merusak routing SPA di sub-path.
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});