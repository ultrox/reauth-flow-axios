import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/swapi': {
        target: 'https://swapi.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/swapi/, ''),
      },
    },
  },
});
