/**
 * Serwer Express.js dla aplikacji asystenta nart
 * Serwuje aplikację React i udostępnia API REST dla rezerwacji
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import mysql from 'mysql2/promise';
import { dbConfig, historyDbConfig } from './db-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// FireSnow API Configuration
const FIRESNOW_API_URL = 'http://localhost:8080'; // Localhost - FireSnowBridge działa na tym samym komputerze
const USE_FIRESNOW_API = true; // Zmień na false żeby używać CSV

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Ścieżki do plików CSV
const RESERVATIONS_CSV_PATH = path.join(__dirname, 'public', 'data', 'rezerwacja.csv');
const RENTALS_CSV_PATH = path.join(__dirname, 'public', 'data', 'wyp.csv');
// Stara baza (backup):
// const SKIS_CSV_PATH = path.join(__dirname, 'public', 'data', 'NOWABAZA_final.csv');
// Nowa baza z butami i deskami:
const SKIS_CSV_PATH = path.join(__dirname, 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');

// MySQL Connection Pool
let pool = null;

async function getDBConnection() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('Server: Utworzono pool połączeń MySQL');
  }
  return pool;
}

// MySQL Connection Pool dla bazy historii (his_2223)
let historyPool = null;

async function getHistoryDBConnection() {
  if (!historyPool) {
    historyPool = mysql.createPool(historyDbConfig);
    console.log('Server: Utworzono pool połączeń MySQL dla historii (his_2223)');
  }
  return historyPool;
}

/**
 * Wczytuje rezerwacje z FireSnow API
 * Mapuje dane z formatu API FireSnow na format używany w aplikacji
 */
async function loadReservationsFromFireSnowAPI() {
  try {
    console.log('Server: Pobieranie rezerwacji z FireSnow API:', FIRESNOW_API_URL);
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/rezerwacje/aktywne`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const fireSnowData = await response.json();
    console.log(`Server: Otrzymano ${fireSnowData.length} rezerwacji z FireSnow API`);
    
    // Mapuj dane z formatu FireSnow API na format aplikacji
    const reservations = fireSnowData.map(item => {
      // Priorytet 1: Użyj klient_nazwa (z ABSTRACTENTITYCM) - tak jak w wypożyczeniach
      // Priorytet 2: Połącz imię i nazwisko (z RENT_CUSTOMERS)
      // Priorytet 3: Fallback do klient_id
      
      let klient = '';
      
      // Priorytet 1: klient_nazwa z ABSTRACTENTITYCM (najbardziej niezawodne)
      if (item.klient_nazwa && item.klient_nazwa.trim()) {
        klient = item.klient_nazwa.trim();
      }
      // Priorytet 2: Połącz imię i nazwisko (z RENT_CUSTOMERS)
      else {
        const imie = (item.imie && item.imie.trim()) || '';
        const nazwisko = (item.nazwisko && item.nazwisko.trim()) || '';
        
        if (imie || nazwisko) {
          klient = `${imie} ${nazwisko}`.trim();
        }
      }
      
      // Priorytet 3: Fallback jeśli brak wszystkich danych (BEZ telefonu!)
      if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
      }
      
      return {
        // Format FireSnow API -> Format aplikacji
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '', // Kod bezpośrednio z API (nie wyciągamy z nazwy)
        od: formatFireSnowDate(item.data_od),
        do: formatFireSnowDate(item.data_do),
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: '', // FireSnow API nie zwraca tego pola
        numer: item.rezerwacja_id ? item.rezerwacja_id.toString() : '',
        typumowy: item.typumowy || 'STANDARD', // Typ umowy z API (PROMOTOR lub STANDARD)
        // telefon: item.telefon || '', // USUNIĘTE - nie wyświetlamy numeru telefonu
        // Dodatkowe pola z API
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id
      };
    });
    
    console.log(`Server: Zmapowano ${reservations.length} rezerwacji`);
    return reservations;
    
  } catch (error) {
    console.error('Server: Błąd pobierania z FireSnow API:', error);
    throw error;
  }
}

/**
 * Wyciąga kod sprzętu z nazwy (np. "NARTY ATOMIC //01" -> "01")
 */
function extractKodFromName(name) {
  const match = name.match(/\/\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Formatuje datę z FireSnow API do formatu ISO 8601 (rozumiany przez JavaScript Date)
 * Input: "2026-02-13 11:00:00.000000" → Output: "2026-02-13T11:00:00"
 */
function formatFireSnowDate(dateString) {
  if (!dateString) return '';
  
  try {
    // Format z API: "2026-02-13 11:00:00.000000"
    // Usuń mikrosekundy i zamień spację na T (ISO 8601)
    const isoString = dateString.split('.')[0].replace(' ', 'T');
    
    // Sprawdź czy to poprawna data
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('Server: Nieprawidłowa data:', dateString);
      return dateString;
    }
    
    return isoString; // "2026-02-13T11:00:00"
  } catch (error) {
    console.error('Server: Błąd formatowania daty:', dateString, error);
    return dateString;
  }
}

/**
 * Wczytuje rezerwacje z pliku CSV (fallback gdy API nie działa)
 */
async function loadReservationsFromCSV() {
  try {
    console.log('Server: Wczytuję rezerwacje z pliku CSV:', RESERVATIONS_CSV_PATH);
    
    const csvContent = await fs.readFile(RESERVATIONS_CSV_PATH, 'utf-8');
    
    // Wykryj format FireFnow (średniki + zniekształcone znaki)
    const isFirefnow = detectFirefnowFormat(csvContent);
    
    let processedContent = csvContent;
    if (isFirefnow) {
      console.log('Server: Wykryto format FireFnow - konwertuję...');
      processedContent = convertFromFirefnow(csvContent);
    }
    
    const result = Papa.parse(processedContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      transformHeader: (header) => {
        const headerMap = {
          'Od': 'od',
          'Do': 'do',
          'Klient': 'klient',
          'Kod': 'kod',
          'Cena': 'cena',
          'Rabat': 'rabat',
          'Użytkownik': 'uzytkownik',
          'Sprzęt': 'sprzet',
          'Zapłacono': 'zaplacono'
        };
        return headerMap[header] || header.toLowerCase();
      }
    });
    
    // Filtruj prawdziwe rezerwacje (wyklucz wiersze podsumowujące)
    const reservations = result.data.filter(reservation => {
      if (!reservation.klient || !reservation.sprzet) return false;
      if (reservation.klient === '57' || reservation.sprzet === 'Suma:') return false;
      if (reservation.klient.includes && reservation.klient.includes('Suma:')) return false;
      if (reservation.sprzet.includes && reservation.sprzet.includes('Suma:')) return false;
      if (!reservation.od || !reservation.do) return false;
      return true;
    });
    
    console.log(`Server: Wczytano ${reservations.length} rezerwacji`);
    return reservations;
  } catch (error) {
    console.error('Server: Błąd wczytywania rezerwacji:', error);
    return [];
  }
}

/**
 * Zapisuje rezerwacje do pliku CSV
 */
async function saveReservationsToCSV(reservations) {
  try {
    console.log(`Server: Zapisuję ${reservations.length} rezerwacji do CSV`);
    
    // Konwertuj z powrotem do formatu CSV
    const csvContent = Papa.unparse(reservations, {
      delimiter: ',',
      header: true
    });
    
    await fs.writeFile(RESERVATIONS_CSV_PATH, csvContent, 'utf-8');
    console.log('Server: Rezerwacje zapisane pomyślnie');
    return true;
  } catch (error) {
    console.error('Server: Błąd zapisywania rezerwacji:', error);
    return false;
  }
}

/**
 * Wykrywa format FireFnow
 */
function detectFirefnowFormat(csvText) {
  const sample = csvText.substring(0, 500);
  const semicolonCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const hasSemicolons = semicolonCount > commaCount;
  
  const hasCorruptedChars = 
    sample.includes('�') || 
    sample.includes('Sprz�t') || 
    sample.includes('U�ytkownik') || 
    sample.includes('Zap�acono') ||
    sample.includes('SprÄt') ||
    sample.includes('UÄytkownik') ||
    sample.includes('ZapÄacono');
  
  return hasSemicolons || hasCorruptedChars;
}

/**
 * Konwertuje z formatu FireFnow
 */
function convertFromFirefnow(csvText) {
  const lines = csvText.split(/\r?\n/);
  const convertedLines = [];
  
  lines.forEach(line => {
    if (line.trim() === '') return;
    
    const fields = line.split(';');
    const fixedFields = fields.map(field => {
      if (/^\d+,\d+$/.test(field.trim())) {
        return field.replace(',', '.');
      }
      return field;
    });
    
    convertedLines.push(fixedFields.join(','));
  });
  
  return convertedLines.join('\n');
}

/**
 * Wczytuje wypożyczenia z FireSnow API
 * Mapuje dane z formatu API FireSnow na format używany w aplikacji
 */
async function loadRentalsFromFireSnowAPI() {
  try {
    console.log('Server: Pobieranie wypożyczeń z FireSnow API:', FIRESNOW_API_URL);
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/wypozyczenia/aktualne`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const fireSnowData = await response.json();
    console.log(`Server: Otrzymano ${fireSnowData.length} wypożyczeń z FireSnow API`);
    console.log('Server: Przykładowy rekord z API:', JSON.stringify(fireSnowData[0], null, 2));
    
    // Mapuj dane z formatu FireSnow API na format aplikacji
    const rentals = fireSnowData.map(item => {
      // Nazwa klienta - obsługa różnych formatów API
      let klient = item.klient_nazwa || item.imie_nazwisko || '';
      
      if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
      }
      
      // Daty - obsługa różnych formatów API
      let dataOd = '';
      let dataDo = '';
      
      // Format 1: timestamp (milisekundy)
      if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0];
        
        // Oblicz data_do dla aktywnych wypożyczeń (gdy data_do = 0 i jest pozostaly_czas)
        if (item.data_do === 0 && item.pozostaly_czas && typeof item.pozostaly_czas === 'number') {
          const obliczonaDataDo = item.data_od + item.pozostaly_czas;
          dataDo = new Date(obliczonaDataDo).toISOString().split('T')[0];
          console.log(`Server: Obliczono data_do dla wypożyczenia ${item.session_id}: ${dataDo} (data_od: ${new Date(item.data_od).toISOString()}, pozostaly_czas: ${item.pozostaly_czas}ms)`);
        } else if (item.data_do && typeof item.data_do === 'number' && item.data_do !== 0) {
          dataDo = new Date(item.data_do).toISOString().split('T')[0];
        }
      }
      // Format 2: string "YYYY-MM-DD HH:MM:SS"
      else if (item.data_rozpoczecia) {
        dataOd = item.data_rozpoczecia.split(' ')[0]; // Bierz tylko datę
      }
      
      return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: item.zaplacono ? item.zaplacono.toString() : '0',
        numer: item.numer_dokumentu || `WYP-${item.session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id
      };
    });
    
    console.log(`Server: Zmapowano ${rentals.length} wypożyczeń`);
    console.log('Server: Przykładowy zmapowany rekord:', JSON.stringify(rentals[0], null, 2));
    return rentals;
    
  } catch (error) {
    console.error('Server: Błąd pobierania wypożyczeń z FireSnow API:', error);
    throw error;
  }
}

/**
 * Wczytuje przeszłe wypożyczenia (zwrócone) z FireSnow API
 * Mapuje dane z formatu API FireSnow na format używany w aplikacji
 */
async function loadPastRentalsFromFireSnowAPI() {
  try {
    console.log('Server: Pobieranie przeszłych wypożyczeń z FireSnow API:', FIRESNOW_API_URL);
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/wypozyczenia/przeszle`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const fireSnowData = await response.json();
    console.log(`Server: Otrzymano ${fireSnowData.length} przeszłych wypożyczeń z FireSnow API`);
    
    // Mapuj dane z formatu FireSnow API na format aplikacji
    const pastRentals = fireSnowData.map(item => {
      // Nazwa klienta
      let klient = item.klient_nazwa || item.imie_nazwisko || '';
      
      if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
      }
      
      // Daty - obsługa różnych formatów API
      let dataOd = '';
      let dataDo = '';
      
      // Format 1: timestamp (milisekundy)
      if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0];
      }
      
      if (item.data_do && typeof item.data_do === 'number') {
        dataDo = item.data_do === 0 ? '' : new Date(item.data_do).toISOString().split('T')[0];
      }
      
      return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: item.zaplacono ? item.zaplacono.toString() : '0',
        numer: item.numer_dokumentu || `WYP-${item.session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id,
        source: 'rental' // Mark as rental
      };
    });
    
    console.log(`Server: Zmapowano ${pastRentals.length} przeszłych wypożyczeń`);
    return pastRentals;
    
  } catch (error) {
    console.error('Server: Błąd pobierania przeszłych wypożyczeń z FireSnow API:', error);
    throw error;
  }
}

/**
 * Wczytuje wypożyczenia z pliku CSV (fallback gdy API nie działa)
 * Mapuje format wypożyczeń na format rezerwacji dla zgodności z aplikacją
 */
async function loadRentalsFromCSV() {
  try {
    console.log('Server: Wczytuję wypożyczenia z pliku CSV:', RENTALS_CSV_PATH);
    
    const csvContent = await fs.readFile(RENTALS_CSV_PATH, 'utf-8');
    console.log('Server: Wczytano plik CSV, długość:', csvContent.length, 'znaków');
    console.log('Server: Pierwsze 200 znaków:', csvContent.substring(0, 200));
    
    // Wykryj format FireFnow (średniki + zniekształcone znaki)
    const isFirefnow = detectFirefnowFormat(csvContent);
    console.log('Server: Format FireFnow wykryty:', isFirefnow);
    
    let processedContent = csvContent;
    if (isFirefnow) {
      console.log('Server: Wykryto format FireFnow w wypożyczeniach - konwertuję...');
      processedContent = convertFromFirefnow(csvContent);
      console.log('Server: Po konwersji, pierwsze 200 znaków:', processedContent.substring(0, 200));
    }
    
    const result = Papa.parse(processedContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      transformHeader: (header) => {
        // Mapuj nagłówki z formatu wypożyczeń na format rezerwacji
        // Obsługuje zarówno poprawne jak i zniekształcone znaki (FireFnow encoding)
        const headerMap = {
          'Klient': 'klient',
          'Sprzęt': 'sprzet',
          'Sprz�t': 'sprzet',  // Zniekształcony znak
          'Kod': 'kod',
          'Rozpoczęto': 'od',  // Data rozpoczęcia wypożyczenia
          'Rozpocz�to': 'od',  // Zniekształcony znak
          'Koniec': 'do',       // Data zakończenia wypożyczenia
          'Pozostało': 'pozostalo',
          'Pozosta�o': 'pozostalo',  // Zniekształcony znak
          'Gratis': 'gratis',
          'Cena': 'cena',
          'Rabat': 'rabat',
          'Rabat %': 'rabat_procent',
          'Zapłacono': 'zaplacono',
          'Zap�acono': 'zaplacono',  // Zniekształcony znak
          'Uwagi': 'uwagi',
          'Użytkownik': 'uzytkownik',
          'U�ytkownik': 'uzytkownik'  // Zniekształcony znak
        };
        return headerMap[header] || header.toLowerCase();
      }
    });
    
    // Filtruj prawdziwe wypożyczenia (wyklucz wiersze podsumowujące)
    const rentals = result.data.filter(rental => {
      if (!rental.klient || !rental.sprzet) return false;
      if (rental.klient.includes && rental.klient.includes('Suma:')) return false;
      if (rental.sprzet.includes && rental.sprzet.includes('Suma:')) return false;
      if (!rental.od || !rental.do) return false;
      return true;
    }).map(rental => ({
      ...rental,
      typumowy: 'STANDARD', // Wypożyczenia są zawsze STANDARD
      numer: rental.kod || `WYP-${Date.now()}` // Użyj kodu lub wygeneruj numer
    }));
    
    console.log(`Server: Wczytano ${rentals.length} wypożyczeń`);
    return rentals;
  } catch (error) {
    console.error('Server: Błąd wczytywania wypożyczeń:', error);
    return [];
  }
}

// API Routes

/**
 * GET /api/reservations - Pobierz wszystkie rezerwacje
 * Używa FireSnow API z fallback do CSV
 */
app.get('/api/reservations', async (req, res) => {
  try {
    console.log('Server: GET /api/reservations');
    
    let reservations = [];
    
    if (USE_FIRESNOW_API) {
      try {
        // Próbuj pobrać z API
        reservations = await loadReservationsFromFireSnowAPI();
        console.log(`Server: Zwracam ${reservations.length} rezerwacji z FireSnow API`);
      } catch (apiError) {
        console.warn('Server: FireSnow API niedostępne, fallback do CSV:', apiError.message);
        // Fallback do CSV jeśli API nie działa
        reservations = await loadReservationsFromCSV();
        console.log(`Server: Zwracam ${reservations.length} rezerwacji z CSV (fallback)`);
      }
    } else {
      // Używaj CSV jeśli USE_FIRESNOW_API = false
      reservations = await loadReservationsFromCSV();
      console.log(`Server: Zwracam ${reservations.length} rezerwacji z CSV`);
    }
    
    res.json(reservations);
  } catch (error) {
    console.error('Server: Błąd pobierania rezerwacji:', error);
    res.status(500).json({ error: 'Błąd pobierania rezerwacji' });
  }
});

/**
 * GET /api/wypozyczenia/aktualne - Pobierz wszystkie wypożyczenia
 * Używa FireSnow API z fallback do CSV
 */
app.get('/api/wypozyczenia/aktualne', async (req, res) => {
  try {
    console.log('Server: GET /api/wypozyczenia/aktualne');
    
    let rentals = [];
    
    if (USE_FIRESNOW_API) {
      try {
        // Próbuj pobrać z API
        rentals = await loadRentalsFromFireSnowAPI();
        console.log(`Server: Zwracam ${rentals.length} wypożyczeń z FireSnow API`);
      } catch (apiError) {
        console.warn('Server: FireSnow API niedostępne dla wypożyczeń, fallback do CSV:', apiError.message);
        // Fallback do CSV jeśli API nie działa
        rentals = await loadRentalsFromCSV();
        console.log(`Server: Zwracam ${rentals.length} wypożyczeń z CSV (fallback)`);
      }
    } else {
      // Używaj CSV jeśli USE_FIRESNOW_API = false
      rentals = await loadRentalsFromCSV();
      console.log(`Server: Zwracam ${rentals.length} wypożyczeń z CSV`);
    }
    
    res.json(rentals);
  } catch (error) {
    console.error('Server: Błąd pobierania wypożyczeń:', error);
    res.status(500).json({ error: 'Błąd pobierania wypożyczeń' });
  }
});

/**
 * GET /api/dostepnosc/okres?from=timestamp&to=timestamp - Pobierz dostępność dla okresu
 * Optimized endpoint for "Przeglądaj" - returns only relevant data
 */
app.get('/api/dostepnosc/okres', async (req, res) => {
  const startTime = Date.now();
  try {
    const { from, to } = req.query;
    
    // Konwertuj timestampy na daty dla logowania
    const fromDate = from ? new Date(parseInt(from)).toLocaleString('pl-PL') : 'nie podano';
    const toDate = to ? new Date(parseInt(to)).toLocaleString('pl-PL') : 'nie podano';
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('Server: 📋 PRZEGLĄDAJ - Pobieranie dostępności dla okresu');
    console.log('Server:   Data od:', fromDate);
    console.log('Server:   Data do:', toDate);
    console.log('Server:   Timestamp from:', from);
    console.log('Server:   Timestamp to:', to);
    
    const queryParams = new URLSearchParams();
    if (from) queryParams.append('from', from);
    if (to) queryParams.append('to', to);
    
    console.log('Server:   Wywołuję FireSnow API...');
    const response = await fetch(`${FIRESNOW_API_URL}/api/dostepnosc/okres?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const data = await response.json();
    const reservationsCount = data.reservations ? data.reservations.length : 0;
    const rentalsCount = data.rentals ? data.rentals.length : 0;
    const totalCount = reservationsCount + rentalsCount;
    const duration = Date.now() - startTime;
    
    console.log('Server:   ✅ Pobrano dane z FireSnow API:');
    console.log('Server:      - Rezerwacje:', reservationsCount);
    console.log('Server:      - Wypożyczenia:', rentalsCount);
    console.log('Server:      - Łącznie:', totalCount, 'pozycji');
    console.log('Server:   ⏱️  Czas wykonania:', duration, 'ms');
    console.log('═══════════════════════════════════════════════════════');
    
    res.json(data);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Server:   ❌ Błąd pobierania dostępności:', error.message);
    console.error('Server:   ⏱️  Czas przed błędem:', duration, 'ms');
    console.log('═══════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Błąd pobierania dostępności' });
  }
});

/**
 * GET /api/wypozyczenia/przeszle - Pobierz przeszłe wypożyczenia (zwrócone)
 * Używa FireSnow API z fallback do CSV
 */
app.get('/api/wypozyczenia/przeszle', async (req, res) => {
  try {
    console.log('Server: GET /api/wypozyczenia/przeszle');
    
    let pastRentals = [];
    
    if (USE_FIRESNOW_API) {
      try {
        // Próbuj pobrać z API
        pastRentals = await loadPastRentalsFromFireSnowAPI();
        console.log(`Server: Zwracam ${pastRentals.length} przeszłych wypożyczeń z FireSnow API`);
      } catch (apiError) {
        console.warn('Server: FireSnow API niedostępne dla przeszłych wypożyczeń, fallback do pustej listy:', apiError.message);
        // Fallback do pustej listy jeśli API nie działa (CSV nie ma tej informacji)
        pastRentals = [];
        console.log('Server: Zwracam pustą listę przeszłych wypożyczeń (fallback)');
      }
    } else {
      // Używaj pustej listy jeśli USE_FIRESNOW_API = false (CSV nie ma tej informacji)
      pastRentals = [];
      console.log('Server: Zwracam pustą listę przeszłych wypożyczeń (API wyłączone)');
    }
    
    res.json(pastRentals);
  } catch (error) {
    console.error('Server: Błąd pobierania przeszłych wypożyczeń:', error);
    res.status(500).json({ error: 'Błąd pobierania przeszłych wypożyczeń' });
  }
});

/**
 * POST /api/reservations - Dodaj nową rezerwację
 */
app.post('/api/reservations', async (req, res) => {
  try {
    console.log('Server: POST /api/reservations', req.body);
    
    const reservations = await loadReservationsFromCSV();
    const newReservation = {
      ...req.body,
      numer: Date.now().toString() // Generuj unikalny ID
    };
    
    reservations.push(newReservation);
    
    const success = await saveReservationsToCSV(reservations);
    if (success) {
      res.json(newReservation);
    } else {
      res.status(500).json({ error: 'Błąd zapisywania rezerwacji' });
    }
  } catch (error) {
    console.error('Server: Błąd dodawania rezerwacji:', error);
    res.status(500).json({ error: 'Błąd dodawania rezerwacji' });
  }
});

/**
 * PUT /api/reservations/:id - Zaktualizuj rezerwację
 */
app.put('/api/reservations/:id', async (req, res) => {
  try {
    console.log('Server: PUT /api/reservations/', req.params.id, req.body);
    
    const reservations = await loadReservationsFromCSV();
    const index = reservations.findIndex(r => r.numer === req.params.id || r.kod === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
    }
    
    reservations[index] = { ...reservations[index], ...req.body };
    
    const success = await saveReservationsToCSV(reservations);
    if (success) {
      res.json(reservations[index]);
    } else {
      res.status(500).json({ error: 'Błąd zapisywania rezerwacji' });
    }
  } catch (error) {
    console.error('Server: Błąd aktualizacji rezerwacji:', error);
    res.status(500).json({ error: 'Błąd aktualizacji rezerwacji' });
  }
});

/**
 * DELETE /api/reservations/:id - Usuń rezerwację
 */
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    console.log('Server: DELETE /api/reservations/', req.params.id);
    
    const reservations = await loadReservationsFromCSV();
    const index = reservations.findIndex(r => r.numer === req.params.id || r.kod === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
    }
    
    const deletedReservation = reservations.splice(index, 1)[0];
    
    const success = await saveReservationsToCSV(reservations);
    if (success) {
      res.json(deletedReservation);
    } else {
      res.status(500).json({ error: 'Błąd zapisywania rezerwacji' });
    }
  } catch (error) {
    console.error('Server: Błąd usuwania rezerwacji:', error);
    res.status(500).json({ error: 'Błąd usuwania rezerwacji' });
  }
});

/**
 * Mapuje ID grupy z FireSnow na TYP_SPRZETU i KATEGORIA
 * server.js: Mapowanie grup FireSnow na format aplikacji
 * Mapuje bezpośrednio po parentGroupId (parent grup podrzędnych)
 */
function mapGroupToEquipmentType(subGroupId, parentGroupId) {
  // Mapuj bezpośrednio po parentGroupId (parent grup podrzędnych)
  switch (parentGroupId) {
    // NARTY - TOP (parent grup TOP)
    case 82293:
      return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'TOP' };
    
    // NARTY - VIP (parent grup VIP)
    case 82412:
      return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'VIP' };
    
    // NARTY - JUNIOR (parent grup JUNIOR)
    case 82758:
      return { TYP_SPRZETU: 'NARTY', KATEGORIA: 'JUNIOR' };
    
    // BUTY - DOROSLE (parent grup BUTY DOROSLE)
    case 82738:
      return { TYP_SPRZETU: 'BUTY', KATEGORIA: 'DOROSLE' };
    
    // BUTY - JUNIOR (parent grup BUTY JUNIOR)
    case 82827:
      return { TYP_SPRZETU: 'BUTY', KATEGORIA: 'JUNIOR' };
    
    // SNOWBOARD - DESKI (parent grup DESKI)
    case 83762:
      return { TYP_SPRZETU: 'DESKI', KATEGORIA: '' };
    
    // SNOWBOARD - BUTY S (parent grup BUTY SNOWBOARD)
    case 83760:
      return { TYP_SPRZETU: 'BUTY_SNOWBOARD', KATEGORIA: '' };
    
    // Domyślnie (nie powinno się zdarzyć, ale na wszelki wypadek)
    default:
      console.warn(`Server: Nieznany parentGroupId: ${parentGroupId}, subGroupId: ${subGroupId}`);
      return { TYP_SPRZETU: 'NARTY', KATEGORIA: '' };
  }
}

/**
 * Wyciąga płeć z pola POZIOM
 * server.js: Parsowanie płci z poziomu (4m→M, 4k→K, 4k/5m→U, 1-2u→U)
 */
function extractPlecFromPoziom(poziomText) {
  if (!poziomText) return 'U';
  
  const clean = poziomText.trim().toLowerCase();
  
  // Format unisex z zakresem: "1-2u"
  if (/^\d+-\d+u$/i.test(clean)) return 'U';
  
  // Format unisex: "4k/5m" lub "5m/4k"
  if (clean.includes('/') && (clean.includes('m') || clean.includes('k'))) {
    return 'U';
  }
  
  // Format męski: "4m"
  if (clean.endsWith('m') && !clean.includes('k')) return 'M';
  
  // Format kobiecy: "4k"
  if (clean.endsWith('k') && !clean.includes('m')) return 'K';
  
  // Domyślnie unisex
  return 'U';
}

/**
 * Parsuje nazwę sprzętu z FireSnow
 * server.js: Wyciąganie marki, modelu, długości/rozmiaru i roku z nazwy
 * Usuwa z nazwy: typ sprzętu (NARTY, BUTY), długość (144cm), rozmiar butów (rozm23), rok (/2025), numer narty (//01, /01, #01)
 * 
 * REGUŁY:
 * - Rok: zawsze 4 cyfry po "/" (np. "/2025")
 * - Numer narty: 2-3 cyfry po "//", "/" lub "#" (np. "//01", "/01", "#01")
 */
function parseEquipmentName(nazwa) {
  const result = {
    NAZWA: '',  // Marka + model (bez długości, rozmiaru, roku, kodu, typu)
    DLUGOSC: null,
    ROK: null
  };
  
  if (!nazwa) return result;
  
  let cleanName = nazwa.trim();
  
  // Usuń typ sprzętu z początku (NARTY, BUTY, DESKI, etc.)
  cleanName = cleanName.replace(/^(NARTY|BUTY|DESKI|DESKA|BUTY\s+SNOWBOARD)\s+/i, '');
  
  // Wyciągnij rozmiar butów (np. "rozm23", "rozm 23", "rozm23,5", "rozm 23,5")
  // Priorytet: najpierw sprawdź rozmiar butów, potem długość nart
  const bootSizeMatch = cleanName.match(/rozm\s*(\d+)(?:[,.](\d+))?/i);
  if (bootSizeMatch) {
    const wholePart = parseInt(bootSizeMatch[1]);
    const decimalPart = bootSizeMatch[2] ? parseInt(bootSizeMatch[2]) : 0;
    // Jeśli jest część dziesiętna, zapisz jako liczbę zmiennoprzecinkową
    if (decimalPart > 0) {
      // Jeśli część dziesiętna ma 1 cyfrę, dziel przez 10 (np. 5 → 0.5)
      // Jeśli ma 2 cyfry, dziel przez 100 (np. 50 → 0.50)
      const divisor = decimalPart < 10 ? 10 : 100;
      result.DLUGOSC = wholePart + (decimalPart / divisor);
    } else {
      result.DLUGOSC = wholePart;
    }
    // Usuń rozmiar z nazwy (cały wzorzec: "rozm23", "rozm 23", "rozm23,5", "rozm 23,5")
    cleanName = cleanName.replace(/rozm\s*\d+(?:[,.]\d+)?/gi, ' ').trim();
  } else {
    // Jeśli nie znaleziono rozmiaru butów, szukaj długości nart (np. "144cm", "156cm" lub "144")
    // server.js: Poprawione parsowanie długości - obsługuje formaty "156cm", " 156cm ", "156 cm"
    const lengthMatch = cleanName.match(/(\d{2,4})\s*cm/i) || cleanName.match(/\s(\d{2,4})\s/);
    if (lengthMatch) {
      result.DLUGOSC = parseInt(lengthMatch[1]);
      // Usuń długość z nazwy (obsługuje różne formaty: "156cm", " 156cm ", "156 cm")
      cleanName = cleanName.replace(/\s*\d{2,4}\s*cm\s*/i, ' ').replace(/\s+\d{2,4}\s+/g, ' ');
    }
  }
  
  // WAŻNE: Najpierw wyciągnij rok (4 cyfry po "/") - to musi być PRZED usuwaniem numerów nart
  // server.js: Rok ma zawsze 4 cyfry po "/" (np. "/2025")
  const yearMatch = cleanName.match(/\/(\d{4})(?!\d)/);
  if (yearMatch) {
    result.ROK = parseInt(yearMatch[1]);
    // Usuń rok z nazwy
    cleanName = cleanName.replace(/\s*\/\d{4}(?!\d)\s*/g, ' ');
  }
  
  // Usuń numery nart w różnych formatach (2-3 cyfry po "//", "/" lub "#")
  // server.js: Numer narty: 2-3 cyfry po "//" (czasami "/" lub "#")
  // Format: "//01", "//123", "/01", "/123", "#01", "#123"
  // Używamy negative lookahead, żeby nie złapać roku (4 cyfry)
  cleanName = cleanName.replace(/\s*\/\/\d{2,3}(?!\d)\s*/g, ' ');  // "//01", "//123"
  cleanName = cleanName.replace(/\s*\/\d{2,3}(?!\d)\s*/g, ' ');    // "/01", "/123" (ale nie "/2025" bo już usunięte)
  cleanName = cleanName.replace(/\s*#\d{2,3}(?!\d)\s*/g, ' ');     // "#01", "#123"
  
  // Usuń dodatkowe spacje i trim
  result.NAZWA = cleanName.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Mapuje dane z FireSnow API na format SkiData aplikacji
 * server.js: Główna funkcja mapująca dane z FireSnow na format aplikacji
 */
function mapFireSnowToSkiData(fireSnowItem) {
  // Mapuj grupę na TYP_SPRZETU i KATEGORIA
  const typeMapping = mapGroupToEquipmentType(
    fireSnowItem.sub_group_id,
    fireSnowItem.parent_group_id
  );
  
  // Wyciągnij płeć z poziomu
  const plec = extractPlecFromPoziom(fireSnowItem.poziom || '');
  
  // Parsuj nazwę sprzętu
  const parsedName = parseEquipmentName(fireSnowItem.nazwa_sprzetu || '');
  
  // Generuj ID w formacie: N-{obiekt_id}, B-{obiekt_id}, D-{obiekt_id}, BS-{obiekt_id}
  let idPrefix = 'N';
  if (typeMapping.TYP_SPRZETU === 'BUTY') idPrefix = 'B';
  else if (typeMapping.TYP_SPRZETU === 'DESKI') idPrefix = 'D';
  else if (typeMapping.TYP_SPRZETU === 'BUTY_SNOWBOARD') idPrefix = 'BS';
  
  const id = `${idPrefix}-${String(fireSnowItem.obiekt_id).padStart(4, '0')}`;
  
  // Rozdziel nazwę na markę (pierwsze słowo) i model (reszta)
  // server.js: MARKA = pierwsze słowo, MODEL = reszta + rocznik w nawiasach
  const words = parsedName.NAZWA.split(/\s+/).filter(w => w.trim() !== '');
  const marka = words[0] || '';  // Pierwsze słowo to marka
  const model = words.slice(1).join(' ') || '';  // Reszta to model
  
  // Dodaj rok do modelu jeśli istnieje (format: "SHAPE 3.0 (2025)")
  const modelWithYear = parsedName.ROK 
    ? `${model} (${parsedName.ROK})` 
    : model;
  
  // Mapuj dane
  return {
    ID: id,
    TYP_SPRZETU: typeMapping.TYP_SPRZETU,
    KATEGORIA: typeMapping.KATEGORIA,
    MARKA: marka,  // Tylko pierwsze słowo (np. "HEAD")
    MODEL: modelWithYear,  // Reszta + rocznik (np. "SHAPE 3.0 (2025)")
    DLUGOSC: parsedName.DLUGOSC,
    ILOSC: 1,  // Zawsze 1 (każda sztuka osobno)
    POZIOM: fireSnowItem.poziom || '',
    PLEC: plec,
    WAGA_MIN: fireSnowItem.waga_min || null,
    WAGA_MAX: fireSnowItem.waga_max || null,
    WZROST_MIN: fireSnowItem.wzrost_min || null,
    WZROST_MAX: fireSnowItem.wzrost_max || null,
    PRZEZNACZENIE: fireSnowItem.przeznaczenie || '',
    ATUTY: fireSnowItem.typ || '',  // PARAM7 to typ/atuty
    ROK: parsedName.ROK || null,  // Zachowaj dla kompatybilności, ale nie używane w UI
    KOD: fireSnowItem.kod || ''
  };
}

/**
 * Wczytuje sprzęt z FireSnow API
 * server.js: Pobieranie wszystkich sprzętów z FireSnow i mapowanie na format aplikacji
 * NOWE: Osobne logowanie dla każdej grupy z szczegółowymi statystykami
 */
async function loadEquipmentFromFireSnowAPI() {
  try {
    console.log('Server: Pobieranie sprzętu z FireSnow API:', FIRESNOW_API_URL);
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/sprzet/wszystkie`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const fireSnowData = await response.json();
    console.log(`Server: Otrzymano ${fireSnowData.length} rekordów sprzętu z FireSnow API`);
    console.log('Server: ========================================');
    
    // Definicja grup z ich ID i nazwami
    const groups = [
      { id: 82293, name: 'NARTY TOP', type: 'NARTY', category: 'TOP' },
      { id: 82412, name: 'NARTY VIP', type: 'NARTY', category: 'VIP' },
      { id: 82758, name: 'NARTY JUNIOR', type: 'NARTY', category: 'JUNIOR' },
      { id: 82738, name: 'BUTY DOROSLE', type: 'BUTY', category: 'DOROSLE' },
      { id: 82827, name: 'BUTY JUNIOR', type: 'BUTY', category: 'JUNIOR' },
      { id: 83762, name: 'SNOWBOARD DESKI', type: 'DESKI', category: '' },
      { id: 83760, name: 'SNOWBOARD BUTY S', type: 'BUTY_SNOWBOARD', category: '' }
    ];
    
    const allEquipment = [];
    
    // Przetwarzaj każdą grupę osobno
    for (const group of groups) {
      // Filtruj rekordy dla tej grupy
      const groupData = fireSnowData.filter(item => item.parent_group_id === group.id);
      
      console.log(`\nServer: === ${group.name} (ID: ${group.id}) ===`);
      console.log(`Server: Liczba rekordów: ${groupData.length}`);
      
      if (groupData.length === 0) {
        console.log(`Server: ⚠️  Brak rekordów dla grupy ${group.name}!`);
        continue;
      }
      
      // Statystyki podgrup
      const subGroups = {};
      groupData.forEach(item => {
        const subGroupId = item.sub_group_id;
        if (!subGroups[subGroupId]) {
          subGroups[subGroupId] = 0;
        }
        subGroups[subGroupId]++;
      });
      
      console.log(`Server: Liczba podgrup: ${Object.keys(subGroups).length}`);
      console.log(`Server: Podgrupy i liczba rekordów:`, subGroups);
      
      // Szczegółowe logowanie dla HEAD SHAPE w grupie TOP
      if (group.id === 82293) {
        const headShapeItems = groupData.filter(item => 
          item.nazwa_sprzetu && item.nazwa_sprzetu.toUpperCase().includes('HEAD SHAPE')
        );
        
        if (headShapeItems.length > 0) {
          console.log(`\nServer: 🔍 HEAD SHAPE w ${group.name}: ${headShapeItems.length} rekordów`);
          
          // Analiza nazw HEAD SHAPE
          const headShapeNames = {};
          headShapeItems.forEach(item => {
            const parsed = parseEquipmentName(item.nazwa_sprzetu || '');
            const key = parsed.NAZWA || 'BRAK_NAZWY';
            if (!headShapeNames[key]) {
              headShapeNames[key] = {
                count: 0,
                lengths: new Set(),
                examples: []
              };
            }
            headShapeNames[key].count++;
            if (parsed.DLUGOSC) {
              headShapeNames[key].lengths.add(parsed.DLUGOSC);
            }
            if (headShapeNames[key].examples.length < 3) {
              headShapeNames[key].examples.push({
                original: item.nazwa_sprzetu,
                parsed: parsed.NAZWA,
                dlugosc: parsed.DLUGOSC,
                kod: item.kod
              });
            }
          });
          
          console.log(`Server: Unikalne nazwy HEAD SHAPE po parsowaniu:`);
          Object.entries(headShapeNames).forEach(([name, data]) => {
            console.log(`  - "${name}": ${data.count} rekordów, długości: [${Array.from(data.lengths).sort((a,b) => a-b).join(', ')}]`);
            console.log(`    Przykłady oryginalnych nazw:`);
            data.examples.forEach(ex => {
              console.log(`      • "${ex.original}" → MARKA: "${ex.parsed}", DLUGOSC: ${ex.dlugosc || 'null'}, KOD: ${ex.kod}`);
            });
          });
          
          // Sprawdź czy są różne formaty nazw
          const uniqueOriginalNames = [...new Set(headShapeItems.map(item => item.nazwa_sprzetu))];
          if (uniqueOriginalNames.length > Object.keys(headShapeNames).length) {
            console.log(`\nServer: ⚠️  UWAGA: Różne oryginalne nazwy mapują się na te same nazwy po parsowaniu!`);
            console.log(`Server:    Oryginalnych nazw: ${uniqueOriginalNames.length}, unikalnych po parsowaniu: ${Object.keys(headShapeNames).length}`);
          }
        } else {
          console.log(`Server: ℹ️  Brak rekordów HEAD SHAPE w grupie ${group.name}`);
        }
      }
      
      // Mapuj rekordy dla tej grupy
      const mappedGroupData = groupData.map(item => mapFireSnowToSkiData(item));
      
      // Statystyki po mapowaniu
      const markaStats = {};
      mappedGroupData.forEach(item => {
        const marka = item.MARKA || 'BRAK_MARKI';
        if (!markaStats[marka]) {
          markaStats[marka] = 0;
        }
        markaStats[marka]++;
      });
      
      // Pokaż top 5 najczęstszych marek/modeli
      const topMarkas = Object.entries(markaStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (topMarkas.length > 0) {
        console.log(`Server: Top 5 marek/modeli w ${group.name}:`);
        topMarkas.forEach(([marka, count]) => {
          console.log(`  - "${marka}": ${count} rekordów`);
        });
      }
      
      allEquipment.push(...mappedGroupData);
      console.log(`Server: ✓ Zmapowano ${mappedGroupData.length} rekordów dla ${group.name}`);
    }
    
    console.log('\nServer: ========================================');
    console.log(`Server: Łącznie zmapowano ${allEquipment.length} rekordów sprzętu`);
    
    // Ogólne statystyki
    const categoryCounts = {};
    allEquipment.forEach(item => {
      const key = `${item.TYP_SPRZETU}_${item.KATEGORIA || 'BRAK'}`;
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });
    console.log('Server: Rozkład kategorii sprzętu:', categoryCounts);
    console.log('Server: ========================================\n');
    
    return allEquipment;
    
  } catch (error) {
    console.error('Server: Błąd pobierania sprzętu z FireSnow API:', error);
    throw error;
  }
}

/**
 * GET /api/skis - Pobierz wszystkie sprzęty z FireSnow API (z fallback do CSV)
 */
app.get('/api/skis', async (req, res) => {
  try {
    console.log('Server: GET /api/skis');
    
    let equipment = [];
    
    if (USE_FIRESNOW_API) {
      try {
        // Próbuj pobrać z FireSnow API
        equipment = await loadEquipmentFromFireSnowAPI();
        console.log(`Server: Zwracam ${equipment.length} rekordów sprzętu z FireSnow API`);
      } catch (apiError) {
        console.warn('Server: FireSnow API niedostępne, fallback do CSV:', apiError.message);
        // Fallback do CSV jeśli API nie działa
        try {
          console.log('Server: Fallback do CSV...');
          const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
          const result = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ','
          });
          equipment = result.data;
          console.log(`Server: Zwracam ${equipment.length} rekordów z CSV (fallback)`);
        } catch (csvError) {
          console.error('Server: Błąd fallback CSV:', csvError);
          throw csvError;
        }
      }
    } else {
      // Używaj CSV jeśli USE_FIRESNOW_API = false
      console.log('Server: Używam CSV (USE_FIRESNOW_API = false)');
      const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: ','
      });
      equipment = result.data;
      console.log(`Server: Zwracam ${equipment.length} rekordów z CSV`);
    }
    
    res.json(equipment);
  } catch (error) {
    console.error('Server: Błąd pobierania sprzętu:', error);
    res.status(500).json({ error: 'Błąd pobierania danych sprzętu' });
  }
});

/**
 * POST /api/skis - Dodaj nową nartę
 */
app.post('/api/skis', async (req, res) => {
  try {
    console.log('Server: POST /api/skis', req.body);
    
    const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ','
    });
    
    const skis = result.data;
    
    // Generuj nowe ID (max + 1)
    const maxId = Math.max(...skis.map(ski => parseInt(ski.ID) || 0), 0);
    const newId = (maxId + 1).toString();
    
    // Generuj unikalny KOD (jeśli nie podano)
    let newKod = req.body.KOD || '';
    if (!newKod) {
      const existingCodes = skis.map(ski => ski.KOD).filter(Boolean);
      let codeNum = 1;
      do {
        newKod = `NEW_${String(codeNum).padStart(3, '0')}`;
        codeNum++;
      } while (existingCodes.includes(newKod));
    }
    
    // Stwórz nową nartę
    const newSki = {
      ID: newId,
      TYP_SPRZETU: req.body.TYP_SPRZETU || 'NARTY',
      KATEGORIA: req.body.KATEGORIA || '',
      MARKA: req.body.MARKA || '',
      MODEL: req.body.MODEL || '',
      DLUGOSC: req.body.DLUGOSC || 0,
      ILOSC: req.body.ILOSC || 1,
      POZIOM: req.body.POZIOM || '',
      PLEC: req.body.PLEC || '',
      WAGA_MIN: req.body.WAGA_MIN || 0,
      WAGA_MAX: req.body.WAGA_MAX || 0,
      WZROST_MIN: req.body.WZROST_MIN || 0,
      WZROST_MAX: req.body.WZROST_MAX || 0,
      PRZEZNACZENIE: req.body.PRZEZNACZENIE || '',
      ATUTY: req.body.ATUTY || '',
      KOD: newKod
    };
    
    // Dodaj do listy
    skis.push(newSki);
    
    // Zapisz z powrotem do CSV - WYMUSZAMY KOLEJNOŚĆ KOLUMN
    const csvContentNew = Papa.unparse(skis, {
      delimiter: ',',
      header: true,
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'KOD']
    });
    
    await fs.writeFile(SKIS_CSV_PATH, csvContentNew, 'utf-8');
    
    console.log('Server: Narta dodana pomyślnie:', newSki);
    res.json(newSki);
  } catch (error) {
    console.error('Server: Błąd dodawania narty:', error);
    res.status(500).json({ error: 'Błąd dodawania narty' });
  }
});

/**
 * PUT /api/skis/bulk - Zaktualizuj wiele nart jednocześnie
 * UWAGA: Ten endpoint MUSI być PRZED /api/skis/:id, żeby Express go poprawnie dopasował!
 */
app.put('/api/skis/bulk', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    console.log('Server: PUT /api/skis/bulk - aktualizacja wielu nart');
    console.log('Server: IDs:', ids);
    console.log('Server: Updates:', updates);
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Brak tablicy ID do aktualizacji' });
    }
    
    const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ','
    });
    
    const skis = result.data;
    const updatedSkis = [];
    
    // Zaktualizuj wszystkie narty o podanych ID
    ids.forEach(id => {
      const index = skis.findIndex(ski => ski.ID === id);
      if (index !== -1) {
        console.log(`Server: Aktualizacja narty ${id} (index ${index})`);
        console.log('Server: Updates przed filtrowaniem:', updates);
        
        // Skopiuj dane bez pola KOD i ID (chronimy unikalne identyfikatory)
        const updatesWithoutCode = { ...updates };
        delete updatesWithoutCode.KOD;
        delete updatesWithoutCode.ID;
        
        console.log('Server: Updates po filtrowaniu:', updatesWithoutCode);
        
        skis[index] = { ...skis[index], ...updatesWithoutCode };
        updatedSkis.push(skis[index]);
        
        console.log('Server: Zaktualizowana narta:', skis[index]);
      }
    });
    
    if (updatedSkis.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono nart o podanych ID' });
    }
    
    console.log(`Server: Zaktualizowano ${updatedSkis.length} nart`);
    
    // Zapisz z powrotem do CSV
    const csvContentNew = Papa.unparse(skis, {
      delimiter: ',',
      header: true,
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'KOD']
    });
    
    await fs.writeFile(SKIS_CSV_PATH, csvContentNew, 'utf-8');
    
    console.log('Server: Narty zaktualizowane pomyślnie - zapisano do pliku');
    res.json(updatedSkis);
  } catch (error) {
    console.error('Server: Błąd aktualizacji wielu nart:', error);
    res.status(500).json({ error: 'Błąd aktualizacji wielu nart' });
  }
});

/**
 * PUT /api/skis/:id - Zaktualizuj pojedynczą nartę
 * UWAGA: Ten endpoint MUSI być PONIŻEJ /api/skis/bulk!
 */
app.put('/api/skis/:id', async (req, res) => {
  try {
    console.log('Server: PUT /api/skis/', req.params.id);
    console.log('Server: Otrzymane dane:', req.body);
    console.log('Server: KATEGORIA otrzymana:', req.body.KATEGORIA);
    console.log('Server: TYP_SPRZETU otrzymany:', req.body.TYP_SPRZETU);
    console.log('Server: PRZEZNACZENIE otrzymane:', req.body.PRZEZNACZENIE);
    
    const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ','
    });
    
    const skis = result.data;
    const index = skis.findIndex(ski => ski.ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Narta nie znaleziona' });
    }
    
    console.log('Server: Stara narta przed aktualizacją:', skis[index]);
    console.log('Server: KATEGORIA przed aktualizacją:', skis[index].KATEGORIA);
    
    // Aktualizuj dane narty
    skis[index] = { ...skis[index], ...req.body };
    
    console.log('Server: Nowa narta po aktualizacji:', skis[index]);
    console.log('Server: KATEGORIA po aktualizacji:', skis[index].KATEGORIA);
    console.log('Server: TYP_SPRZETU po aktualizacji:', skis[index].TYP_SPRZETU);
    console.log('Server: PRZEZNACZENIE po aktualizacji:', skis[index].PRZEZNACZENIE);
    
    // Zapisz z powrotem do CSV - WYMUSZAMY KOLEJNOŚĆ KOLUMN
    const csvContentNew = Papa.unparse(skis, {
      delimiter: ',',
      header: true,
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'KOD']
    });
    
    console.log('Server: Zapisuję CSV - pierwszy wiersz (header):', csvContentNew.split('\n')[0]);
    console.log('Server: Zapisuję CSV - zaktualizowany wiersz (index=' + index + '):', csvContentNew.split('\n')[index + 1]);
    
    await fs.writeFile(SKIS_CSV_PATH, csvContentNew, 'utf-8');
    
    console.log('Server: Narta zaktualizowana pomyślnie - zapisano do pliku');
    res.json(skis[index]);
  } catch (error) {
    console.error('Server: Błąd aktualizacji narty:', error);
    res.status(500).json({ error: 'Błąd aktualizacji narty' });
  }
});

/**
 * GET /api/health - Sprawdź status serwera
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Serwer asystenta nart działa poprawnie'
  });
});

/**
 * GET /api/firesnow/status - Sprawdź status połączenia z FireSnow API
 */
app.get('/api/firesnow/status', async (req, res) => {
  try {
    console.log('Server: Sprawdzanie statusu FireSnow API...');
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/health`, {
      signal: AbortSignal.timeout(5000) // 5 sec timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'online',
        api_url: FIRESNOW_API_URL,
        api_response: data
      });
    } else {
      res.json({
        status: 'error',
        api_url: FIRESNOW_API_URL,
        error: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    console.error('Server: FireSnow API niedostępne:', error.message);
    res.json({
      status: 'offline',
      api_url: FIRESNOW_API_URL,
      error: error.message
    });
  }
});

/**
 * POST /api/firesnow/refresh - Wymusza odświeżenie cache w FireSnow API
 */
app.post('/api/firesnow/refresh', async (req, res) => {
  try {
    console.log('Server: Wymuszam odświeżenie FireSnow API...');
    
    const response = await fetch(`${FIRESNOW_API_URL}/api/refresh`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        message: 'FireSnow API odświeżone',
        api_response: data
      });
    } else {
      res.status(500).json({
        success: false,
        error: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    console.error('Server: Błąd odświeżania FireSnow API:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Konwertuje datę z formatu DD.MM.YYYY na ISO 8601
 * server.js: Konwersja dat z bazy historii (DD.MM.YYYY) na format ISO 8601
 */
function convertDateToISO(dateString) {
  if (!dateString) return '';
  
  try {
    // Input: "31.12.2022"
    // Output: "2022-12-31T00:00:00"
    const [day, month, year] = dateString.split('.');
    if (!day || !month || !year) {
      console.warn('Server: Nieprawidłowy format daty:', dateString);
      return dateString;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
  } catch (error) {
    console.error('Server: Błąd konwersji daty:', dateString, error);
    return dateString;
  }
}

// API Routes - Historia wypożyczeń z MySQL (2022-2023)

/**
 * GET /api/historia/klienci/wyszukaj?nazwisko=XXX - Wyszukuje klientów po nazwisku
 * server.js: Wyszukiwanie klientów w bazie historii po nazwisku (tylko z wypożyczeniami)
 */
app.get('/api/historia/klienci/wyszukaj', async (req, res) => {
  try {
    const { nazwisko } = req.query;
    
    if (!nazwisko || nazwisko.trim().length < 2) {
      return res.json([]);
    }
    
    console.log('Server: Wyszukiwanie klientów po nazwisku (tylko z wypożyczeniami):', nazwisko);
    
    const pool = await getHistoryDBConnection();
    // JOIN z id_daty_2223 aby pokazać tylko klientów którzy mają wypożyczenia
    const [rows] = await pool.execute(
      `SELECT DISTINCT k.ID, k.Nazwisko, k.Imie, k.Telefon 
       FROM id_klient_2223 k
       INNER JOIN id_daty_2223 d ON k.ID = d.Klient
       WHERE k.Nazwisko LIKE ?
       ORDER BY k.Nazwisko, k.Imie 
       LIMIT 50`,
      [`%${nazwisko}%`]
    );
    
    // Mapuj dane na format frontendu
    const clients = rows.map(row => ({
      id: row.ID,
      nazwisko: row.Nazwisko || '',
      imie: row.Imie || '',
      telefon: row.Telefon || '',
      pelna_nazwa: `${row.Imie || ''} ${row.Nazwisko || ''}`.trim() || 'Brak nazwy'
    }));
    
    console.log(`Server: Znaleziono ${clients.length} klientów z wypożyczeniami`);
    res.json(clients);
  } catch (error) {
    console.error('Server: Błąd wyszukiwania klientów:', error);
    res.status(500).json({ error: 'Błąd wyszukiwania klientów' });
  }
});

/**
 * GET /api/historia/klient/:id/daty - Pobiera daty wypożyczeń dla klienta
 * server.js: Pobieranie unikalnych dat wypożyczeń dla wybranego klienta
 */
app.get('/api/historia/klient/:id/daty', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Nieprawidłowe ID klienta' });
    }
    
    console.log('Server: Pobieranie dat wypożyczeń dla klienta ID:', clientId);
    
    const pool = await getHistoryDBConnection();
    const [rows] = await pool.execute(
      `SELECT DISTINCT d.Od, d.Do, COUNT(*) as liczba_pozycji
       FROM id_daty_2223 d
       WHERE d.Klient = ?
       GROUP BY d.Od, d.Do
       ORDER BY d.Od DESC`,
      [clientId]
    );
    
    // Mapuj dane i konwertuj daty
    const dates = rows.map(row => ({
      od: row.Od || '',
      do: row.Do || '',
      od_iso: convertDateToISO(row.Od),
      do_iso: convertDateToISO(row.Do),
      liczba_pozycji: row.liczba_pozycji || 0
    }));
    
    console.log(`Server: Znaleziono ${dates.length} unikalnych dat dla klienta ${clientId}`);
    res.json(dates);
  } catch (error) {
    console.error('Server: Błąd pobierania dat klienta:', error);
    res.status(500).json({ error: 'Błąd pobierania dat klienta' });
  }
});

/**
 * GET /api/historia/klient/:id/sprzet?od=DD.MM.YYYY&do=DD.MM.YYYY - Pobiera sprzęt dla konkretnej daty
 * server.js: Pobieranie sprzętu wypożyczonego przez klienta w konkretnym okresie
 */
app.get('/api/historia/klient/:id/sprzet', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { od, do: doDate } = req.query;
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Nieprawidłowe ID klienta' });
    }
    
    if (!od || !doDate) {
      return res.status(400).json({ error: 'Brakuje parametrów od lub do' });
    }
    
    console.log('Server: Pobieranie sprzętu dla klienta ID:', clientId, 'od:', od, 'do:', doDate);
    
    const pool = await getHistoryDBConnection();
    const [rows] = await pool.execute(
      `SELECT d.*, k.Nazwisko, k.Imie, k.Telefon, s.Symbol, s.Nazwa, s.Dlugosc
       FROM id_daty_2223 d
       LEFT JOIN id_klient_2223 k ON d.Klient = k.ID
       LEFT JOIN id_sprzet_2223 s ON d.Numer_kod = s.Umowa
       WHERE d.Klient = ? AND d.Od = ? AND d.Do = ?
       ORDER BY s.Nazwa, s.Symbol`,
      [clientId, od, doDate]
    );
    
    // Mapuj dane na format ReservationData
    const equipment = rows.map((row, index) => {
      // Mapuj status "Oddana" (prawda/fałsz) na tekst
      // Obsługa różnych wariantów: wielkość liter, spacje, polskie znaki
      const oddanaValue = row.Oddana ? String(row.Oddana).trim().toLowerCase() : '';
      let status = '';
      
      if (oddanaValue === 'prawda' || oddanaValue === 'true' || oddanaValue === '1') {
        status = 'Oddane';
      } else if (oddanaValue === 'fałsz' || oddanaValue === 'falsz' || oddanaValue === 'false' || oddanaValue === '0') {
        status = 'Nie oddane';
      }
      
      // Logowanie dla debugowania (tylko pierwszy rekord)
      if (index === 0) {
        console.log('Server: Przykładowa wartość Oddana z bazy:', row.Oddana, '-> status:', status);
      }
      
      return {
        klient: `${row.Imie || ''} ${row.Nazwisko || ''}`.trim() || 'Brak nazwy',
        sprzet: row.Nazwa || '',
        kod: row.Symbol || '',
        od: convertDateToISO(row.Od),
        do: convertDateToISO(row.Do),
        cena: row.Kwota ? row.Kwota.toString() : '0',
        zaplacono: '0', // Baza historii nie ma tego pola
        numer: row.Numer_kod ? row.Numer_kod.toString() : '',
        typumowy: 'STANDARD', // Domyślnie STANDARD
        uwagi: row.Oddana === 'prawda' ? 'Oddana' : (row.Oddana === 'fałsz' ? 'Nie oddana' : ''),
        status: status, // Pole statusu
        source: 'history',
        dlugosc: row.Dlugosc || null,
        liczba_dni: row.Liczba_dni || 0
      };
    });
    
    console.log(`Server: Znaleziono ${equipment.length} pozycji sprzętu dla klienta ${clientId}`);
    res.json(equipment);
  } catch (error) {
    console.error('Server: Błąd pobierania sprzętu klienta:', error);
    res.status(500).json({ error: 'Błąd pobierania sprzętu klienta' });
  }
});

// Serwuj aplikację React dla wszystkich innych ścieżek (catch-all route)
// Express 5.x wymaga użycia middleware zamiast route dla wildcard
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
  console.log(`   Status: ${USE_FIRESNOW_API ? 'ENABLED ✅' : 'DISABLED (używa CSV)'}`);
  console.log(`   URL: ${FIRESNOW_API_URL}`);
  console.log(`   Fallback rezerwacje: CSV (${RESERVATIONS_CSV_PATH})`);
  console.log(`   Fallback wypożyczenia: CSV (${RENTALS_CSV_PATH})`);
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
