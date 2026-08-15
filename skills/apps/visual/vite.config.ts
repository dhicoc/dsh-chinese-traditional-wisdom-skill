import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kb': path.resolve(__dirname, '../../knowledge-base'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    fs: {
      allow: ['..', '../..'],
    },
  },
  build: {
    target: 'es2020',
    // 放宽体积告警阈值，便于观察拆分后各 chunk 实际大小
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 手动分包：把重型历法/紫微/奇门库拆成独立 vendor chunk，
        // 它们只在对应工作区打开时才被拉取，且长期 HTTP 缓存命中率高。
        // 其余 node_modules 统一进 vendor，应用源码（含按需工作区 chunk）保持独立。
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lunar-javascript')) return 'vendor-lunar';
            if (id.includes('iztro')) return 'vendor-iztro';
            if (id.includes('3meta')) return 'vendor-3meta';
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
            return 'vendor';
          }
        },
      },
    },
  },
});
