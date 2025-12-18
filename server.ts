/**
 * server.ts: Serwer Express.js dla aplikacji asystenta nart
 * Serwuje aplikację React i udostępnia API REST dla rezerwacji
 */

import { config } from './src/server/config/env.js';
import app from './src/server/app.js';
import logger from './src/server/config/logger.js';

const PORT = config.port;

// Uruchom serwer
app.listen(PORT, '0.0.0.0', () => {
  logger.info('');
  logger.info('========================================');
  logger.info(`🚀 Serwer asystenta nart uruchomiony`);
  logger.info('========================================');
  logger.info(`📱 Dostęp lokalny: http://localhost:${PORT}`);
  logger.info(`🌐 Dostęp sieciowy: http://[IP_KOMPUTERA]:${PORT}`);
  logger.info(`📊 API dostępne pod: http://localhost:${PORT}/api/`);
  logger.info('');
  logger.info('📡 FireSnow API Integration:');
  logger.info(`   Status: ${config.useFireSnowApi ? 'ENABLED ✅' : 'DISABLED (używa CSV)'}`);
  logger.info(`   URL: ${config.fireSnowApiUrl}`);
  logger.info(`   Fallback rezerwacje: CSV (${config.paths.reservationsCsv})`);
  logger.info(`   Fallback wypożyczenia: CSV (${config.paths.rentalsCsv})`);
  logger.info('');
  logger.info('💡 Endpointy:');
  logger.info('   GET  /api/reservations - Pobierz rezerwacje');
  logger.info('   GET  /api/wypozyczenia/aktualne - Pobierz wypożyczenia');
  logger.info('   GET  /api/firesnow/status - Status FireSnow API');
  logger.info('   POST /api/firesnow/refresh - Odśwież cache API');
  logger.info('');
  logger.info('Aby znaleźć adres IP komputera, uruchom: ipconfig');
  logger.info('========================================');
  logger.info('');
});



