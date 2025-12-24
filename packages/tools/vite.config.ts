import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5174 // Different port from client (5173)
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
});
