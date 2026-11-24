import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Shared variables live in the repository-level .env.
  const env = loadEnv(mode, new URL('../..', import.meta.url).pathname, '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.WEB_PORT ?? 5173),
      strictPort: true,
      // The API is same-origin from the browser's point of view: no CORS, cookies stay first-party.
      proxy: { '/api': { target: env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000' } },
    },
    build: { sourcemap: true, target: 'es2023' },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
