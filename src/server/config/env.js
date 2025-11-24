import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');



export const config = {
    port: process.env.PORT || 3000,
    fireSnowApiUrl: process.env.FIRESNOW_API_URL || 'http://localhost:8080',
    useFireSnowApi: process.env.USE_FIRESNOW_API === 'true',

    // Logging configuration
    logLevel: process.env.LOG_LEVEL || 'info',
    logDir: process.env.LOG_DIR || 'logs',

    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Mypass123!',
        database: process.env.DB_NAME || 'sprzet_narciarski',
        historyDatabase: process.env.DB_HISTORY_NAME || 'history',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },

    paths: {
        reservationsCsv: path.join(rootDir, 'public', 'data', 'rezerwacja.csv'),
        rentalsCsv: path.join(rootDir, 'public', 'data', 'wyp.csv'),
        skisCsv: path.join(rootDir, 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv')
    }
};
