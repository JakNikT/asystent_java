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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Ścieżki do plików CSV
const RESERVATIONS_CSV_PATH = path.join(__dirname, 'public', 'data', 'rezerwacja.csv');
const SKIS_CSV_PATH = path.join(__dirname, 'public', 'data', 'NOWABAZA_final.csv');

/**
 * Wczytuje rezerwacje z pliku CSV
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

// API Routes

/**
 * GET /api/reservations - Pobierz wszystkie rezerwacje
 */
app.get('/api/reservations', async (req, res) => {
  try {
    console.log('Server: GET /api/reservations');
    const reservations = await loadReservationsFromCSV();
    res.json(reservations);
  } catch (error) {
    console.error('Server: Błąd pobierania rezerwacji:', error);
    res.status(500).json({ error: 'Błąd pobierania rezerwacji' });
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
 * PUT /api/skis/:id - Zaktualizuj nartę
 */
app.put('/api/skis/:id', async (req, res) => {
  try {
    console.log('Server: PUT /api/skis/', req.params.id, req.body);
    
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
    
    // Aktualizuj dane narty
    skis[index] = { ...skis[index], ...req.body };
    
    // Zapisz z powrotem do CSV
    const csvContentNew = Papa.unparse(skis, {
      delimiter: ',',
      header: true
    });
    
    await fs.writeFile(SKIS_CSV_PATH, csvContentNew, 'utf-8');
    
    console.log('Server: Narta zaktualizowana pomyślnie');
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

// Serwuj aplikację React dla wszystkich innych ścieżek
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Uruchom serwer
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serwer asystenta nart uruchomiony na porcie ${PORT}`);
  console.log(`📱 Dostęp lokalny: http://localhost:${PORT}`);
  console.log(`🌐 Dostęp sieciowy: http://[IP_KOMPUTERA]:${PORT}`);
  console.log(`📊 API dostępne pod: http://localhost:${PORT}/api/`);
  console.log(`💾 Plik rezerwacji: ${RESERVATIONS_CSV_PATH}`);
  console.log('');
  console.log('Aby znaleźć adres IP komputera, uruchom: ipconfig');
});
