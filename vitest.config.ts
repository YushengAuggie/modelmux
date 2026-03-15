import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const srcDir = new URL('./src', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
