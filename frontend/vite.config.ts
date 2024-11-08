// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),  // Maps '@' to 'src' folder
    },
  },
  server: {
    https: {
      key: '/root/gujarat_gov_in.key',
      cert: '/root/ServerCertificate.crt',
    },
    host: 'gujarat.gov.in',
    port: 5173, // or any other port you prefer
  }
});
