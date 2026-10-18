import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5002,
    host: true, // Dodano: nasłuchuj na 0.0.0.0
    fs: {
      // Pozwól na dostęp do plików poza root
      allow: ['..']
    },
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Konfiguracja dla plików statycznych
  assetsInclude: ['**/*.csv'],
  // Ustawienia kodowania
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  // Optymalizacja chunków - podział na mniejsze fragmenty dla lepszej wydajności
  build: {
    // Tymczasowe podniesienie limitu ostrzeżeń podczas optymalizacji
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manualne chunki dla głównych bibliotek - lepsza cache'owalność i szybsze ładowanie
        manualChunks: (id) => {
          // Vendor chunk - tylko React, React DOM i scheduler (nie react-calendar-timeline itp.)
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return 'vendor';
          }
          // Timeline chunk - react-calendar-timeline
          if (id.includes('node_modules/react-calendar-timeline')) {
            return 'timeline';
          }
          // Inne node_modules do osobnego chunka
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        }
      }
    }
  }
})
