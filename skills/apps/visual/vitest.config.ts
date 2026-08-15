import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
      '@kb': `${import.meta.dirname}/../../knowledge-base`,
    },
  },
  server: {
    fs: {
      allow: [`${import.meta.dirname}/../../knowledge-base`],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
  },
});
