/**
 * Serwer Express.js dla aplikacji asystenta nart
 * Serwuje aplikację React i udostępnia API REST dla rezerwacji
 */

import { config } from './src/server/config/env.js';
import app from './src/server/app.js';

const PORT = config.port;

// Uruchom serwer
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log(`🚀 Serwer asystenta nart uruchomiony`);
  console.log('========================================');
  console.log(`📱 Dostęp lokalny: http://localhost:${PORT}`);
  console.log(`🌐 Dostęp sieciowy: http://[IP_KOMPUTERA]:${PORT}`);
  console.log(`📊 API dostępne pod: http://localhost:${PORT}/api/`);
  console.log('');
  console.log('📡 FireSnow API Integration:');
  console.log(`   Status: ${config.useFireSnowApi ? 'ENABLED ✅' : 'DISABLED (używa CSV)'}`);
  console.log(`   URL: ${config.fireSnowApiUrl}`);
  console.log(`   Fallback rezerwacje: CSV (${config.paths.reservationsCsv})`);
  console.log(`   Fallback wypożyczenia: CSV (${config.paths.rentalsCsv})`);
  console.log('');
  console.log('💡 Endpointy:');
  console.log('   GET  /api/reservations - Pobierz rezerwacje');
  console.log('   GET  /api/wypozyczenia/aktualne - Pobierz wypożyczenia');
  console.log('   GET  /api/firesnow/status - Status FireSnow API');
  console.log('   POST /api/firesnow/refresh - Odśwież cache API');
  console.log('');
  console.log('Aby znaleźć adres IP komputera, uruchom: ipconfig');
  console.log('========================================');
  console.log('');
});
