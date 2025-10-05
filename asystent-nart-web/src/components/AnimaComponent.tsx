import React, { useState, useEffect } from 'react';
import { CSVParser } from '../utils/csvParser';
import { SkiMatchingService } from '../services/skiMatchingService';
import { 
  validateForm, 
  initialFormErrors, 
  validateDay, 
  validateMonth, 
  validateYear, 
  validateHeightRealtime, 
  validateWeightRealtime, 
  validateLevelRealtime, 
  validateGenderRealtime,
  type FormErrors 
} from '../utils/formValidation';
import { saveUserSession, loadUserSession, clearUserSession, saveSearchHistory } from '../utils/localStorage';
import { MatchIndicators } from './MatchIndicators';
import type { SkiData, SearchResults } from '../types/ski.types';

interface FormData {
  dateFrom: {
    day: string;
    month: string;
    year: string;
  };
  dateTo: {
    day: string;
    month: string;
    year: string;
  };
  height: {
    value: string;
    unit: string;
  };
  weight: {
    value: string;
    unit: string;
  };
  level: string;
  gender: string;
  preferences: string[];
}

const AnimaComponent: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    dateFrom: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
    dateTo: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
    height: { value: '', unit: 'cm' },
    weight: { value: '', unit: 'kg' },
    level: '',
    gender: '',
    preferences: ['Wszystkie'] // Domyślnie "Wszystkie"
  });

  const [skisDatabase, setSkisDatabase] = useState<SkiData[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);

  // Wczytaj dane sesji przy starcie aplikacji
  useEffect(() => {
    console.log('src/components/AnimaComponent.tsx: Wczytuję dane sesji przy starcie aplikacji');
    const savedSession = loadUserSession();
    if (savedSession) {
      console.log('src/components/AnimaComponent.tsx: Znaleziono zapisane dane sesji:', savedSession);
      console.log('src/components/AnimaComponent.tsx: Daty z LocalStorage - dateFrom:', savedSession.formData.dateFrom, 'dateTo:', savedSession.formData.dateTo);
      
      // Sprawdź czy daty mają stare wartości (np. year: '2025' bez day i month)
      const hasInvalidDates = 
        (savedSession.formData.dateFrom.year && !savedSession.formData.dateFrom.day && !savedSession.formData.dateFrom.month) ||
        (savedSession.formData.dateTo.year && !savedSession.formData.dateTo.day && !savedSession.formData.dateTo.month);
      
      if (hasInvalidDates) {
        console.log('src/components/AnimaComponent.tsx: Wykryto nieprawidłowe daty w LocalStorage, czyszczę...');
        clearUserSession();
        console.log('src/components/AnimaComponent.tsx: LocalStorage wyczyszczony, używam domyślnych wartości');
        return;
      }
      
      // Upewnij się, że struktura danych jest kompletna
      const completeFormData = {
        ...savedSession.formData,
        dateFrom: {
          day: savedSession.formData.dateFrom.day || '',
          month: savedSession.formData.dateFrom.month || '',
          year: savedSession.formData.dateFrom.year || ''
        },
        dateTo: {
          day: savedSession.formData.dateTo.day || '',
          month: savedSession.formData.dateTo.month || '',
          year: savedSession.formData.dateTo.year || ''
        },
        height: {
          value: savedSession.formData.height.value || '',
          unit: savedSession.formData.height.unit || 'cm'
        },
        weight: {
          value: savedSession.formData.weight.value || '',
          unit: savedSession.formData.weight.unit || 'kg'
        }
      };
      console.log('src/components/AnimaComponent.tsx: Zaktualizowane dane formularza:', completeFormData);
      setFormData(completeFormData);
    } else {
      console.log('src/components/AnimaComponent.tsx: Brak zapisanych danych sesji, używam domyślnych');
    }
  }, []);

  // Refs dla automatycznego przechodzenia między polami
  const dayFromRef = React.useRef<HTMLInputElement>(null);
  const monthFromRef = React.useRef<HTMLInputElement>(null);
  const dayToRef = React.useRef<HTMLInputElement>(null);
  const monthToRef = React.useRef<HTMLInputElement>(null);
  const heightRef = React.useRef<HTMLInputElement>(null);
  const weightRef = React.useRef<HTMLInputElement>(null);
  const levelRef = React.useRef<HTMLInputElement>(null);
  const genderRef = React.useRef<HTMLInputElement>(null);

  // Ładowanie bazy danych przy starcie
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setIsLoading(true);
        const skis = await CSVParser.loadFromPublic();
        setSkisDatabase(skis);
        console.log(`Załadowano ${skis.length} nart z bazy danych`);
      } catch (err) {
        console.error('Błąd ładowania bazy:', err);
        setError('Nie udało się załadować bazy danych nart');
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabase();
  }, []);

  const handleInputChange = (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => {
    console.log(`src/components/AnimaComponent.tsx: Zmiana pola - sekcja: ${section}, pole: ${field}, wartość: ${value}`);
    
    // Walidacja w czasie rzeczywistym
    let isValid = true;
    let errorMessage = '';

    if (section === 'dateFrom' || section === 'dateTo') {
      if (field === 'day') {
        const validation = validateDay(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      } else if (field === 'month') {
        const validation = validateMonth(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      } else if (field === 'year') {
        const validation = validateYear(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      }
    } else if (section === 'height' && field === 'value') {
      const validation = validateHeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
      console.log(`src/components/AnimaComponent.tsx: Walidacja wzrostu - wartość: ${value}, isValid: ${isValid}`);
    } else if (section === 'weight' && field === 'value') {
      const validation = validateWeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'level') {
      const validation = validateLevelRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'gender') {
      const validation = validateGenderRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    }

    // Jeśli walidacja nie przeszła, nie aktualizuj wartości
    if (!isValid) {
      console.log(`src/components/AnimaComponent.tsx: Walidacja nie przeszła - ${errorMessage}`);
      return;
    }

    console.log(`src/components/AnimaComponent.tsx: Walidacja przeszła, aktualizuję dane`);

    // Aktualizuj dane formularza (bez formatowania)
    if (section === 'dateFrom' || section === 'dateTo') {
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    } else if (section === 'height' || section === 'weight') {
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    } else {
      console.log(`src/components/AnimaComponent.tsx: Aktualizuję ${section} na wartość: ${value}`);
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: value
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    }

    // Wyczyść błędy dla tego pola
    setFormErrors(prev => {
      const newErrors = { ...prev };
      if (section === 'dateFrom' || section === 'dateTo') {
        newErrors[section] = { ...newErrors[section], [field]: '' };
      } else if (section === 'height' || section === 'weight' || section === 'level' || section === 'gender') {
        newErrors[section] = '';
      }
      return newErrors;
    });

    // Automatyczne przechodzenie do następnego pola
    console.log(`src/components/AnimaComponent.tsx: Sprawdzanie automatycznego przechodzenia - sekcja: ${section}, pole: ${field}, wartość: "${value}", długość: ${value.length}`);
    
    if (inputRef) {
      // Dzień "od" → Miesiąc "od"
      if (section === 'dateFrom' && field === 'day' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do miesiąca "od"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Miesiąc "od" → Dzień "do"
      else if (section === 'dateFrom' && field === 'month' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do dnia "do"`);
        const nextInput = dayToRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Dzień "do" → Miesiąc "do"
      else if (section === 'dateTo' && field === 'day' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do miesiąca "do"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Miesiąc "do" → Wzrost
      else if (section === 'dateTo' && field === 'month' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do wzrostu`);
        const nextInput = heightRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Wzrost → Waga (po 3 cyfrach lub gdy wartość >= 100)
      else if (section === 'height' && field === 'value') {
        const heightNum = parseInt(value);
        console.log(`src/components/AnimaComponent.tsx: Sprawdzanie wzrostu - wartość: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
        console.log(`src/components/AnimaComponent.tsx: Warunek 1 (długość >= 3): ${value.length >= 3}`);
        console.log(`src/components/AnimaComponent.tsx: Warunek 2 (długość >= 2 && liczba >= 100): ${value.length >= 2 && heightNum >= 100}`);
        
        if (value.length >= 3 || (value.length >= 2 && heightNum >= 100)) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do wagi - wzrost: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
          const nextInput = weightRef.current;
          if (nextInput) {
            console.log(`src/components/AnimaComponent.tsx: Znaleziono pole wagi, przechodzę`);
            nextInput.focus();
          } else {
            console.log(`src/components/AnimaComponent.tsx: Nie znaleziono pola wagi`);
          }
        } else {
          console.log(`src/components/AnimaComponent.tsx: Warunek nie spełniony - nie przechodzę`);
        }
      }
      // Waga → Poziom (po 2 cyfrach lub 3 cyfrach jeśli zaczyna się na 1 lub 2)
      else if (section === 'weight' && field === 'value') {
        if (value.length === 2 && !value.startsWith('1') && !value.startsWith('2')) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do poziomu - waga: ${value} (2 cyfry, nie zaczyna się na 1/2)`);
          const nextInput = levelRef.current;
          if (nextInput) {
            nextInput.focus();
          }
        } else if (value.length === 3 && (value.startsWith('1') || value.startsWith('2'))) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do poziomu - waga: ${value} (3 cyfry, zaczyna się na 1/2)`);
          const nextInput = levelRef.current;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }
      // Poziom → Płeć (po 1 cyfrze)
      else if (section === 'level' && value.length >= 1) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do płci - poziom: ${value}`);
        const nextInput = genderRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Płeć → Automatyczne wyszukiwanie (po wpisaniu M lub K)
      else if (section === 'gender' && (value.toUpperCase() === 'M' || value.toUpperCase() === 'K')) {
        console.log(`src/components/AnimaComponent.tsx: Wypełniono płeć, automatyczne wyszukiwanie`);
        // Przygotuj aktualne dane z nową płcią
        const updatedData = { ...formData, gender: value };
        console.log(`src/components/AnimaComponent.tsx: Zaktualizowane dane przed wyszukiwaniem:`, updatedData);
        
        // Aktualizuj stan i od razu wyszukaj z aktualnymi danymi
        setFormData(updatedData);
        setTimeout(() => {
          handleSubmit(updatedData);
        }, 50);
      }
    }
  };

  const handlePreferenceChange = (preference: string) => {
    console.log(`src/components/AnimaComponent.tsx: Zmiana preferencji na: ${preference}`);
    setFormData(prev => ({
      ...prev,
      preferences: [preference] // Tylko jeden wybór (radio button)
    }));
    
    // Automatyczne wyszukiwanie po zmianie preferencji
    setTimeout(() => {
      console.log(`src/components/AnimaComponent.tsx: Automatyczne wyszukiwanie po zmianie preferencji`);
      handleSubmit();
    }, 100);
  };

  const handleSubmit = (customFormData?: FormData) => {
    const dataToValidate = customFormData || formData;
    console.log('src/components/AnimaComponent.tsx: Rozpoczęcie walidacji formularza');
    console.log('src/components/AnimaComponent.tsx: Aktualne dane formularza:', dataToValidate);
    
    // Wyczyść poprzednie błędy
    setFormErrors(initialFormErrors);
    setError('');

    // Waliduj formularz
    const validation = validateForm(dataToValidate);
    
    if (!validation.isValid) {
      console.log('src/components/AnimaComponent.tsx: Formularz zawiera błędy walidacji');
      setFormErrors(validation.errors);
      setError('Proszę poprawić błędy w formularzu');
      return;
    }

    if (dataToValidate.preferences.length === 0) {
      setError('Proszę wybrać preferencje stylu jazdy');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Przygotuj kryteria wyszukiwania
      const criteria = {
        wzrost: parseInt(dataToValidate.height.value),
        waga: parseInt(dataToValidate.weight.value),
        poziom: parseInt(dataToValidate.level),
        plec: dataToValidate.gender.toUpperCase().trim() as 'M' | 'K',
        styl_jazdy: dataToValidate.preferences[0] // Tylko jedna preferencja (radio button)
      };

      console.log('src/components/AnimaComponent.tsx: Kryteria wyszukiwania:', criteria);

      // Wyszukaj pasujące narty
      const results = SkiMatchingService.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      // Zapisz historię wyszukiwania
      saveSearchHistory({
        criteria,
        resultsCount: {
          idealne: results.idealne.length,
          alternatywy: results.alternatywy.length,
          poziom_za_nisko: results.poziom_za_nisko.length,
          inna_plec: results.inna_plec.length,
          na_sile: results.na_sile.length,
          wszystkie: results.wszystkie.length
        }
      });

      console.log('src/components/AnimaComponent.tsx: Znaleziono wyników:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('src/components/AnimaComponent.tsx: Błąd wyszukiwania:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  // Event handler dla przycisku "Wyszukaj"
  const handleSubmitClick = (event: React.MouseEvent) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleClear = () => {
    console.log('src/components/AnimaComponent.tsx: Czyszczenie formularza');
    const defaultData = {
      dateFrom: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
      dateTo: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' },
      level: '',
      gender: '',
      preferences: ['Wszystkie'] // Domyślnie "Wszystkie"
    };
    
    setFormData(defaultData);
    setSearchResults(null);
    setError('');
    setFormErrors(initialFormErrors);
    
    // Wyczyść dane sesji z LocalStorage
    clearUserSession();
    console.log('src/components/AnimaComponent.tsx: Dane sesji wyczyszczone z LocalStorage');
  };

  return (
    <div className="w-[1100px] h-[650px] relative bg-[#386BB2] overflow-hidden">
      {/* Header Section */}
      <div className="w-[1100px] h-[200px] absolute top-0 left-0 bg-[#386BB2] flex items-start justify-between p-2">
        {/* Avatar */}
        <div className="w-[180px] h-[180px] bg-[#D9D9D9] rounded-full" />
        
        {/* Main Content Container */}
        <div className="w-[890px] h-[180px] bg-[#194576] rounded-[20px] flex items-center justify-start gap-3 p-2">
            
            {/* Left Section - Personal Data */}
            <div className="w-[307px] h-[160px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-1.5">
              {/* Date From */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] border border-white flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data od:</span>
                </div>
                <input
                  ref={dayFromRef}
                  type="text"
                  placeholder="DD"
                  value={formData.dateFrom.day}
                  onChange={(e) => handleInputChange('dateFrom', 'day', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  ref={monthFromRef}
                  type="text"
                  placeholder="MM"
                  value={formData.dateFrom.month}
                  onChange={(e) => handleInputChange('dateFrom', 'month', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <select
                  value={formData.dateFrom.year}
                  onChange={(e) => handleInputChange('dateFrom', 'year', e.target.value)}
                  className={`w-[61px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                >
                  <option value="">Rok</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
            </div>

              {/* Date To */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data do:</span>
                </div>
                <input
                  ref={dayToRef}
                  type="text"
                  placeholder="DD"
                  value={formData.dateTo.day}
                  onChange={(e) => handleInputChange('dateTo', 'day', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  ref={monthToRef}
                  type="text"
                  placeholder="MM"
                  value={formData.dateTo.month}
                  onChange={(e) => handleInputChange('dateTo', 'month', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <select
                  value={formData.dateTo.year}
                  onChange={(e) => handleInputChange('dateTo', 'year', e.target.value)}
                  className={`w-[61px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                >
                  <option value="">Rok</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              {/* Height */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">📏 Wzrost:</span>
                </div>
                <input
                  ref={heightRef}
                  type="text"
                  placeholder="180"
                  value={formData.height.value}
                  onChange={(e) => handleInputChange('height', 'value', e.target.value, e.target)}
                  className={`w-[112px] h-[31px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.height ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <div className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">cm</span>
                </div>
              </div>

              {/* Weight */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">⚖️ Waga:</span>
                </div>
                <input
                  ref={weightRef}
                  type="text"
                  placeholder="70"
                  value={formData.weight.value}
                  onChange={(e) => handleInputChange('weight', 'value', e.target.value, e.target)}
                  className={`w-[112px] h-[31px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.weight ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <div className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">kg</span>
                </div>
              </div>
            </div>

            {/* Center Section - Level and Gender */}
            <div className="w-[230px] h-[140px] flex flex-col justify-start items-center gap-[5px]">
              {/* Client Data Title */}
              <div className="w-[197px] h-[39px] bg-[#2C699F] rounded-[10px] border border-white flex justify-center items-center">
                <div className="text-center justify-center text-white text-[21px] font-black font-['Inter'] italic underline leading-[29px]">Dane klienta</div>
              </div>
              
              {/* Level and Gender Section */}
              <div className="w-[230px] h-[96px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-start gap-1.5">
                {/* Level */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">Poziom:</span>
                  </div>
                  <input
                    ref={levelRef}
                    type="text"
                    placeholder="1-6"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', 'value', e.target.value, e.target)}
                    className={`w-[60px] h-[35px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                      formErrors.level ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                    }`}
                  />
                </div>

                {/* Gender */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">👤 Płeć:</span>
                  </div>
                  <input
                    ref={genderRef}
                    type="text"
                    placeholder="M/K"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', 'value', e.target.value, e.target)}
                    className={`w-[60px] h-[35px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                      formErrors.gender ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Right Section - Preferences and Buttons */}
            <div className="w-[300px] h-[160px] p-1 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-[5px]">
              {/* Preferences Title */}
              <div className="w-[140px] h-[25px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                <div className="text-center justify-center text-white text-[20px] font-black font-['Inter'] italic underline leading-[28px]">Preferencje:</div>
              </div>

              {/* Radio Buttons Grid - 2 rzędy po 3 */}
              <div className="w-[300px] flex flex-col justify-center items-center gap-1">
                {/* Pierwszy rząd */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['Wszystkie', 'Slalom', 'Poza trase'].map((pref) => (
                    <label key={pref} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="preferences"
                        checked={formData.preferences.includes(pref)}
                        onChange={() => handlePreferenceChange(pref)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">{pref}</span>
                    </label>
                  ))}
                </div>
                
                {/* Drugi rząd */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['Cały dzień', 'Gigant', 'Pomiędzy'].map((pref) => (
                    <label key={pref} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="preferences"
                        checked={formData.preferences.includes(pref)}
                        onChange={() => handlePreferenceChange(pref)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-[299px] h-[75px] flex justify-center items-center gap-[5px] flex-wrap">
                <button
                  onClick={handleSubmitClick}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🔍 Wyszukaj</span>
                </button>
                <button
                  onClick={handleClear}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🗑️ Wyczyść</span>
                </button>
                <button className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">📋 Przeglądaj</span>
                </button>
                <button className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">🔄 Rezerwacje</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Results Section */}
      <div className="w-[1100px] h-[450px] absolute top-[200px] left-0 bg-[#386BB2] flex flex-col justify-start items-start gap-2.5 p-5">
        {/* Results Header */}
        <div className="w-[344px] h-[50px] bg-[#194576] rounded-tl-[20px] rounded-tr-[20px] rounded-bl-[10px] rounded-br-[10px] flex justify-center items-center">
          <div className="text-white text-[30px] font-normal font-['ADLaM_Display'] underline leading-[42px]">🔍 Wyniki Doboru Nart</div>
        </div>
        
          {/* Results Container */}
          <div className="w-[1062px] h-[365px] bg-[#194576] rounded-[20px] flex justify-start items-start gap-2.5 p-2">
            <div className="flex-1 h-[343px] bg-[#A6C2EF] rounded-[20px] p-4 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-white text-xl font-black font-['Inter'] italic">
                    ⏳ Wyszukiwanie nart...
                  </span>
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <span className="text-red-600 text-lg font-black font-['Inter'] italic">
                    ❌ {error}
                  </span>
                  
                  {/* Wyświetl szczegółowe błędy walidacji */}
                  {(formErrors.height || formErrors.weight || formErrors.level || formErrors.gender || 
                    formErrors.dateFrom.day || formErrors.dateTo.day) && (
                    <div className="text-red-400 text-sm font-bold space-y-1">
                      {formErrors.height && <div>• Wzrost: {formErrors.height}</div>}
                      {formErrors.weight && <div>• Waga: {formErrors.weight}</div>}
                      {formErrors.level && <div>• Poziom: {formErrors.level}</div>}
                      {formErrors.gender && <div>• Płeć: {formErrors.gender}</div>}
                      {formErrors.dateFrom.day && <div>• Data od: {formErrors.dateFrom.day}</div>}
                      {formErrors.dateTo.day && <div>• Data do: {formErrors.dateTo.day}</div>}
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !error && !searchResults && (
                <div className="flex items-center justify-center h-full text-center">
                  <span className="text-white text-lg font-black font-['Inter'] italic">
                    👋 Witaj! Wypełnij formularz i kliknij "Wyszukaj" aby znaleźć idealne narty
                  </span>
                </div>
              )}

              {!isLoading && !error && searchResults && (
                <div className="space-y-4">
                  {searchResults.wszystkie.length === 0 && (
                    <div className="text-center">
                      <span className="text-white text-lg font-black font-['Inter'] italic">
                        😔 Nie znaleziono nart pasujących do Twoich kryteriów
                      </span>
                    </div>
                  )}

                  {searchResults.idealne.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        🏆 IDEALNE DOPASOWANIE ({searchResults.idealne.length})
                      </h3>
                      {searchResults.idealne.map((match, idx) => (
                        <div key={idx} className="bg-white/20 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/90 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM} | Płeć: {match.ski.PLEC}
                          </div>
                          <div className="text-green-300 text-sm font-bold">
                            ✅ Kompatybilność: {match.compatibility}%
                          </div>
                          <MatchIndicators dopasowanie={match.dopasowanie} />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.alternatywy.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        ⭐ ALTERNATYWY ({searchResults.alternatywy.length})
                      </h3>
                      {searchResults.alternatywy.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-white/15 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/80 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM}
                          </div>
                          <div className="text-yellow-300 text-sm font-bold">
                            ⭐ Kompatybilność: {match.compatibility}%
                          </div>
                          <MatchIndicators dopasowanie={match.dopasowanie} />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.poziom_za_nisko.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        📉 POZIOM ZA NISKO ({searchResults.poziom_za_nisko.length})
                      </h3>
                      {searchResults.poziom_za_nisko.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-orange-500/20 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/80 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM}
                          </div>
                          <div className="text-orange-300 text-sm font-bold">
                            📉 Kompatybilność: {match.compatibility}%
                          </div>
                          <MatchIndicators dopasowanie={match.dopasowanie} />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.inna_plec.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        👤 INNA PŁEĆ ({searchResults.inna_plec.length})
                      </h3>
                      {searchResults.inna_plec.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-blue-500/20 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/80 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM}
                          </div>
                          <div className="text-blue-300 text-sm font-bold">
                            👤 Kompatybilność: {match.compatibility}%
                          </div>
                          <MatchIndicators dopasowanie={match.dopasowanie} />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.na_sile.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        💪 NA SIŁĘ ({searchResults.na_sile.length})
                      </h3>
                      {searchResults.na_sile.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-red-500/20 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/80 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM}
                          </div>
                          <div className="text-red-300 text-sm font-bold">
                            💪 Kompatybilność: {match.compatibility}%
                          </div>
                          <MatchIndicators dopasowanie={match.dopasowanie} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default AnimaComponent;