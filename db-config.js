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

// db-config.js: Konfiguracja połączenia z bazą historii wypożyczeń (2022-2023)
export const historyDbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Mypass123!',  // ← WPISZ SWOJE HASŁO
    database: 'his_2223',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };