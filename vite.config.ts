import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
    plugins: [react(), viteSingleFile()],
    build: {
        target: 'esnext',
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000000,
        cssCodeSplit: false,
        outDir: 'dist',
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'src/ui.html'),
            },
            output: {
                entryFileNames: '[name].js',
            },
        },
    },
});
