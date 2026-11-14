import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHistoryHandler } from './api/history.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'etherscan-history-dev-proxy',
        configureServer(server) {
          server.middlewares.use(
            '/api/history',
            createHistoryHandler(env.ETHERSCAN_API_KEY)
          );
        },
      },
    ],
  };
});
