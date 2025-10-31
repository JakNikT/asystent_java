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
 * GET /api/skis - Pobierz wszystkie narty
 */
app.get('/api/skis', async (req, res) => {
  try {
    console.log('Server: GET /api/skis');
    const csvContent = await fs.readFile(SKIS_CSV_PATH, 'utf-8');
    
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ','
    });
    
    res.json(result.data);
  } catch (error) {
    console.error('Server: Błąd pobierania nart:', error);
    res.status(500).json({ error: 'Błąd pobierania nart' });
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
      ROK: req.body.ROK || new Date().getFullYear(),
      KOD: newKod
    };
    
    // Dodaj do listy
    skis.push(newSki);
    
    // Zapisz z powrotem do CSV - WYMUSZAMY KOLEJNOŚĆ KOLUMN
    const csvContentNew = Papa.unparse(skis, {
      delimiter: ',',
      header: true,
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'ROK', 'KOD']
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
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'ROK', 'KOD']
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
      columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'ROK', 'KOD']
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
