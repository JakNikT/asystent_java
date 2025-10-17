/**
 * Skrypt konwersji plików rezerwacji z aplikacji FireFnow
 * 
 * Automatycznie konwertuje:
 * - Średniki (;) na przecinki (,)
 * - Kodowanie Windows-1250 na UTF-8
 * - Naprawia polskie znaki
 * 
 * Użycie:
 * 1. Wklej plik z FireFnow do public/data/ (np. reezerwacja.csv)
 * 2. Uruchom: node scripts/convert-firefnow-to-rezerwacja.js
 * 3. Plik zostanie skonwertowany i zapisany jako rezerwacja.csv
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// Ścieżki plików
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const INPUT_FILE = path.join(DATA_DIR, 'rez.csv'); // Plik z FireFnow
const OUTPUT_FILE = path.join(DATA_DIR, 'rezerwacja.csv'); // Plik dla programu

console.log('🔄 Konwerter plików FireFnow → Asystent Nart');
console.log('================================================\n');

// Sprawdź czy plik wejściowy istnieje
if (!fs.existsSync(INPUT_FILE)) {
  console.error('❌ Błąd: Nie znaleziono pliku:', INPUT_FILE);
  console.log('\n💡 Wskazówka:');
  console.log('   1. Wyeksportuj dane z FireFnow do pliku CSV');
  console.log('   2. Zapisz plik jako "rez.csv"');
  console.log('   3. Skopiuj go do folderu: public/data/');
  console.log('   4. Uruchom ponownie ten skrypt\n');
  console.log('   LUB użyj przycisku "Importuj z FireFnow" w aplikacji!\n');
  process.exit(1);
}

console.log('✅ Znaleziono plik:', INPUT_FILE);

try {
  // Krok 1: Wczytaj plik jako buffer
  console.log('\n📖 Krok 1: Wczytuję plik z FireFnow...');
  const buffer = fs.readFileSync(INPUT_FILE);
  
  // Krok 2: Dekoduj z Windows-1250 do UTF-8
  console.log('🔤 Krok 2: Konwertuję kodowanie Windows-1250 → UTF-8...');
  let content = iconv.decode(buffer, 'win1250');
  
  // Krok 3: Reorganizuj kolumny i wybierz tylko potrzebne
  console.log('📝 Krok 3: Reorganizuję kolumny i określam typ umowy...');
  console.log('   Wybrane kolumny: Klient, Sprzęt, Kod, Od, Do, TypUmowy, Numer, Cena, Zapłacono');
  console.log('   TypUmowy: "PROMOTOR" (jeśli Uwagi="P") lub "STANDARD"');
  
  // Podziel na linie
  const lines = content.split(/\r?\n/);
  const convertedLines = [];
  
  lines.forEach((line, index) => {
    if (line.trim() === '') {
      return; // Pomiń puste linie
    }
    
    // Podziel linię po średnikach (oryginalne separatory)
    const fields = line.split(';');
    
    // Jeśli to nagłówek (pierwsza linia), stwórz nowy standardowy nagłówek
    if (index === 0) {
      const newHeader = 'Klient,Sprzęt,Kod,Od,Do,TypUmowy,Numer,Cena,Zapłacono';
      convertedLines.push(newHeader);
      console.log('   ✅ Nagłówek zamieniony na:', newHeader);
      return;
    }
    
    // FireFnow format: Numer;Sprzęt;Klient;Kod;Od;Do;Do Startu;Zapłacono;Cennik;Uwagi
    // Indeksy:          0      1       2      3   4   5   6          7         8       9
    
    const numer = fields[0] || '';
    const sprzet = fields[1] || '';
    const klient = fields[2] || '';
    const kod = fields[3] || '';
    const od = fields[4] || '';
    const do_date = fields[5] || '';
    const uwagi = fields[9] || '';
    
    // Określ typ umowy na podstawie kolumny Uwagi
    // "P" = PROMOTOR, puste lub inne = STANDARD
    const typUmowy = (uwagi && uwagi.trim().toUpperCase() === 'P') ? 'PROMOTOR' : 'STANDARD';
    
    // Nowa struktura: Klient,Sprzęt,Kod,Od,Do,TypUmowy,Numer,Cena,Zapłacono
    const newFields = [
      klient,
      sprzet,
      kod,
      od,
      do_date,
      typUmowy,
      numer,
      '0',  // Cena domyślnie 0
      '0'   // Zapłacono domyślnie 0
    ];
    
    // Połącz pola z przecinkami (nowy separator CSV)
    const convertedLine = newFields.join(',');
    convertedLines.push(convertedLine);
    
    // Pokaż przykład konwersji (pierwsze 3 linie danych)
    if (index <= 3) {
      console.log(`   Linia ${index}:`);
      console.log(`   Przed: ${line.substring(0, 80)}...`);
      console.log(`   Po:    ${convertedLine.substring(0, 80)}...`);
    }
  });
  
  // Krok 5: Połącz linie z powrotem
  const convertedContent = convertedLines.join('\n');
  
  // Krok 6: Zapisz w UTF-8
  console.log('\n💾 Krok 5: Zapisuję skonwertowany plik...');
  fs.writeFileSync(OUTPUT_FILE, convertedContent, 'utf8');
  
  // Krok 7: Weryfikacja
  console.log('✔️  Krok 6: Weryfikuję plik...');
  const verification = fs.readFileSync(OUTPUT_FILE, 'utf8');
  const verificationLines = verification.split('\n');
  
  console.log('\n📊 Statystyki konwersji:');
  console.log('   - Liczba linii (z FireFnow):     ', lines.length);
  console.log('   - Liczba linii (po konwersji):   ', verificationLines.length);
  console.log('   - Rozmiar pliku (przed):         ', buffer.length, 'bajtów');
  console.log('   - Rozmiar pliku (po):            ', Buffer.from(convertedContent, 'utf8').length, 'bajtów');
  
  // Sprawdź nagłówek
  const header = verificationLines[0];
  console.log('\n📋 Nagłówek pliku:');
  console.log('   ', header);
  
  // Sprawdź czy zawiera polskie znaki
  const hasPolishChars = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(convertedContent);
  console.log('\n🇵🇱 Polskie znaki:');
  console.log('   ', hasPolishChars ? '✅ Znaleziono i zachowano' : '⚠️  Nie znaleziono');
  
  // Przykładowe dane
  if (verificationLines.length > 1) {
    console.log('\n📄 Przykładowy rekord (linia 2):');
    const fields = verificationLines[1].split(',');
    console.log('   Klient:     ', fields[0] || '-');
    console.log('   Sprzęt:     ', fields[1] || '-');
    console.log('   Kod:        ', fields[2] || '-');
    console.log('   Od:         ', fields[3] || '-');
    console.log('   Do:         ', fields[4] || '-');
    console.log('   TypUmowy:   ', fields[5] || '-');
    console.log('   Numer:      ', fields[6] || '-');
    console.log('   Cena:       ', fields[7] || '-');
    console.log('   Zapłacono:  ', fields[8] || '-');
    
    // Policz statystyki typów umów
    let promotorCount = 0;
    let standardCount = 0;
    for (let i = 1; i < verificationLines.length; i++) {
      const line = verificationLines[i];
      if (line.trim() === '') continue;
      const lineFields = line.split(',');
      const typ = lineFields[5];
      if (typ === 'PROMOTOR') promotorCount++;
      else if (typ === 'STANDARD') standardCount++;
    }
    console.log('\n📊 Statystyki typów umów:');
    console.log('   PROMOTOR:  ', promotorCount, 'rezerwacji');
    console.log('   STANDARD:  ', standardCount, 'rezerwacji');
  }
  
  console.log('\n✅ SUKCES! Plik został skonwertowany!');
  console.log('================================================');
  console.log('📁 Plik wejściowy:  ', INPUT_FILE);
  console.log('📁 Plik wyjściowy:  ', OUTPUT_FILE);
  console.log('\n💡 Co dalej?');
  console.log('   1. Uruchom aplikację: npm run dev');
  console.log('   2. Przejdź do widoku "Rezerwacje"');
  console.log('   3. Odśwież stronę (Ctrl+F5)');
  console.log('   4. Dane z FireFnow powinny się wyświetlić!\n');
  
} catch (error) {
  console.error('\n❌ Błąd podczas konwersji:', error.message);
  console.error('\n🔍 Szczegóły błędu:');
  console.error(error);
  process.exit(1);
}

