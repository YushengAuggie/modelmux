import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const srcDir = new URL('./src', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  base: '/modelmux/',
  resolve: {
    alias: {
      '@': srcDir,
      '@/components': `${srcDir}/components`,
      '@/store': `${srcDir}/store`,
      '@/adapters': `${srcDir}/adapters`,
      '@/lib': `${srcDir}/lib`,
      '@/hooks': `${srcDir}/hooks`,
    },
  },
});
