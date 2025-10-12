import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Pozwól na dostęp do plików poza root
      allow: ['..']
    }
  },
  // Konfiguracja dla plików statycznych
  assetsInclude: ['**/*.csv'],
  // Ustawienia kodowania
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis'
  },
  resolve: {
    alias: {
      // Polyfille dla Node.js modules w przeglądarce
      buffer: 'buffer',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    }
  }
})
