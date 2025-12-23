import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    server: {
        host: true, // Listen on all network interfaces
        port: 5173
    },
    resolve: {
        alias: {
            '@roguewar/rules': path.resolve(__dirname, '../rules/src/index.ts'),
            '@roguewar/authority': path.resolve(__dirname, '../authority/src/index.ts'),
            '@roguewar/ai': path.resolve(__dirname, '../ai/src/index.ts')
        }
    }
});
