import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  cacheDir: 'node_modules/.vite',
  server: {
    host: '127.0.0.1',
    port: 5175,
    fs: {
      allow: [projectRoot]
    }
  }
});
