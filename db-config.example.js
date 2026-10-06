// db-config.example.js: Przykładowa konfiguracja połączenia z MySQL
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // ← WPISZ SWOJE HASŁO W .env
  database: process.env.DB_NAME || 'sprzet_narciarski',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// db-config.example.js: Konfiguracja połączenia z bazą historii wypożyczeń (history)
export const historyDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // ← WPISZ SWOJE HASŁO W .env
  database: process.env.DB_HISTORY_NAME || 'history',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};