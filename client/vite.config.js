

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        // Plugin to copy _redirects from public to dist after build
        {
            name: 'copy-redirects',
            closeBundle() {
                const src = path.resolve(__dirname, 'public/_redirects');
                const dest = path.resolve(__dirname, 'dist/_redirects');
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, dest);
                }
            }
        }
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001', // Updated to match backend port
                changeOrigin: true,
            },
        },
    },
});
