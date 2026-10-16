/**
 * server.ts: Serwer Express.js dla aplikacji asystenta nart
 * Serwuje aplikację React i udostępnia API REST dla rezerwacji
 */

import { config } from './src/server/config/env.js';
import app from './src/server/app.js';
import logger from './src/server/config/logger.js';
import { closeDBPools } from './src/server/config/database.js';

const PORT = config.port;

// Uruchom serwer
const server = app.listen(PORT, '0.0.0.0', (listenError?: Error) => {
  // Express 5 wywołuje ten callback także przy błędzie nasłuchiwania - obsługuje go server.on('error') poniżej
  if (listenError) return;

  logger.info('');
  logger.info('========================================');
  logger.info(`🚀 Serwer asystenta nart uruchomiony`);
  logger.info('========================================');
  logger.info(`📱 Dostęp lokalny: http://localhost:${PORT}`);
  logger.info(`🌐 Dostęp sieciowy: http://[IP_KOMPUTERA]:${PORT}`);
  logger.info(`📊 API dostępne pod: http://localhost:${PORT}/api/`);
  logger.info('');
  logger.info('📡 FireSnow API Integration:');
  logger.info(`   Status: ${config.useFireSnowApi ? 'ENABLED ✅' : 'DISABLED (brak danych rezerwacji i wypożyczeń)'}`);
  logger.info(`   URL: ${config.fireSnowApiUrl}`);
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

/**
 * Kończy proces po opróżnieniu loggera (żeby ostatni wpis trafił do logów)
 */
function exitProcess(code: number): void {
    // Zabezpieczenie: nie czekaj na logger dłużej niż 2 s
    setTimeout(() => process.exit(code), 2000);

    // setImmediate: wpisy z bieżącego ticku muszą dotrzeć do transportów przed zamknięciem strumieni
    setImmediate(() => {
        // close() transportu plikowego kończy strumień i emituje 'finish' po zapisaniu bufora
        const flushed = logger.transports.map(transport => new Promise<void>(resolve => {
            if (!transport.close) {
                resolve();
                return;
            }
            transport.once('finish', () => resolve());
            transport.close();
        }));
        Promise.all(flushed).then(() => process.exit(code));
    });
}

// Błąd serwera HTTP (np. EADDRINUSE) - bez tego proces kończył się kodem 0 bez komunikatu
server.on('error', error => {
    logger.error('Błąd serwera HTTP', {
        error: error.message,
        code: 'code' in error ? error.code : undefined
    });
    exitProcess(1);
});

// Łagodne zamykanie: serwer HTTP -> pule MySQL -> exit(0)
let shuttingDown = false;

function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Otrzymano ${signal} - zamykanie serwera...`);

    // Zabezpieczenie przed zawieszeniem zamykania
    setTimeout(() => process.exit(1), 10000).unref();

    server.close(closeError => {
        closeDBPools()
            .then(() => {
                logger.info('Serwer zamknięty poprawnie');
                exitProcess(closeError ? 1 : 0);
            })
            .catch(error => {
                logger.error('Błąd podczas zamykania', { error: String(error) });
                exitProcess(1);
            });
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', reason => {
    logger.error('Nieobsłużone odrzucenie Promise', {
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
    });
});

process.on('uncaughtException', error => {
    logger.error('Nieprzechwycony wyjątek', { error: error.message, stack: error.stack });
    exitProcess(1);
});






