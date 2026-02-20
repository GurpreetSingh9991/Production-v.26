import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Fix: Property 'cwd' does not exist on type 'Process'. Use '.' to search for .env files in the current directory.
    const env = loadEnv(mode, '.', '');
    
    // Pick up the API key from multiple possible naming conventions
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        // Polyfill process for libraries that expect it
        'process.env': {
          NODE_ENV: JSON.stringify(mode),
          API_KEY: apiKey
        }
      },
      resolve: {
        alias: {
          // Fix: Cannot find name '__dirname'. In a standard project structure, path.resolve('.') resolves to the project root directory.
          '@': path.resolve('.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false
      }
    };
});
