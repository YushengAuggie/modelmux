import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var srcDir = new URL('./src', import.meta.url).pathname;
export default defineConfig({
    plugins: [react()],
    base: '/modelmux/',
    resolve: {
        alias: {
            '@': srcDir,
            '@/components': "".concat(srcDir, "/components"),
            '@/store': "".concat(srcDir, "/store"),
            '@/adapters': "".concat(srcDir, "/adapters"),
            '@/lib': "".concat(srcDir, "/lib"),
            '@/hooks': "".concat(srcDir, "/hooks"),
        },
    },
});
