// db-config.js: Konfiguracja połączenia z MySQL
export const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Mypass123!',  // ← WPISZ SWOJE HASŁO
  database: 'sprzet_narciarski',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// db-config.js: Konfiguracja połączenia z bazą historii wypożyczeń (history)
export const historyDbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Mypass123!',  // ← WPISZ SWOJE HASŁO
  database: 'history',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};